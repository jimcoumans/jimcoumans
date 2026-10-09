import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  users,
  candidates,
  candidateNotes,
  vacancies,
  generatedContracts,
  employmentContracts,
  salaryRecords,
  dossierEntries,
  personalRecords,
  personalDocuments,
  companyAssets,
} from '@/db/schema'
import { bewaarTot } from './werving'
import { volledigeNaam } from './namen'
import { formatDateLong } from './dates'

/* -------------------------------------------------------------------------
   Aannemen: van kandidaat naar collega, in één stap.

   Voorheen waren dit vijf losse handelingen op vier schermen: een collega
   aanmaken bij Team, het contract definitief maken en aan die collega
   koppelen, de kandidaat op "aangenomen" zetten, de vacature sluiten, en
   alle gegevens nog eens overtypen. Elke stap die je vergeet, laat iets
   half achter: een contract dat in geen dossier staat, of een paspoortkopie
   die met de bewaartermijn van de kandidaat wordt gewist.

   Daarom gebeurt het hier in één transactie. Lukt een deel niet, dan
   gebeurt er niets.
   ------------------------------------------------------------------------- */

export class AannameError extends Error {}

export type AannameInvoer = {
  kandidaatId: string
  /** Het definitieve, getekende contract waarop iemand in dienst komt. */
  contractId: string
  /** Het werkadres waarmee de nieuwe collega inlogt. */
  werkEmail: string
  rol?: 'staff' | 'admin'
  afdeling?: string | null
  doorUserId: string | null
  nu?: Date
}

/** Een voorstel voor het werkadres: roepnaam@jamesrobinson.nl, zonder accenten. */
export function werkadresVoorstel(roepnaam: string | null | undefined, domein = 'jamesrobinson.nl'): string {
  const schoon = (roepnaam ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return schoon ? `${schoon}@${domein}` : ''
}

/**
 * Neemt een kandidaat aan.
 *
 * Wat er gebeurt:
 * 1. Er komt een collega bij met het werkadres, of een bestaande collega met
 *    dat adres wordt bijgewerkt. Naam, functie, uren, startdatum, adres en
 *    verjaardag komen uit het contract en de persoonsgegevens.
 * 2. Het contract komt in zijn dossier: een regel in de contracthistorie en
 *    een in de salarishistorie, met de OP-toeslag erbij.
 * 3. De persoonsgegevens (IBAN, kopie ID, getekend contract) gaan van de
 *    kandidaat naar de collega. Anders worden ze gewist zodra de
 *    bewaartermijn van de kandidaat afloopt.
 * 4. De kandidaat staat op aangenomen, met de collega erbij.
 * 5. Is de vacature daarmee vol, dan gaat hij dicht.
 * 6. In het dossier komt een regel "In dienst".
 */
export async function neemAan(invoer: AannameInvoer): Promise<{ userId: string }> {
  const nu = invoer.nu ?? new Date()
  const email = invoer.werkEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    throw new AannameError('Vul een geldig werkadres in. Daarmee logt de nieuwe collega in.')
  }

  const [k] = await db.select().from(candidates).where(eq(candidates.id, invoer.kandidaatId)).limit(1)
  if (!k) throw new AannameError('Deze kandidaat bestaat niet meer.')
  if (k.status === 'aangenomen' && k.hiredUserId) throw new AannameError('Deze kandidaat is al aangenomen.')
  if (k.status === 'afgewezen' || k.status === 'afgehaakt') {
    throw new AannameError('Deze procedure is afgesloten. Zet de status eerst terug als hij toch doorgaat.')
  }

  const [c] = await db.select().from(generatedContracts).where(eq(generatedContracts.id, invoer.contractId)).limit(1)
  if (!c || c.candidateId !== k.id) throw new AannameError('Kies een contract van deze kandidaat.')
  if (c.soort !== 'definitief') {
    throw new AannameError('Dit is een pro forma. Stel eerst het definitieve contract op en laat dat tekenen.')
  }
  if (c.userId) throw new AannameError('Dit contract staat al in het dossier van een collega.')
  if (!c.signedOn) {
    throw new AannameError('Leg eerst vast dat het contract getekend is, met de datum van ondertekening.')
  }

  const [bestaand] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (bestaand && (bestaand.organizationId || bestaand.role === 'client')) {
    throw new AannameError('Dit adres hoort bij een klant. Gebruik het werkadres van de nieuwe collega.')
  }

  const [gegevens] = await db.select().from(personalRecords).where(eq(personalRecords.candidateId, k.id)).limit(1)
  if (gegevens && bestaand) {
    const [alEen] = await db.select({ id: personalRecords.id }).from(personalRecords).where(eq(personalRecords.userId, bestaand.id)).limit(1)
    if (alEen) {
      throw new AannameError(`${bestaand.name ?? email} heeft al een eigen dossier met persoonsgegevens. Kies een ander werkadres of neem contact op met de beheerder.`)
    }
  }

  const geboren = gegevens?.birthDate ?? c.employeeBirthDate ?? null
  const achternaam = gegevens?.lastName ?? k.lastName
  const tussenvoegsel = gegevens?.infix ?? k.infix
  const roepnaam = k.firstName
  const naam = volledigeNaam({ firstName: roepnaam, infix: tussenvoegsel, lastName: achternaam }) || k.name

  return db.transaction(async (tx) => {
    /* 1. De collega. */
    const profiel = {
      name: naam,
      firstName: roepnaam,
      infix: tussenvoegsel,
      lastName: achternaam,
      aanhef: c.employeeAanhef,
      jobTitle: c.jobTitle,
      department: invoer.afdeling ?? null,
      startedOn: c.startedOn,
      endedOn: null,
      contractHoursPerWeekQuarters: c.hoursWeekQuarters,
      mobile: k.phone,
      linkedinUrl: k.linkedinUrl,
      addressLine: gegevens?.addressLine ?? c.employeeAddress,
      postalCode: gegevens?.postalCode ?? c.employeePostalCode,
      city: gegevens?.city ?? c.employeeCity,
      birthDay: geboren ? geboren.getDate() : null,
      birthMonth: geboren ? geboren.getMonth() + 1 : null,
      birthYear: geboren ? geboren.getFullYear() : null,
      disabledAt: null,
    }
    let userId: string
    if (bestaand) {
      await tx
        .update(users)
        .set({ ...profiel, role: bestaand.role === 'admin' ? 'admin' : (invoer.rol ?? 'staff') })
        .where(eq(users.id, bestaand.id))
      userId = bestaand.id
    } else {
      const [nieuw] = await tx
        .insert(users)
        .values({ email, role: invoer.rol ?? 'staff', organizationId: null, ...profiel })
        .returning({ id: users.id })
      if (!nieuw) throw new AannameError('De collega kon niet worden aangemaakt.')
      userId = nieuw.id
    }

    /* 2. Het contract in het dossier. */
    await tx.update(generatedContracts).set({ userId }).where(eq(generatedContracts.id, c.id))
    await tx.insert(employmentContracts).values({
      userId,
      type: c.contractType,
      startedOn: c.startedOn,
      endsOn: c.endsOn,
      hoursPerWeekQuarters: c.hoursWeekQuarters,
      jobTitle: c.jobTitle,
      signedOn: c.signedOn,
      notes: `Via werving, contract getekend op ${formatDateLong(c.signedOn!)}.`,
      createdByUserId: invoer.doorUserId,
    })
    await tx.insert(salaryRecords).values({
      userId,
      grossMonthlyCents: c.grossMonthlyCents,
      opAllowanceCents: c.opAllowanceCents,
      basedOnHoursQuarters: c.hoursWeekQuarters,
      holidayAllowancePercent: Math.round(c.holidayAllowanceBp / 100),
      effectiveFrom: c.startedOn,
      reason: c.salaryScaleName && c.salaryStep ? `Indiensttreding, ${c.salaryScaleName} trede ${c.salaryStep}` : 'Indiensttreding',
      createdByUserId: invoer.doorUserId,
    })

    /* 3. De persoonsgegevens gaan mee, los van de kandidaat. De invullink
          blijft werken: wie nog iets moet aanleveren, kan dat gewoon doen. */
    if (gegevens) {
      await tx
        .update(personalRecords)
        .set({ userId, candidateId: null, updatedAt: nu })
        .where(eq(personalRecords.id, gegevens.id))
    }

    /* 4. De kandidaat. */
    await tx
      .update(candidates)
      .set({
        status: 'aangenomen',
        closedOn: nu,
        closedReason: null,
        retentionUntil: bewaarTot(nu, k.retentionConsentOn),
        respondedOn: k.respondedOn ?? nu,
        nextAction: null,
        nextActionOn: null,
        hiredUserId: userId,
        updatedAt: nu,
      })
      .where(eq(candidates.id, k.id))
    await tx.insert(candidateNotes).values({
      candidateId: k.id,
      kind: 'status',
      body: `Aangenomen als ${c.jobTitle}, in dienst per ${formatDateLong(c.startedOn)}. Contract, salaris en persoonsgegevens staan in het dossier.`,
      createdByUserId: invoer.doorUserId,
      createdAt: nu,
    })

    /* 5. De vacature dicht als hij vol is. */
    if (k.vacancyId) {
      const [v] = await tx.select().from(vacancies).where(eq(vacancies.id, k.vacancyId)).limit(1)
      const [aangenomen] = await tx
        .select({ n: count() })
        .from(candidates)
        .where(and(eq(candidates.vacancyId, k.vacancyId), eq(candidates.status, 'aangenomen')))
      if (v && v.status !== 'vervuld' && v.status !== 'ingetrokken' && Number(aangenomen?.n ?? 0) >= v.positions) {
        await tx.update(vacancies).set({ status: 'vervuld', closedOn: nu, updatedAt: nu }).where(eq(vacancies.id, v.id))
      }
    }

    /* 6. Een regel in het dossier. */
    await tx.insert(dossierEntries).values({
      userId,
      kind: 'mijlpaal',
      subject: `In dienst als ${c.jobTitle}`,
      body: `${c.contractType === 'bepaalde_tijd' && c.endsOn ? `Contract voor bepaalde tijd tot en met ${formatDateLong(c.endsOn)}` : 'Contract voor onbepaalde tijd'}, ${c.hoursWeekQuarters / 100} uur per week.`,
      happenedOn: c.startedOn,
      createdByUserId: invoer.doorUserId,
    })

    return { userId }
  })
}

/* --- Ondertekening -------------------------------------------------------- */

/** Vastleggen op welke dag het contract getekend is, of dat terugdraaien. */
export async function markeerGetekend(contractId: string, op: Date | null): Promise<void> {
  const [c] = await db.select().from(generatedContracts).where(eq(generatedContracts.id, contractId)).limit(1)
  if (!c) throw new AannameError('Dit contract bestaat niet meer.')
  if (c.soort !== 'definitief') throw new AannameError('Een pro forma wordt niet getekend. Stel het definitieve contract op.')
  if (op && op.getTime() > Date.now() + 36 * 60 * 60 * 1000) throw new AannameError('De datum van ondertekening ligt in de toekomst.')
  await db.update(generatedContracts).set({ signedOn: op }).where(eq(generatedContracts.id, contractId))
  if (c.userId) {
    await db
      .update(employmentContracts)
      .set({ signedOn: op })
      .where(and(eq(employmentContracts.userId, c.userId), eq(employmentContracts.startedOn, c.startedOn)))
  }
  if (c.candidateId) {
    await db.insert(candidateNotes).values({
      candidateId: c.candidateId,
      kind: 'status',
      body: op ? `Contract getekend op ${formatDateLong(op)}.` : 'Ondertekening teruggedraaid.',
    })
  }
}

/* --- Vervolgstappen ------------------------------------------------------- */

export type Stap = {
  sleutel: string
  titel: string
  klaar: boolean
  /** Uitleg of wat er nog moet gebeuren. */
  toelichting?: string
  /** Waar je het regelt. */
  href?: string
}

/**
 * Wat er rond een nieuwe collega moet gebeuren, en wat al klaar is.
 *
 * Uitgerekend uit wat er in het portaal staat, niet afgevinkt met de hand:
 * een vinkje dat iemand zet zegt dat het gedaan is, een getekend contract
 * in het dossier laat zien dát het gedaan is.
 */
export async function vervolgstappen(van: { kandidaatId?: string; userId?: string }): Promise<Stap[]> {
  let kandidaat: typeof candidates.$inferSelect | null = null
  let userId = van.userId ?? null
  if (van.kandidaatId) {
    const [k] = await db.select().from(candidates).where(eq(candidates.id, van.kandidaatId)).limit(1)
    kandidaat = k ?? null
    userId = userId ?? kandidaat?.hiredUserId ?? null
  } else if (userId) {
    const [k] = await db.select().from(candidates).where(eq(candidates.hiredUserId, userId)).limit(1)
    kandidaat = k ?? null
  }

  const contracten = await db
    .select()
    .from(generatedContracts)
    .where(
      userId && kandidaat
        ? and(eq(generatedContracts.soort, 'definitief'), eq(generatedContracts.candidateId, kandidaat.id))
        : userId
          ? and(eq(generatedContracts.soort, 'definitief'), eq(generatedContracts.userId, userId))
          : and(eq(generatedContracts.soort, 'definitief'), eq(generatedContracts.candidateId, van.kandidaatId ?? '')),
    )
  const contract = contracten.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null

  const [record] = await db
    .select()
    .from(personalRecords)
    .where(userId ? eq(personalRecords.userId, userId) : eq(personalRecords.candidateId, van.kandidaatId ?? ''))
    .limit(1)
  const docs = record ? await db.select({ kind: personalDocuments.kind }).from(personalDocuments).where(eq(personalDocuments.recordId, record.id)) : []
  const [gebruiker] = userId ? await db.select().from(users).where(eq(users.id, userId)).limit(1) : []
  const [middelen] = userId
    ? await db.select({ n: count() }).from(companyAssets).where(and(eq(companyAssets.userId, userId), isNull(companyAssets.returnedOn)))
    : [{ n: 0 }]

  const gegevensCompleet =
    !!record &&
    !!record.officialFirstNames?.trim() &&
    !!record.lastName?.trim() &&
    !!record.birthDate &&
    !!record.addressLine?.trim() &&
    !!record.ibanEnc &&
    docs.some((d) => d.kind === 'id_kopie') &&
    docs.some((d) => d.kind === 'loonheffing')

  const kandidaatPad = kandidaat ? `/beheer/werving/kandidaten/${kandidaat.id}` : undefined
  const collegaPad = userId ? `/beheer/medewerkers/${userId}` : undefined
  const startdag = contract ? formatDateLong(contract.startedOn) : null

  const stappen: Stap[] = [
    {
      sleutel: 'contract',
      titel: 'Definitief contract opgesteld',
      klaar: !!contract,
      toelichting: contract ? `${contract.jobTitle}, ingang ${startdag}.` : 'Stel het definitieve contract op bij de kandidaat.',
      href: contract ? `/beheer/contracten/${contract.id}` : kandidaatPad,
    },
    {
      sleutel: 'getekend',
      titel: 'Contract getekend',
      klaar: !!contract?.signedOn,
      toelichting: contract?.signedOn ? `Op ${formatDateLong(contract.signedOn)}.` : 'Leg de datum van ondertekening vast.',
      href: kandidaatPad ?? collegaPad,
    },
    {
      sleutel: 'exemplaar',
      titel: 'Getekend exemplaar in het dossier',
      klaar: docs.some((d) => d.kind === 'contract'),
      toelichting: 'Upload de scan of de pdf met beide handtekeningen. Wordt versleuteld bewaard.',
      href: kandidaatPad ?? collegaPad,
    },
    {
      sleutel: 'gegevens',
      titel: 'Persoonsgegevens compleet',
      klaar: gegevensCompleet,
      toelichting: gegevensCompleet ? undefined : 'Voornamen, geboortedatum, adres, IBAN, kopie ID en loonheffingsformulier. Stuur de kandidaat de invullink.',
      href: kandidaatPad ?? collegaPad,
    },
    {
      sleutel: 'salarisadministratie',
      titel: 'Doorgegeven aan de salarisadministratie',
      klaar: !!record?.doorgegevenOp,
      toelichting: record?.doorgegevenOp ? `Op ${formatDateLong(record.doorgegevenOp)}.` : 'Stuur de gegevens en het contract naar Euregio Habets Royen, en leg het hier vast.',
      href: kandidaatPad ?? collegaPad,
    },
    {
      sleutel: 'aangenomen',
      titel: 'In dienst gezet in het portaal',
      klaar: !!userId,
      toelichting: userId ? 'Account, dossier, contract en salaris staan bij de collega.' : 'Met de knop "In dienst nemen" bij de kandidaat. Kan als het contract getekend is.',
      href: collegaPad ?? kandidaatPad,
    },
    {
      sleutel: 'inloggen',
      titel: 'Eerste keer ingelogd',
      klaar: !!gebruiker?.lastLoginAt,
      toelichting: gebruiker ? `Inloggen gaat via de inlogpagina met ${gebruiker.email}.` : 'Kan zodra hij in dienst is gezet.',
      href: collegaPad,
    },
    {
      sleutel: 'middelen',
      titel: 'Laptop en andere middelen uitgegeven',
      klaar: Number(middelen?.n ?? 0) > 0,
      toelichting: 'Leg vast wat hij meekrijgt, zodat het bij vertrek terugkomt.',
      href: collegaPad,
    },
  ]

  if (contract?.aanzeggenVoor) {
    stappen.push({
      sleutel: 'aanzeggen',
      titel: `Aanzeggen voor ${formatDateLong(contract.aanzeggenVoor)}`,
      klaar: !!contract.aangezegdOp,
      toelichting: 'Staat in de aanzegbewaking op het dashboard. Vergeten kost een maandsalaris.',
      href: `/beheer/contracten/${contract.id}`,
    })
  }

  return stappen
}
