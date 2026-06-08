'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { User } from '@/lib/types';

const PUBLIC_ROUTES = ['/', '/login', '/register/prestador', '/register/contratante', '/register/tipo', '/termos', '/privacidade'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setPrestadorPerfil, setContratantePerfil, setNotificacoes, setLoading } = useAppStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            await fetch('/api/pagamentos/sincronizar', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          } catch (e) {
            console.error('[AUTH] Erro ao sincronizar pagamentos:', e);
          }

          // Buscar via API server-side (bypass RLS)
          let userData: any = null;
          try {
            const res = await fetch('/api/users/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'getById', userId: session.user.id }),
            });
            const result = await res.json();
            userData = result.data;

            // Fallback: buscar por email
            if (!userData && session.user.email) {
              const res2 = await fetch('/api/users/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getByEmail', email: session.user.email }),
              });
              const result2 = await res2.json();
              userData = result2.data;
            }

            // Se ainda não existe, tentar auto-criar admin
            if (!userData) {
              const checkRes = await fetch('/api/auth/check-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
              });
              const checkData = await checkRes.json();
              if (checkData.tipo) {
                const res3 = await fetch('/api/users/query', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'getById', userId: session.user.id }),
                });
                const result3 = await res3.json();
                userData = result3.data;
              }
            }
          } catch (e) {
            console.error('Auth user query error:', e);
          }

          if (userData) {
            setUser(userData as User);

            if (userData.tipo === 'prestador') {
              const { data: perfil } = await supabase
                .from('prestador_perfil')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              if (perfil) setPrestadorPerfil(perfil);
            } else if (userData.tipo === 'contratante') {
              const { data: perfil } = await supabase
                .from('contratante_perfil')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              if (perfil) setContratantePerfil(perfil);
            }

            const { data: notifs } = await supabase
              .from('notificacoes')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .limit(20);
            if (notifs) setNotificacoes(notifs);
          }
        } else if (!PUBLIC_ROUTES.includes(pathname)) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        useAppStore.getState().reset();
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, setUser, setPrestadorPerfil, setContratantePerfil, setNotificacoes, setLoading]);

  return <>{children}</>;
}
