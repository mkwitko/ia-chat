-- E-17: the four tone-of-voice answers (spec 04, "Tom de voz"), kept to refill the form.
ALTER TABLE "professionals" ADD COLUMN "tone_answers" jsonb NOT NULL DEFAULT '{}';
