-- E-24: onboarding progress saved per tenant (step -> done|skipped, chosen specialty).
ALTER TABLE "tenants" ADD COLUMN "onboarding_progress" JSONB NOT NULL DEFAULT '{}';

-- E-24: conservative starting policies per specialty (hypothesis H-20: council rules not yet reviewed).
-- Prices are forbidden everywhere except chiropractic, where no federal regulation applies.
INSERT INTO "specialty_policies" ("specialty", "rules") VALUES
  ('quiropraxia', '{"pricesForbidden": false, "urgencyTerms": ["dor irradiada", "formigamento", "perda de força", "dormência"], "forbiddenTerms": ["cura", "garantia de resultado", "sem dor"]}'),
  ('fisioterapia', '{"pricesForbidden": true, "urgencyTerms": ["dor forte", "formigamento", "perda de força"], "forbiddenTerms": ["cura", "garantia de resultado"]}'),
  ('psicologia', '{"pricesForbidden": true, "urgencyTerms": ["me machucar", "não aguento mais", "pensando em morrer"], "forbiddenTerms": ["cura", "garantia de resultado", "diagnóstico"]}'),
  ('nutricao', '{"pricesForbidden": true, "urgencyTerms": ["desmaio", "tontura forte", "vômitos"], "forbiddenTerms": ["cura", "garantia de resultado", "emagreça rápido"]}')
ON CONFLICT ("specialty") DO NOTHING;
