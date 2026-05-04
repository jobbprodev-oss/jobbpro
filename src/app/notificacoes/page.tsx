'use client';

import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  info: <Info className="w-5 h-5 text-blue-500" />,
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  match: <Bell className="w-5 h-5 text-brand-500" />,
};

export default function NotificacoesPage() {
  const { user, notificacoes, setNotificacoes, loading } = useAppStore();

  const marcarTodasLidas = async () => {
    if (!user) return;
    const naoLidas = notificacoes.filter((n) => !n.lida);
    if (naoLidas.length === 0) return;

    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    setNotificacoes(notificacoes.map((n) => ({ ...n, lida: true })));
  };

  const marcarLida = async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotificacoes(notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const temNaoLidas = notificacoes.some((n) => !n.lida);

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

  return (
    <AuthProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Notificações" showNotifications={false} />

          <div className="page-container">
            {temNaoLidas && (
              <button
                onClick={marcarTodasLidas}
                className="flex items-center gap-2 text-sm text-brand-600 font-medium mb-4 hover:underline"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como lidas
              </button>
            )}

            {notificacoes.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma notificação</p>
                <p className="text-gray-400 text-sm mt-1">Você será notificado sobre matches e atualizações</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificacoes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.lida && marcarLida(n.id)}
                    className={`w-full text-left card p-4 flex gap-3 items-start transition-colors ${
                      !n.lida ? 'bg-brand-50/50 border-brand-100' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {iconMap[n.tipo] || iconMap.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-sm font-semibold truncate ${!n.lida ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.titulo}
                        </h4>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatarTempo(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                    </div>
                    {!n.lida && (
                      <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      )}
    </AuthProvider>
  );
}
