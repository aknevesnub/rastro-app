-- Migration: profile_mode (commodity vs produto final)
-- Aplicar via: npx prisma db push  OU  psql + npx prisma generate
-- Idempotente: pode rodar várias vezes sem quebrar.
--
-- Contexto: fazendas têm dois modos de apresentação no perfil público.
--   "commodity" — produtor de soja/milho/café verde/gado etc. para traders e
--                exportadores. Hierarquia: prova (EUDR, área, certs) sobre narrativa.
--   "produto"   — vinícola, azeitaria, café torrado, queijo, etc. para mercado
--                premium. Hierarquia: narrativa (história, produtos, terroir) sobre prova.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profile_mode" TEXT NOT NULL DEFAULT 'commodity';

CREATE INDEX IF NOT EXISTS "users_profile_mode_idx" ON "users" ("profile_mode");
