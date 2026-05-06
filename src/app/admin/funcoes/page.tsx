'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getAuthToken } from '@/lib/supabase';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Plus, Tag, Check, X, CheckCircle, XCircle, Clock, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Funcao {
  id: string;
  nome: string;
  ativa: boolean;
  created_at: string;
}

interface Solicitacao {
  id: string;
  nome_funcao: string;
  motivo?: string;
  status: string;
  admin_resposta?: string;
  created_at: string;
  users?: { nome: string; email: string; tipo: string };
}

export default function AdminFuncoesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAppStore();
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaFuncao, setNovaFuncao] = useState('');
  const [adding, setAdding] = useState(false);
  const paramTab = searchParams.get('tab');
  const highlightId = searchParams.get('id');
  const [tab, setTab] = useState<'funcoes' | 'solicitacoes'>(paramTab === 'solicitacoes' ? 'solicitacoes' : 'funcoes');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [editingFuncaoId, setEditingFuncaoId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [nomeEditado, setNomeEditado] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchData();
    }
  }, [user, authLoading]);

  // Auto-scroll para solicitação destacada
  useEffect(() => {
    if (highlightId && !loading) {
      setTimeout(() => {
        document.getElementById(`sol-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightId, loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const ts = Date.now();
      const [funcoesRes, solRes] = await Promise.all([
        fetch(`/api/admin/funcoes?all=1&t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/admin/funcoes/solicitacoes?t=${ts}`, { headers, cache: 'no-store' }),
      ]);

      const funcoesData = await funcoesRes.json();
      const solData = await solRes.json();

      if (funcoesRes.ok) setFuncoes(funcoesData.funcoes || []);
      if (solRes.ok) setSolicitacoes(solData.solicitacoes || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFuncao = async () => {
    if (!novaFuncao.trim()) return;
    setAdding(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/funcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nome: novaFuncao.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Função adicionada!');
      setNovaFuncao('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const toggleFuncao = async (id: string, ativa: boolean) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/funcoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, ativa: !ativa }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      setFuncoes((prev) => prev.map((f) => f.id === id ? { ...f, ativa: !ativa } : f));
      toast.success(ativa ? 'Função desativada' : 'Função ativada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEdit = (f: Funcao) => {
    setEditingFuncaoId(f.id);
    setEditingNome(f.nome);
  };

  const saveEdit = async () => {
    if (!editingFuncaoId || !editingNome.trim()) return;
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/funcoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id: editingFuncaoId, nome: editingNome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFuncoes((prev) => prev.map((f) => f.id === editingFuncaoId ? { ...f, nome: editingNome.trim() } : f));
      toast.success('Função renomeada!');
      setEditingFuncaoId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const responderSolicitacao = async (id: string, acao: 'aprovar' | 'rejeitar') => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/funcoes/solicitacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, acao, motivo_rejeicao: acao === 'rejeitar' ? motivoRejeicao : undefined, nome_editado: acao === 'aprovar' ? nomeEditado[id] : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Já respondida - atualizar estado local
          setSolicitacoes((prev) => prev.map((s) => s.id === id ? { ...s, status: acao === 'aprovar' ? 'aprovada' : 'rejeitada' } : s));
          toast('Solicitação já foi respondida', { icon: 'ℹ️' });
          return;
        }
        throw new Error(data.error);
      }
      toast.success(acao === 'aprovar' ? 'Função aprovada e adicionada!' : 'Solicitação rejeitada');

      // Atualização otimista: mover item para histórico localmente
      setSolicitacoes((prev) => prev.map((s) => s.id === id ? { ...s, status: acao === 'aprovar' ? 'aprovada' : 'rejeitada' } : s));

      // Se aprovada, adicionar à lista de funções localmente
      if (acao === 'aprovar') {
        const sol = solicitacoes.find((s) => s.id === id);
        const nomeFinal = (nomeEditado[id] && nomeEditado[id].trim()) || sol?.nome_funcao || '';
        setFuncoes((prev) => [...prev, { id: `new-${id}`, nome: nomeFinal, ativa: true, created_at: new Date().toISOString() }]);
      }

      setRejectingId(null);
      setMotivoRejeicao('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const historico = solicitacoes.filter((s) => s.status !== 'pendente');

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Funções</h1>
              </div>
              {pendentes.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {pendentes.length}
                </span>
              )}
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setTab('funcoes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'funcoes' ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                Funções ({funcoes.length})
              </button>
              <button onClick={() => setTab('solicitacoes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${tab === 'solicitacoes' ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                Solicitações
                {pendentes.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendentes.length}
                  </span>
                )}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
            ) : tab === 'funcoes' ? (
              <div>
                {/* Adicionar função */}
                <div className="flex gap-3 mb-6">
                  <input value={novaFuncao} onChange={(e) => setNovaFuncao(e.target.value)}
                    placeholder="Nome da nova função..."
                    className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                    onKeyDown={(e) => e.key === 'Enter' && addFuncao()} />
                  <button onClick={addFuncao} disabled={adding || !novaFuncao.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                  </button>
                </div>

                {/* Lista de funções */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {funcoes.map((f) => (
                    <div key={f.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${f.ativa ? 'bg-gray-800 border-gray-700' : 'bg-gray-800/50 border-gray-800 opacity-50'}`}>
                      {editingFuncaoId === f.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input value={editingNome} onChange={(e) => setEditingNome(e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-brand-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingFuncaoId(null); }}
                            autoFocus />
                          <button onClick={saveEdit} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded" title="Salvar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingFuncaoId(null)} className="p-1 text-gray-400 hover:bg-gray-700 rounded" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium">{f.nome}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(f)}
                              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
                              title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleFuncao(f.id, f.ativa)}
                              className={`p-1 rounded ${f.ativa ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                              title={f.ativa ? 'Desativar' : 'Ativar'}>
                              {f.ativa ? <Trash2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pendentes */}
                {pendentes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pendentes ({pendentes.length})
                    </h3>
                    <div className="space-y-3">
                      {pendentes.map((s) => (
                        <div key={s.id} id={`sol-${s.id}`} className={`bg-gray-800 border rounded-xl p-4 ${highlightId === s.id ? 'border-brand-500 ring-2 ring-brand-500/50' : 'border-yellow-700/50'}`}>
                          <p className="text-sm text-gray-400 mb-2">
                            Solicitado por <span className="text-white font-medium">{s.users?.nome || 'Usuário'}</span>
                            {s.users?.tipo && <span className="ml-1 text-xs text-gray-500">({s.users.tipo})</span>}
                          </p>
                          <input
                            value={nomeEditado[s.id] ?? s.nome_funcao}
                            onChange={(e) => setNomeEditado((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white font-semibold focus:outline-none focus:border-brand-500 mb-2"
                          />
                          {s.motivo && <p className="text-xs text-gray-500 mb-2">Motivo: {s.motivo}</p>}

                          {s.status !== 'pendente' ? (
                            <p className="text-sm text-yellow-400 italic">Solicitação já foi respondida</p>
                          ) : rejectingId === s.id ? (
                            <div className="space-y-2">
                              <input value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)}
                                placeholder="Motivo da rejeição (opcional)..."
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-red-500" />
                              <div className="flex gap-2">
                                <button onClick={() => responderSolicitacao(s.id, 'rejeitar')}
                                  className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors">
                                  <XCircle className="w-4 h-4" /> Confirmar Rejeição
                                </button>
                                <button onClick={() => { setRejectingId(null); setMotivoRejeicao(''); }}
                                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => responderSolicitacao(s.id, 'aprovar')}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
                                <CheckCircle className="w-4 h-4" /> Aprovar e Adicionar
                              </button>
                              <button onClick={() => setRejectingId(s.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors">
                                <XCircle className="w-4 h-4" /> Rejeitar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico */}
                {historico.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">Histórico</h3>
                    <div className="space-y-2">
                      {historico.map((s) => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-800">
                          <span className="text-sm text-gray-300">{s.nome_funcao}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            s.status === 'aprovada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {s.status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {solicitacoes.length === 0 && (
                  <div className="text-center py-20">
                    <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma solicitação recebida</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
