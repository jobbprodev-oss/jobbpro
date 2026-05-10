-- =============================================
-- FIX: Corrigir recursão infinita na RLS da tabela users
-- =============================================
-- EXECUTE CADA BLOCO SEPARADAMENTE NO SUPABASE SQL EDITOR

-- ============ PASSO 1: Listar policies atuais ============
SELECT policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- ============ PASSO 2: Remover TODAS as policies SELECT ============
-- Execute cada linha separadamente:
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'users' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    RAISE NOTICE 'Dropped: %', pol.policyname;
  END LOOP;
END $$;

-- ============ PASSO 3: Recriar policy simples ============
CREATE POLICY "Perfis públicos" ON users FOR SELECT USING (true);

-- ============ PASSO 4: Verificar ============
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

-- ============ PASSO 5: Testar ============
SELECT id, email, tipo FROM users LIMIT 3;
