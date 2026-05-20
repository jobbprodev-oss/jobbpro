-- Migration 19: Alterar unicidade de celular — de global para por tipo de usuário
-- Regra: celular pode se repetir entre contratante e prestador,
--        mas não pode repetir dentro do mesmo tipo de conta.
-- =============================================

-- 1. Remover constraint global users_celular_key (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_celular_key'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_celular_key;
    RAISE NOTICE 'Constraint global users_celular_key removida';
  ELSE
    RAISE NOTICE 'Constraint users_celular_key não encontrada, ignorando';
  END IF;
END $$;

-- 2. Remover index global users_celular_unique (se existir com outro nome)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users' AND indexname = 'users_celular_unique'
  ) THEN
    DROP INDEX users_celular_unique;
    RAISE NOTICE 'Index users_celular_unique removido';
  END IF;
END $$;

-- 3. Criar novo index único composto: celular + tipo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'users' AND indexname = 'users_celular_tipo_unique'
  ) THEN
    CREATE UNIQUE INDEX users_celular_tipo_unique ON users (celular, tipo);
    RAISE NOTICE 'Index UNIQUE (celular, tipo) criado';
  ELSE
    RAISE NOTICE 'Index users_celular_tipo_unique já existia';
  END IF;
END $$;
