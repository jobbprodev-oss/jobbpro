-- Migration 18: Garantir unicidade de e-mail na tabela users
-- =============================================

-- 1. Normalizar e-mails existentes (trim + lowercase)
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;

-- 2. Identificar e remover duplicatas (mantendo o registro mais recente)
--    Caso existam duplicatas, remove os mais antigos
DELETE FROM users
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(email))
             ORDER BY created_at DESC
           ) AS rn
    FROM users
    WHERE email IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 3. Adicionar constraint UNIQUE no campo email (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_unique'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    RAISE NOTICE 'Constraint UNIQUE adicionado em users.email';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE já existia em users.email';
  END IF;
END $$;
