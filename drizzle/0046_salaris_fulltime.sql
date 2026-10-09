-- Artikel salaris: bij deeltijd ook het salaris bij een volledige werkweek
-- en de deeltijdfactor. Alleen waar de standaardzin nog staat; een eigen
-- tekst blijft zoals hij is.
UPDATE "contract_template_articles"
SET "body" = REPLACE(
  "body",
  'zoals dat gold op {{salaris_peildatum}}.{{/als}}',
  'zoals dat gold op {{salaris_peildatum}}.{{/als}}{{#als deeltijd}} Bij een volledige werkweek van {{uren_fulltime}} uur is dat bruto {{salaris_fulltime}} per maand; de deeltijdfactor is {{deeltijdfactor}}.{{/als}}'
)
WHERE "body" LIKE '%zoals dat gold op {{salaris_peildatum}}.{{/als}}%'
  AND "body" NOT LIKE '%{{#als deeltijd}}%';
