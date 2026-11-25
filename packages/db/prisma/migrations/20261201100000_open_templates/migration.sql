-- M-02: the segment is an open template key (spec 11). specialty_policies stays the global
-- catalog (no tenant data, no RLS); `specialty` now holds any template key.
-- Existing rows keep today's behavior: health sensitivity and the "paciente" vocabulary.
UPDATE "specialty_policies"
SET "rules" = "rules" || '{"sensitivity": "health", "vocabulary": "paciente", "followUps": [], "funnelStages": {}}'::jsonb;

-- First non-health template: nothing clinical, so the clinical rules stay off.
INSERT INTO "specialty_policies" ("specialty", "rules") VALUES
  ('salao-de-beleza', '{"pricesForbidden": false, "urgencyTerms": [], "forbiddenTerms": ["garantido", "100%"], "sensitivity": "none", "vocabulary": "cliente", "followUps": [], "funnelStages": {}}')
ON CONFLICT ("specialty") DO NOTHING;
