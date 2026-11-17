-- James & Co. V1 — kernschema.
--
-- Uitgangspunten (zie docs/ARCHITECTUUR.md):
-- * De app verbindt als rol jc_app (geen eigenaar, geen BYPASSRLS). Elke
--   transactie zet jc.user_id en, alleen voor een geverifieerde staffsessie,
--   jc.staff_session = 'on'. Row Level Security is de tweede verdedigingslaag
--   naast de controles in de servicelaag.
-- * Smalle systeemhandelingen (inloggen, aanmelden, uitnodiging claimen,
--   publieke instellingen) draaien als jc_system (BYPASSRLS), uitsluitend
--   vanuit server-code met expliciete controles.
-- * Geld in gehele minor units (centen) plus ISO-valuta. Tijden in UTC
--   (timestamptz), met een IANA-tijdzone bij afspraken.
-- * Toestanden die nooit mogen voorkomen (bevestiging zonder bewijs, dubbele
--   claim, overboekte Society-plek, gewijzigde uitgegeven offerte) worden door
--   de database geweigerd, niet alleen door de UI.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- context
create or replace function jc_uid() returns uuid
language sql stable as $$
  select nullif(current_setting('jc.user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------- profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and position('@' in email) > 1),
  full_name text,
  display_name text,
  language text not null default 'nl' check (language in ('nl', 'en')),
  phone text,
  preferred_contact text check (preferred_contact in ('email', 'phone', 'whatsapp', 'portal')),
  region text,
  email_verified_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table staff_roles (
  user_id uuid primary key references profiles(id),
  role text not null check (role in ('admin', 'concierge')),
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function jc_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_setting('jc.staff_session', true), '') = 'on'
     and exists (select 1 from staff_roles where user_id = jc_uid() and active)
$$;

create or replace function jc_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_setting('jc.staff_session', true), '') = 'on'
     and exists (select 1 from staff_roles where user_id = jc_uid() and active and role = 'admin')
$$;

create table staff_mfa (
  user_id uuid primary key references profiles(id),
  secret_base32 text not null,
  enabled_at timestamptz,
  last_used_step bigint,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references profiles(id),
  mfa_verified_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table login_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  purpose text not null check (purpose in ('login', 'verify_application')),
  application_id uuid,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

-- ---------------------------------------------------------------- invitations
create table invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  inviter_id uuid references profiles(id),           -- null = uitnodiging namens het team
  created_by uuid not null references profiles(id),
  inviter_display_name text,
  reveal_consent boolean not null default false,
  reveal_consent_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  claimed_at timestamptz,
  claimed_application_id uuid unique,
  created_at timestamptz not null default now(),
  check (inviter_id is not null or reveal_consent = false),
  check (reveal_consent = false or (inviter_display_name is not null and reveal_consent_at is not null)),
  check ((claimed_at is null) = (claimed_application_id is null))
);

-- ---------------------------------------------------------------- applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  full_name text not null,
  region text,
  preferred_contact text check (preferred_contact in ('email', 'phone', 'whatsapp', 'portal')),
  phone text,
  help_request text not null,
  source text,
  segment text not null default 'nl_member' check (segment in ('nl_member', 'international_visitor')),
  language text not null default 'nl' check (language in ('nl', 'en')),
  visit_start date,
  visit_end date,
  party_size integer check (party_size is null or party_size > 0),
  invitation_id uuid references invitations(id),
  status text not null default 'unverified' check (status in (
    'unverified', 'submitted', 'in_review', 'intro_scheduled', 'offered', 'accepted', 'declined', 'rejected', 'withdrawn')),
  user_id uuid references profiles(id),
  privacy_ack_at timestamptz not null,
  verified_at timestamptz,
  reviewed_by uuid references profiles(id),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visit_end is null or visit_start is null or visit_end >= visit_start)
);
alter table invitations add constraint invitations_claimed_application_fk
  foreign key (claimed_application_id) references applications(id);

-- ---------------------------------------------------------------- memberships
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  application_id uuid references applications(id),
  status text not null default 'pending' check (status in (
    'pending', 'offered', 'accepted_pending_payment', 'active', 'ending', 'ended', 'declined', 'suspended')),
  plan_snapshot jsonb,
  accepted_offer_id uuid,
  accepted_terms_version text,
  accepted_at timestamptz,
  is_complimentary boolean not null default false,
  starts_on date,
  ends_on date,
  activated_at timestamptz,
  activated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
-- Eén lopend lidmaatschap per persoon in V1.
create unique index memberships_one_open_per_user on memberships(user_id)
  where status not in ('ended', 'declined');

create table membership_offers (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id),
  version integer not null check (version > 0),
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  tax_rate_bp integer not null check (tax_rate_bp between 0 and 10000),
  price_includes_tax boolean not null,
  billing_period text not null default 'month' check (billing_period in ('month', 'quarter', 'year', 'once')),
  scope_text text not null,
  terms_version text not null,
  terms_text text not null,
  status text not null default 'issued' check (status in ('issued', 'accepted', 'superseded', 'withdrawn')),
  issued_by uuid not null references profiles(id),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references profiles(id),
  snapshot_hash text not null,
  unique (membership_id, version)
);
alter table memberships add constraint memberships_offer_fk
  foreign key (accepted_offer_id) references membership_offers(id);

-- ---------------------------------------------------------------- preferences & consent
create table member_preferences (
  member_id uuid primary key references profiles(id),
  language text check (language in ('nl', 'en')),
  home_region text,
  travel_radius_km integer check (travel_radius_km is null or travel_radius_km between 0 and 2000),
  budget_band text check (budget_band in ('tot_150', '150_300', '300_600', 'boven_600')),
  preferred_times text,
  favorite_categories text[] not null default '{}',
  communication_preference text check (communication_preference in ('email', 'phone', 'whatsapp', 'portal')),
  notes text,
  updated_at timestamptz not null default now()
);

-- Gevoelige voorkeuren (dieet/allergie): apart, alleen met expliciete toestemming.
create table member_sensitive_preferences (
  member_id uuid primary key references profiles(id),
  dietary text,
  allergies text,
  updated_at timestamptz not null default now()
);

-- Append-only: de actuele stand per doel is het laatste record.
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  purpose text not null check (purpose in (
    'service_whatsapp', 'marketing_email', 'marketing_whatsapp', 'sensitive_preferences', 'referrer_reveal')),
  channel text,
  granted boolean not null,
  version text not null,
  source text not null,
  recorded_at timestamptz not null default now()
);
create index consent_records_lookup on consent_records(user_id, purpose, recorded_at desc);

-- ---------------------------------------------------------------- suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in (
    'dining', 'stays', 'travel', 'transport', 'experiences', 'gifts', 'occasions', 'other')),
  region text,
  contact_name text,
  email text,
  phone text,
  website text,
  reachability text,
  service_level text,
  booking_method text,
  emergency_contact text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'inactive')),
  last_verified_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_status <> 'verified' or last_verified_at is not null)
);

create table supplier_terms (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  valid_from date not null,
  valid_until date,
  agreement text not null,
  commission_basis text,
  commission_bp integer check (commission_bp is null or commission_bp between 0 and 10000),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

-- ---------------------------------------------------------------- requests
create table requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles(id),
  owner_id uuid references profiles(id),
  category text check (category in (
    'dining', 'stays', 'travel', 'transport', 'experiences', 'gifts', 'occasions', 'other')),
  segment text not null default 'nl_member' check (segment in ('nl_member', 'international_visitor')),
  brief text not null check (length(brief) between 1 and 5000),
  title text,
  desired_date date,
  desired_time text,
  timezone text not null default 'Europe/Amsterdam',
  location text,
  party_size integer check (party_size is null or party_size > 0),
  budget_minor integer check (budget_minor is null or budget_minor >= 0),
  budget_currency text not null default 'EUR' check (budget_currency ~ '^[A-Z]{3}$'),
  budget_basis text check (budget_basis in ('per_person', 'total')),
  flexibility text,
  status text not null default 'new' check (status in (
    'new', 'needs_info', 'researching', 'awaiting_approval', 'arranging', 'confirmed', 'completed', 'closed', 'rejected', 'cancelled')),
  waiting_on text check (waiting_on in ('member', 'supplier')),
  status_note text,
  has_issue boolean not null default false,
  issue_note text,
  urgency text not null default 'normal' check (urgency in ('normal', 'high')),
  next_action text,
  next_action_due_at timestamptz,
  cancellation_requested_at timestamptz,
  feedback_rating integer check (feedback_rating between 1 and 5),
  feedback_text text,
  idempotency_key text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, idempotency_key),
  check ((budget_minor is null) = (budget_basis is null))
);
create index requests_member on requests(member_id, created_at desc);
create index requests_status on requests(status, next_action_due_at);

-- Toegestane statusovergangen. Afwijzen en annuleren zijn aparte afsluitroutes.
create or replace function jc_request_transition_ok(old_s text, new_s text) returns boolean
language sql immutable as $$
  select old_s = new_s or (old_s, new_s) in (
    ('new', 'needs_info'), ('new', 'researching'),
    ('needs_info', 'researching'), ('researching', 'needs_info'),
    ('researching', 'awaiting_approval'), ('awaiting_approval', 'researching'),
    ('awaiting_approval', 'arranging'), ('arranging', 'researching'),
    ('arranging', 'confirmed'), ('confirmed', 'arranging'),
    ('confirmed', 'completed'), ('completed', 'closed')
  ) or (new_s in ('rejected', 'cancelled') and old_s not in ('completed', 'closed', 'rejected', 'cancelled'))
$$;

create or replace function jc_requests_guard() returns trigger language plpgsql as $$
begin
  if not jc_request_transition_ok(old.status, new.status) then
    raise exception 'invalid_request_transition: % -> %', old.status, new.status using errcode = 'P0001';
  end if;
  if new.member_id <> old.member_id or new.idempotency_key <> old.idempotency_key or new.created_by <> old.created_by then
    raise exception 'immutable_request_fields' using errcode = 'P0001';
  end if;
  -- Een actief verzoek heeft altijd een eigenaar zodra het in behandeling is.
  if new.status not in ('new', 'completed', 'closed', 'rejected', 'cancelled') and new.owner_id is null then
    raise exception 'request_requires_owner' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger requests_guard before update on requests for each row execute function jc_requests_guard();

create table request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id),
  author_id uuid references profiles(id),
  sender_type text not null check (sender_type in ('member', 'staff', 'system')),
  body text not null check (length(body) between 1 and 10000),
  channel text not null default 'portal' check (channel in ('portal', 'whatsapp_manual', 'whatsapp_api', 'email', 'phone_note')),
  provider_message_id text unique,
  delivery_status text not null default 'stored' check (delivery_status in ('stored', 'queued', 'sent', 'delivered', 'failed', 'not_sent')),
  delivery_error text,
  client_key text not null,
  created_at timestamptz not null default now(),
  unique (request_id, client_key)
);
create index request_messages_request on request_messages(request_id, created_at);

create table internal_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id),
  member_id uuid references profiles(id),
  application_id uuid references applications(id),
  supplier_id uuid references suppliers(id),
  author_id uuid not null references profiles(id),
  body text not null check (length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  check (num_nonnulls(request_id, member_id, application_id, supplier_id) >= 1)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id),
  member_id uuid references profiles(id),
  application_id uuid references applications(id),
  assigned_to uuid references profiles(id),
  title text not null,
  type text not null default 'other' check (type in (
    'follow_up', 'info_needed', 'supplier_contact', 'cancellation', 'refund', 'handover', 'review_application', 'other')),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index tasks_open on tasks(status, due_at);

create table supplier_contact_log (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  request_id uuid references requests(id),
  staff_id uuid not null references profiles(id),
  channel text not null check (channel in ('phone', 'email', 'whatsapp', 'in_person', 'website', 'other')),
  summary text not null,
  created_at timestamptz not null default now()
);

create table availability_checks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id),
  supplier_id uuid not null references suppliers(id),
  source text not null check (source in ('phone', 'email', 'website', 'supplier_system', 'in_person')),
  checked_at timestamptz not null,
  valid_until timestamptz,
  result text not null check (result in ('available', 'unavailable', 'tentative', 'unknown')),
  details text,
  checked_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= checked_at)
);

-- ---------------------------------------------------------------- proposals
create table proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id),
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'issued', 'accepted', 'superseded', 'expired', 'withdrawn')),
  intro text,
  issued_at timestamptz,
  expires_at timestamptz,
  issued_by uuid references profiles(id),
  snapshot jsonb,
  snapshot_hash text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (request_id, version),
  check (status = 'draft' or (issued_at is not null and expires_at is not null and snapshot is not null and snapshot_hash is not null)),
  check (expires_at is null or issued_at is null or expires_at > issued_at)
);
-- Hooguit één uitgegeven (nog openstaand) voorstel per verzoek.
create unique index proposals_one_issued on proposals(request_id) where status = 'issued';

create table proposal_options (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id),
  position integer not null check (position between 1 and 3),
  label text not null,
  description text,
  supplier_id uuid references suppliers(id),
  supplier_name text,
  included text,
  excluded text,
  price_kind text not null check (price_kind in ('fixed', 'estimate')),
  total_minor integer not null check (total_minor >= 0),
  max_minor integer check (max_minor is null or max_minor >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  tax_note text,
  payment_route text not null check (payment_route in ('pay_supplier_directly', 'invoice_via_james', 'prepaid_by_member')),
  cancellation_terms text not null,
  availability_status text not null check (availability_status in ('checked_available', 'tentative', 'to_be_checked')),
  availability_check_id uuid references availability_checks(id),
  unique (proposal_id, position),
  check (price_kind = 'fixed' or (max_minor is not null and max_minor >= total_minor)),
  check (availability_status <> 'checked_available' or availability_check_id is not null)
);

-- Uitgegeven versies zijn onveranderlijk. Alleen de status mag nog verder:
-- issued -> accepted/superseded/expired/withdrawn.
create or replace function jc_proposals_guard() returns trigger language plpgsql as $$
begin
  if old.status <> 'draft' then
    if new.request_id <> old.request_id or new.version <> old.version
       or new.intro is distinct from old.intro or new.issued_at is distinct from old.issued_at
       or new.expires_at is distinct from old.expires_at or new.snapshot is distinct from old.snapshot
       or new.snapshot_hash is distinct from old.snapshot_hash then
      raise exception 'proposal_immutable' using errcode = 'P0001';
    end if;
    if old.status <> new.status and not (old.status = 'issued' and new.status in ('accepted', 'superseded', 'expired', 'withdrawn')) then
      raise exception 'invalid_proposal_transition: % -> %', old.status, new.status using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger proposals_guard before update on proposals for each row execute function jc_proposals_guard();

create or replace function jc_proposal_options_guard() returns trigger language plpgsql as $$
declare s text;
begin
  select status into s from proposals where id = coalesce(new.proposal_id, old.proposal_id);
  if s is distinct from 'draft' then
    raise exception 'proposal_immutable' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger proposal_options_guard before insert or update or delete on proposal_options
  for each row execute function jc_proposal_options_guard();

create table approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references proposals(id),
  option_id uuid not null references proposal_options(id),
  member_id uuid not null references profiles(id),
  accepted_snapshot jsonb not null,
  snapshot_hash text not null,
  accepted_total_minor integer not null check (accepted_total_minor >= 0),
  accepted_max_minor integer check (accepted_max_minor is null or accepted_max_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  terms_accepted boolean not null check (terms_accepted),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id),
  approval_id uuid not null references approvals(id),
  supplier_id uuid references suppliers(id),
  supplier_name text not null,
  title text not null,
  required boolean not null default true,
  status text not null default 'pending' check (status in (
    'pending', 'requested', 'confirmed', 'failed', 'cancellation_requested', 'cancelled')),
  supplier_reference text,
  confirmation_note text,
  confirmation_source text check (confirmation_source in ('email', 'phone', 'supplier_system', 'in_person')),
  checked_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id),
  starts_at timestamptz,
  timezone text not null default 'Europe/Amsterdam',
  price_minor integer check (price_minor is null or price_minor >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  terms text,
  member_details text,
  emergency_contact text,
  cancellation_requested_at timestamptz,
  cancellation_confirmed_at timestamptz,
  cancellation_evidence text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Geen bevestiging zonder leveranciersbewijs met bron en controletijd.
  check (status not in ('confirmed', 'cancellation_requested') or confirmed_at is not null),
  check (confirmed_at is null or (
    supplier_name <> '' and confirmation_source is not null and checked_at is not null
    and (nullif(trim(supplier_reference), '') is not null or nullif(trim(confirmation_note), '') is not null))),
  check (status <> 'cancelled' or (cancellation_confirmed_at is not null and nullif(trim(cancellation_evidence), '') is not null))
);
create index bookings_request on bookings(request_id);

-- ---------------------------------------------------------------- billing
create table billing_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles(id),
  kind text not null check (kind in ('membership', 'project', 'society', 'visitor')),
  membership_id uuid references memberships(id),
  request_id uuid references requests(id),
  society_event_id uuid,
  invoice_number text not null unique,
  description text not null,
  period_start date,
  period_end date,
  net_minor integer not null check (net_minor >= 0),
  tax_minor integer not null check (tax_minor >= 0),
  gross_minor integer not null check (gross_minor >= 0),
  tax_rate_bp integer not null check (tax_rate_bp between 0 and 10000),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'issued' check (status in ('issued', 'void')),
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  check (net_minor + tax_minor = gross_minor),
  check (kind <> 'membership' or membership_id is not null)
);

-- Append-only. Corrigeren = een correctie- of restitutieregel toevoegen.
create table payment_records (
  id uuid primary key default gen_random_uuid(),
  billing_id uuid not null references billing_records(id),
  kind text not null check (kind in ('payment', 'refund', 'correction')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  method text not null check (method in ('bank_transfer', 'cash', 'card_terminal', 'payment_provider', 'other')),
  reference text not null check (length(trim(reference)) > 0),
  provider_reference text unique,
  is_manual boolean not null default true,
  evidence_ref text,
  corrects_payment_id uuid references payment_records(id),
  note text,
  occurred_at timestamptz not null,
  recorded_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  check (kind <> 'correction' or corrects_payment_id is not null)
);

-- ---------------------------------------------------------------- time
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id),
  member_id uuid references profiles(id),
  staff_id uuid not null references profiles(id),
  minutes integer check (minutes is null or minutes between 1 and 1440),
  activity text not null check (activity in ('intake', 'research', 'supplier_contact', 'proposal', 'booking', 'aftercare', 'account_care', 'other')),
  started_at timestamptz,
  ended_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  check (minutes is not null or (started_at is not null and ended_at is null)),
  check (num_nonnulls(request_id, member_id) >= 1)
);
create unique index time_entries_one_running on time_entries(staff_id) where minutes is null;

-- ---------------------------------------------------------------- society
create table society_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/Amsterdam',
  capacity integer check (capacity is null or capacity > 0),
  price_minor integer check (price_minor is null or price_minor >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  price_note text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'cancelled', 'completed')),
  public_teaser boolean not null default false,
  is_demo boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
alter table billing_records add constraint billing_society_fk foreign key (society_event_id) references society_events(id);

create table society_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references society_events(id),
  member_id uuid not null references profiles(id),
  invited_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create table society_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references society_events(id),
  member_id uuid not null references profiles(id),
  party_size integer not null default 1 check (party_size > 0),
  status text not null default 'interested' check (status in (
    'interested', 'waitlisted', 'offered', 'confirmed', 'declined', 'cancelled')),
  offer_text text,
  offer_price_minor integer check (offer_price_minor is null or offer_price_minor >= 0),
  payment_required boolean not null default false,
  offered_at timestamptz,
  accepted_at timestamptz,
  billing_id uuid references billing_records(id),
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id),
  member_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id),
  check (status <> 'confirmed' or (confirmed_at is not null and accepted_at is not null))
);

-- Capaciteit: de eventrij wordt gelockt, dus twee gelijktijdige bevestigingen
-- worden achter elkaar gezet en de tweede ziet de eerste.
create or replace function jc_society_capacity_guard() returns trigger language plpgsql as $$
declare cap integer; used integer;
begin
  if new.status = 'confirmed' then
    select capacity into cap from society_events where id = new.event_id for update;
    if cap is not null then
      select coalesce(sum(party_size), 0) into used from society_participations
        where event_id = new.event_id and status = 'confirmed' and id <> new.id;
      if used + new.party_size > cap then
        raise exception 'society_capacity_exceeded' using errcode = 'P0001';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger society_capacity_guard before insert or update on society_participations
  for each row execute function jc_society_capacity_guard();

create or replace function jc_society_event_capacity_guard() returns trigger language plpgsql as $$
declare used integer;
begin
  if new.capacity is not null and new.capacity is distinct from old.capacity then
    select coalesce(sum(party_size), 0) into used from society_participations
      where event_id = new.id and status = 'confirmed';
    if new.capacity < used then
      raise exception 'society_capacity_below_confirmed' using errcode = 'P0001';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger society_event_capacity_guard before update on society_events
  for each row execute function jc_society_event_capacity_guard();

-- ---------------------------------------------------------------- audit, integrations, outbox, settings
create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_type text not null check (actor_type in ('member', 'staff', 'system', 'anonymous')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_entity on audit_events(entity_type, entity_id, created_at);

create or replace function jc_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'append_only_table: %', tg_table_name using errcode = 'P0001';
end $$;
create trigger audit_append_only before update or delete on audit_events
  for each row execute function jc_append_only();
create trigger payments_append_only before update or delete on payment_records
  for each row execute function jc_append_only();
create trigger consent_append_only before update or delete on consent_records
  for each row execute function jc_append_only();
create trigger approvals_append_only before update or delete on approvals
  for each row execute function jc_append_only();

create table integration_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  payload_redacted jsonb,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed', 'ignored')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_id)
);

create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  recipient_user_id uuid references profiles(id),
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'not_configured')),
  attempts integer not null default 0,
  last_error text,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create sequence invoice_number_seq start 1;

-- ---------------------------------------------------------------- roles & grants
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'jc_app') then
    create role jc_app nologin nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'jc_system') then
    create role jc_system nologin bypassrls;
  end if;
end $$;
-- INHERIT FALSE: jc_app erft GEEN tabelrechten van jc_system (anders zouden
-- kolomgrants en ontbrekende DELETE-rechten omzeild worden); alleen expliciet
-- SET LOCAL ROLE jc_system geeft systeemrechten.
grant jc_system to jc_app with inherit false, set true;
grant usage on schema public to jc_app, jc_system;
grant select, insert, update on all tables in schema public to jc_app;
grant delete on society_invitations, member_sensitive_preferences, rate_limits to jc_app;
grant select, insert, update, delete on all tables in schema public to jc_system;
grant usage on all sequences in schema public to jc_app, jc_system;
grant execute on all functions in schema public to jc_app, jc_system;

-- Profielvelden die een lid zelf mag aanpassen. E-mail, verificatie en
-- blokkering lopen via de systeemroute.
revoke update on profiles from jc_app;
grant update (full_name, display_name, language, phone, preferred_contact, region, updated_at) on profiles to jc_app;
-- Systeemtabellen: alleen via jc_system.
revoke all on sessions, login_tokens, staff_mfa, rate_limits, notification_outbox, integration_events from jc_app;
grant select on integration_events, notification_outbox to jc_app;
revoke update on audit_events, payment_records, consent_records, approvals from jc_app;

-- ---------------------------------------------------------------- row level security
-- Niet FORCE: de eigenaar (migraties en SECURITY DEFINER-hulpfuncties) gaat
-- langs RLS. De app verbindt nooit als eigenaar en zet per transactie
-- SET LOCAL ROLE jc_app of jc_system.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Staff: werkdoeleinden. (Admin-only tabellen hebben strengere schrijfregels.)
create policy staff_all on profiles for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on profiles for select to jc_app using (id = jc_uid());
create policy own_update on profiles for update to jc_app using (id = jc_uid()) with check (id = jc_uid());

create policy staff_select on staff_roles for select to jc_app using (jc_is_staff());
create policy own_select on staff_roles for select to jc_app using (user_id = jc_uid());
create policy admin_write on staff_roles for insert to jc_app with check (jc_is_admin() and user_id <> jc_uid());
create policy admin_update on staff_roles for update to jc_app using (jc_is_admin() and user_id <> jc_uid()) with check (jc_is_admin() and user_id <> jc_uid());

create policy staff_all on applications for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on applications for select to jc_app using (user_id = jc_uid());

create policy staff_all on invitations for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy inviter_select on invitations for select to jc_app using (inviter_id = jc_uid());

create policy staff_all on memberships for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on memberships for select to jc_app using (user_id = jc_uid());

create policy staff_all on membership_offers for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on membership_offers for select to jc_app
  using (exists (select 1 from memberships m where m.id = membership_id and m.user_id = jc_uid()));

create policy staff_all on member_preferences for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_all on member_preferences for all to jc_app using (member_id = jc_uid()) with check (member_id = jc_uid());

create policy staff_all on member_sensitive_preferences for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_all on member_sensitive_preferences for all to jc_app using (member_id = jc_uid()) with check (member_id = jc_uid());

create policy staff_select on consent_records for select to jc_app using (jc_is_staff());
create policy own_select on consent_records for select to jc_app using (user_id = jc_uid());
create policy own_insert on consent_records for insert to jc_app with check (user_id = jc_uid());

create policy staff_all on suppliers for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on supplier_terms for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on supplier_contact_log for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on availability_checks for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on internal_notes for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on tasks for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy staff_all on time_entries for all to jc_app using (jc_is_staff()) with check (jc_is_staff() and staff_id = jc_uid());

create or replace function jc_member_can_request() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = jc_uid() and status = 'active')
$$;

create policy staff_all on requests for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on requests for select to jc_app using (member_id = jc_uid());
create policy own_insert on requests for insert to jc_app
  with check (member_id = jc_uid() and created_by = jc_uid() and status = 'new' and owner_id is null and jc_member_can_request());

create or replace function jc_owns_request(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from requests where id = rid and member_id = jc_uid())
$$;

create policy staff_all on request_messages for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on request_messages for select to jc_app using (jc_owns_request(request_id));
create policy own_insert on request_messages for insert to jc_app
  with check (jc_owns_request(request_id) and sender_type = 'member' and author_id = jc_uid()
              and channel = 'portal' and provider_message_id is null and delivery_status = 'stored');

create policy staff_all on proposals for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on proposals for select to jc_app using (status <> 'draft' and jc_owns_request(request_id));

create policy staff_all on proposal_options for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on proposal_options for select to jc_app
  using (exists (select 1 from proposals p where p.id = proposal_id and p.status <> 'draft' and jc_owns_request(p.request_id)));

create policy staff_select on approvals for select to jc_app using (jc_is_staff());
create policy own_select on approvals for select to jc_app using (member_id = jc_uid());

create policy staff_all on bookings for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on bookings for select to jc_app using (jc_owns_request(request_id));

-- Financieel: staff mag lezen, alleen admin registreert.
create policy staff_select on billing_records for select to jc_app using (jc_is_staff());
create policy admin_insert on billing_records for insert to jc_app with check (jc_is_admin());
create policy admin_update on billing_records for update to jc_app using (jc_is_admin()) with check (jc_is_admin());
create policy own_select on billing_records for select to jc_app using (member_id = jc_uid());
create policy staff_select on payment_records for select to jc_app using (jc_is_staff());
create policy admin_insert on payment_records for insert to jc_app with check (jc_is_admin() and recorded_by = jc_uid());
create policy own_select on payment_records for select to jc_app
  using (exists (select 1 from billing_records b where b.id = billing_id and b.member_id = jc_uid()));

create policy staff_all on society_events for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create or replace function jc_invited_to(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from society_invitations where event_id = eid and member_id = jc_uid())
$$;
create policy invited_select on society_events for select to jc_app
  using (status in ('open', 'closed', 'completed', 'cancelled') and jc_invited_to(id));

create policy staff_all on society_invitations for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on society_invitations for select to jc_app using (member_id = jc_uid());

create policy staff_all on society_participations for all to jc_app using (jc_is_staff()) with check (jc_is_staff());
create policy own_select on society_participations for select to jc_app using (member_id = jc_uid());

create policy staff_select on audit_events for select to jc_app using (jc_is_staff());
create policy any_insert on audit_events for insert to jc_app with check (actor_id is not distinct from jc_uid());

create policy staff_select on integration_events for select to jc_app using (jc_is_staff());
create policy staff_select on notification_outbox for select to jc_app using (jc_is_staff());

create policy staff_select on app_settings for select to jc_app using (jc_is_staff());
create policy admin_write on app_settings for insert to jc_app with check (jc_is_admin());
create policy admin_update on app_settings for update to jc_app using (jc_is_admin()) with check (jc_is_admin());
