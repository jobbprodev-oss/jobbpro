'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Briefcase, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function NovaSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    // Supabase injeta o token via hash na URL; precisamos aguardar o onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPronto(true);
      }
    });

    // Verificar erro no hash (link expirado, inválido, etc.)
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      setErro('Link expirado ou inválido. Solicite uma nova redefinição de senha.');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setConcluido(true);
      toast.success('Senha atualizada com sucesso!');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Link href="/login" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-brand-600" />
          </div>
          <span className="text-xl font-bold text-white">JOBBPRO</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm mx-auto w-full">

          {concluido ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Senha atualizada!</h2>
              <p className="text-gray-500 text-sm">Redirecionando para o login...</p>
            </div>

          ) : erro ? (
            <div className="text-center py-4">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
              <p className="text-gray-500 text-sm mb-6">{erro}</p>
              <Link href="/recuperar-senha" className="btn-primary w-full flex items-center justify-center gap-2">
                Solicitar novo link
              </Link>
              <Link href="/login" className="mt-3 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
              </Link>
            </div>

          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-brand-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
                <p className="text-gray-500 text-sm mt-1">Escolha uma nova senha para sua conta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="input-field pl-11 pr-11"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="input-field pl-11 pr-11"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || password.length < 6 || password !== confirm}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
