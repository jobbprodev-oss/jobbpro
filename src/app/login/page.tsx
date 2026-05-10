'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Briefcase, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
        }).then(r => r.json()).then(data => {
          if (data.tipo) {
            const destino = data.tipo === 'admin' ? '/admin' : `/dashboard/${data.tipo}`;
            window.location.href = destino;
          }
        }).catch(() => {});
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Digite seu e-mail');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        console.log('[LOGIN] Auth OK, user id:', data.user.id);
        
        // Verificar usuário via API server-side (bypass RLS, auto-cria admin)
        const checkRes = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, email: data.user.email }),
        });
        const checkData = await checkRes.json();
        console.log('[LOGIN] check-user result:', checkData);

        if (checkData.tipo) {
          const destino = checkData.tipo === 'admin' ? '/admin' : `/dashboard/${checkData.tipo}`;
          console.log('[LOGIN] Redirecionando para:', destino);
          toast.success('Login realizado!');
          window.location.href = destino;
          return;
        } else {
          console.log('[LOGIN] Sem userData, indo para registro');
          window.location.href = '/register/tipo';
          return;
        }
      } else {
        console.log('[LOGIN] Nenhum user retornado');
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login')) {
        toast.error('E-mail ou senha incorretos');
      } else {
        toast.error(err.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-brand-600" />
          </div>
          <span className="text-xl font-bold text-white">JOBBPRO</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm mx-auto w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
            <p className="text-gray-500 text-sm mt-1">
              Acesse sua conta JOBBPRO
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="input-field pl-11"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="input-field pl-11 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim() || password.length < 6}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">Não tem conta?</p>
            <div className="flex gap-3 mt-3">
              <Link href="/register/prestador" className="btn-secondary flex-1 text-sm py-2.5 text-center">
                Prestador
              </Link>
              <Link href="/register/contratante" className="btn-secondary flex-1 text-sm py-2.5 text-center">
                Contratante
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
