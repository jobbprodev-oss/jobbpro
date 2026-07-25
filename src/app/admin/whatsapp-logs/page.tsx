'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import {
  Loader2, ArrowLeft, Search, MessageSquare,
  CheckCircle2, XCircle, Clock, RefreshCw,
  Send, X,
} from 'lucide-react';

interface WhatsappLog {
  id: string;
  user_id: string;
  notification_id: string;
  phone: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  users: { nome: string; tipo: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  pending: 'Pendente',
};

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="w-3.5 h-3.5" />,
  failed: <XCircle className="w-3.5 h-3.5" />,
  pending: <Clock className="w-3.5 h-3.5" />,
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
  return phone;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminWhatsappLogsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [logs, setLogs] = useState<WhatsappLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Teste JOBBPRO ✅ Integração WhatsApp funcionando!');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchLogs();
    }
  }, [user, authLoading]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/whatsapp-logs', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = logs.filter((l) => {
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false;
    if (filtroTipo !== 'todos' && l.users?.tipo !== filtroTipo) return false;
    if (dataInicio && new Date(l.created_at) < new Date(dataInicio)) return false;
    if (dataFim && new Date(l.created_at) > new Date(dataFim + 'T23:59:59')) return false;
    if (busca) {
      const t = busca.toLowerCase();
      const matchNome = l.users?.nome?.toLowerCase().includes(t);
      const matchPhone = l.phone?.includes(busca.replace(/\D/g, ''));
      if (!matchNome && !matchPhone) return false;
    }
    return true;
  });

  const abrirTestModal = () => {
    setTestResult(null);
    setShowTestModal(true);
  };

  const fecharTestModal = () => {
    setShowTestModal(false);
    setTestResult(null);
  };

  const enviarTeste = async () => {
    if (!testPhone.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/test-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, text: 'Mensagem enviada com sucesso.' });
      } else {
        const erro =
          data?.resposta?.message ||
          data?.resposta?.error ||
          data?.erro ||
          (data?.etapa === 'env_vars' ? 'Variáveis do NotificaMais não configuradas.' : null) ||
          `Falha ao enviar (HTTP ${data?.httpStatus ?? '?'})`;
        setTestResult({ ok: false, text: erro });
      }
    } catch (err: any) {
      setTestResult({ ok: false, text: err.message || 'Erro ao chamar a API de teste' });
    } finally {
      setTestLoading(false);
    }
  };

  const totalEnviados = logs.filter((l) => l.status === 'sent').length;
  const totalFalharam = logs.filter((l) => l.status === 'failed').length;
  const totalPendentes = logs.filter((l) => l.status === 'pending').length;

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                <h1 className="text-lg font-bold">Logs WhatsApp / NotificaMais</h1>
              </div>
              <button
                onClick={abrirTestModal}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 rounded-lg text-sm text-green-400 transition-colors"
              >
                <Send className="w-4 h-4" />
                Testar API
              </button>
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{totalEnviados}</p>
                <p className="text-sm text-gray-400 mt-1">Enviados</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{totalFalharam}</p>
                <p className="text-sm text-gray-400 mt-1">Falharam</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{totalPendentes}</p>
                <p className="text-sm text-gray-400 mt-1">Pendentes</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="todos">Todos os status</option>
                  <option value="sent">Enviados</option>
                  <option value="failed">Falharam</option>
                  <option value="pending">Pendentes</option>
                </select>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="prestador">Prestadores</option>
                  <option value="contratante">Contratantes</option>
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <span className="text-sm text-gray-500 whitespace-nowrap">Período:</span>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                />
                <span className="text-gray-500 text-sm">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                />
                {(dataInicio || dataFim) && (
                  <button
                    onClick={() => { setDataInicio(''); setDataFim(''); }}
                    className="text-xs text-gray-500 hover:text-gray-300 whitespace-nowrap"
                  >
                    Limpar
                  </button>
                )}
                <span className="text-sm text-gray-500 ml-auto whitespace-nowrap">
                  {filtrados.length} registros
                </span>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-medium">Usuário</th>
                      <th className="pb-3 font-medium">Telefone</th>
                      <th className="pb-3 font-medium">Mensagem</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtrados.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-800/50">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white">
                            {log.users?.nome || <span className="text-gray-500">—</span>}
                          </p>
                          {log.users?.tipo && (
                            <span className={`inline-flex text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${
                              log.users.tipo === 'prestador'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-violet-500/20 text-violet-400'
                            }`}>
                              {log.users.tipo === 'prestador' ? 'Prestador' : 'Contratante'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                          {formatPhone(log.phone)}
                        </td>
                        <td className="py-3 pr-4 text-gray-300 max-w-xs">
                          <p className="truncate" title={log.message}>{log.message}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status]}`}>
                            {STATUS_ICONS[log.status]}
                            {STATUS_LABELS[log.status]}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap text-xs">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 text-red-400 text-xs max-w-[200px]">
                          {log.error_message ? (
                            <span className="truncate block" title={log.error_message}>
                              {log.error_message}
                            </span>
                          ) : (
                            <span className="text-gray-700">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal: Testar API */}
          {showTestModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-400" />
                    Testar API
                  </h2>
                  <button onClick={fecharTestModal} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Número de telefone</label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="Ex: 5511999999999"
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Mensagem de teste</label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  {testResult && (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                        testResult.ok
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}
                    >
                      {testResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="break-words">{testResult.text}</span>
                    </div>
                  )}

                  <button
                    onClick={enviarTeste}
                    disabled={testLoading || !testPhone.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar teste
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AuthProvider>
  );
}
