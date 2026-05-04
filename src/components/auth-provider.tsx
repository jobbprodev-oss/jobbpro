'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { User } from '@/lib/types';

const PUBLIC_ROUTES = ['/', '/login', '/register/prestador', '/register/contratante', '/register/tipo'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setPrestadorPerfil, setContratantePerfil, setNotificacoes, setLoading } = useAppStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

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
            // admin não precisa de perfil extra

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
