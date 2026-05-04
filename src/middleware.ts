import { NextResponse } from 'next/server';

// A proteção de rotas admin é feita client-side no AuthProvider + admin/page.tsx
// O Supabase JS client armazena sessão em localStorage (não cookies),
// então middleware server-side não consegue verificar auth de forma confiável.
// Para proteção server-side, seria necessário @supabase/ssr.

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
