-- Restaurar bergnoco@gmail.com como administrador

-- 1. Ver status atual
SELECT id, email, nome, tipo, ativo FROM users WHERE email = 'bergnoco@gmail.com';

-- 2. Apenas atualizar o tipo para admin (o usuário já existe com ID correto)
UPDATE users 
SET tipo = 'admin', ativo = true
WHERE email = 'bergnoco@gmail.com';

-- 3. Verificar
SELECT id, email, nome, tipo, ativo FROM users WHERE email = 'bergnoco@gmail.com';
