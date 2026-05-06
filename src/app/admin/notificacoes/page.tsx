'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { ArrowLeft, Bell, CheckCheck, Loader2, Tag, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AdminNotificacoesPage() {
  const router = useRouter();
  const { user, notificacoes, setNotificacoes, loading: authLoading } = useAppStore();

  const marcarTodasLidas = async () => {
    if (!user) return;
    const naoLidas = notificacoes.filter((n) => !n.lida);
    if (naoLidas.length === 0) return;
    await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
    setNotificacoes(notificacoes.map((n) => ({ ...n, lida: true })));
  };

  const marcarLida = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotificacoes(notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const formatarTempo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'solicitacao_funcao': return <Tag className="w-5 h-5 text-orange-400" />;
      case 'match': return <Bell className="w-5 h-5 text-brand-400" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-brand-400" />
                  <h1 className="text-lg font-bold">Notificações</h1>
                  {naoLidas > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">{naoLidas}</span>
                  )}
                </div>
              </div>
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300">
                  <CheckCheck className="w-4 h-4" /> Marcar todas
                </button>
              )}
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-6 py-6 space-y-2">
            {notificacoes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.lida) marcarLida(n.id);
                    if (n.link) router.push(n.link);
                  }}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    n.lida
                      ? 'bg-gray-800/50 border-gray-800 opacity-60'
                      : 'bg-gray-800 border-gray-700 hover:border-brand-500'
                  }`}
                >
                  <div className="mt-0.5">{getIcon(n.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{n.titulo}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{n.mensagem}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{formatarTempo(n.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
