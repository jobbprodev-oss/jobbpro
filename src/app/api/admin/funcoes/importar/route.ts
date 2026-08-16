import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAILS = ['guttembergy@gmail.com', 'bergnoco@gmail.com', 'ben@teste.com'];

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

async function isAdmin(token: string): Promise<boolean> {
  const { data: { user } } = await getAdmin().auth.getUser(token);
  if (!user) return false;
  const { data } = await getAdmin().from('users').select('tipo').eq('id', user.id).maybeSingle();
  if (data?.tipo === 'admin') return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { nomes } = await request.json();
    if (!Array.isArray(nomes) || nomes.length === 0) {
      return NextResponse.json({ error: 'Lista de funções vazia' }, { status: 400 });
    }

    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

    // Buscar TODOS os nomes existentes paginando (evita limite padrão de 1000 do PostgREST)
    const PAGE_SIZE = 1000;
    let existentes: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await getAdmin().from('funcoes').select('nome').range(from, from + PAGE_SIZE - 1);
      existentes = existentes.concat(data || []);
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    const nomesExistentes = new Set(existentes.map((f: any) => normalize(f.nome)));

    let cadastradas = 0;
    let ignoradas = 0;

    for (const nome of nomes) {
      const nomeTrimmed = nome.trim();
      if (!nomeTrimmed) continue;

      if (nomesExistentes.has(normalize(nomeTrimmed))) {
        ignoradas++;
        continue;
      }

      const { error } = await getAdmin()
        .from('funcoes')
        .insert({ nome: nomeTrimmed, ativa: true });

      if (!error) {
        cadastradas++;
        nomesExistentes.add(normalize(nomeTrimmed));
      } else if (error.code === '23505') {
        ignoradas++;
      } else {
        throw error;
      }
    }

    return NextResponse.json({ cadastradas, ignoradas });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
