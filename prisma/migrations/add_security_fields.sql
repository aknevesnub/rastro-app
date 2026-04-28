-- Migration: campos de segurança e trial
-- Aplicar via: npx prisma db push  OU  psql + npx prisma generate
-- Idempotente: pode rodar várias vezes sem quebrar.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "email_verify_token" TEXT,
  ADD COLUMN IF NOT EXISTS "email_verify_expires" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT,
  ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "token_invalid_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "users_password_reset_token_idx"
  ON "users" ("password_reset_token");

CREATE INDEX IF NOT EXISTS "users_email_verify_token_idx"
  ON "users" ("email_verify_token");
