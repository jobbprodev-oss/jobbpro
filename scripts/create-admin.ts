// Script para criar admin - executar com: npx ts-node scripts/create-admin.ts
// Ou simplesmente acesse a URL abaixo no navegador após iniciar o servidor

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function createAdmin() {
  const res = await fetch(`${BASE_URL}/api/admin/create-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'guttembergy@gmail.com',
      password: '123456',
    }),
  });

  const data = await res.json();
  console.log('Resultado:', data);
}

createAdmin().catch(console.error);
