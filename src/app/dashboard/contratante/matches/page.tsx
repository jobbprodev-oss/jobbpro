'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ClipboardList, Calendar, User, Star, CheckCircle, XCircle, MessageCircle, Phone } from 'lucide-react';
import { formatCurrency, formatDate, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';
import type { Match } from '@/lib/types';
import toast from 'react-hot-toast';

export default function ContratanteMatchesPage() {
  const { contratantePerfil, loading: authLoading } = useAppStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');
  const [avaliadosIds, setAvaliadosIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && contratantePerfil) {
      fetchMatches();
      fetchAvaliados();
    }
  }, [contratantePerfil, authLoading]);

  const fetchAvaliados = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/avaliacoes?avaliados=true', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setAvaliadosIds(new Set(data.match_ids || []));
    } catch {}
  };

  const fetchMatches = async () => {
    if (!contratantePerfil) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/match?contratante_id=${contratantePerfil.id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const result = await res.json();
      setMatches(result.matches || []);
    } catch (err) {
      console.error('Erro ao buscar matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const responderMatch = async (vagaId: string, prestadorId: string, acao: 'aceitar' | 'recusar' | 'concluir' | 'cancelar_contratante') => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          vaga_id: vagaId,
          prestador_id: prestadorId,
          action: acao,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        acao === 'aceitar' ? 'Interesse aceito!' :
        acao === 'recusar' ? 'Interesse recusado' :
        acao === 'cancelar_contratante' ? 'Match cancelado' :
        'Serviço concluído!'
      );
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar');
    }
  };

  const STATUS_CONCLUIDOS = ['concluido', 'recusado', 'cancelado'];
  const isExpirada = (m: Match) => {
    const v = (m as any).vagas;
    return m.status === 'pendente' && v?.data ? new Date(v.data + 'T23:59:59') < new Date() : false;
  };
  const matchesFiltrados = filtro === 'todos'
    ? matches
    : filtro === 'concluido'
      ? matches.filter((m) => STATUS_CONCLUIDOS.includes(m.status) || isExpirada(m))
      : filtro === 'pendente'
        ? matches.filter((m) => m.status === 'pendente' && !isExpirada(m))
        : matches.filter((m) => m.status === filtro);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Contratos" />

        {authLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div className="page-container">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {['todos', 'pendente', 'aceito', 'confirmado', 'concluido'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filtro === f
                      ? 'bg-brand-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : getMatchStatusLabel(f)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : matchesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum contrato encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchesFiltrados.map((match) => {
                  const prestador = (match as any).prestador_perfil;
                  const prestadorUser = prestador?.users;
                  const vaga = (match as any).vagas;
                  const vagaExpirada = vaga?.data ? new Date(vaga.data + 'T23:59:59') < new Date() : false;

                  return (
                    <div key={match.id} className="card p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{vaga?.titulo || 'Vaga'}</h3>
                          <p className="text-sm text-brand-600">{vaga?.funcao_principal}</p>
                        </div>
                        {vagaExpirada && match.status === 'pendente' ? (
                          <span className="badge text-xs bg-red-100 text-red-700">Expirada</span>
                        ) : (
                          <span className={`badge text-xs ${getMatchStatusColor(match.status)}`}>
                            {getMatchStatusLabel(match.status)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center overflow-hidden">
                          {prestadorUser?.foto_url ? (
                            <img src={prestadorUser.foto_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-brand-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{prestadorUser?.nome || 'Prestador'}</p>
                          <p className="text-xs text-gray-500">{prestador?.funcao_principal}</p>
                        </div>
                        {prestador?.media_avaliacao > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-gray-600">{prestador.media_avaliacao.toFixed(1)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        {vaga?.data && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(vaga.data)}</span>
                          </div>
                        )}
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(match.valor_acordado || vaga?.valor_oferecido || 0)}
                        </span>
                      </div>

                      {match.status === 'pendente' && !vagaExpirada && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => responderMatch(match.vaga_id, match.prestador_id, 'aceitar')}
                            className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" /> Aceitar
                          </button>
                          <button
                            onClick={() => responderMatch(match.vaga_id, match.prestador_id, 'recusar')}
                            className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" /> Recusar
                          </button>
                        </div>
                      )}

                      {match.status === 'pendente' && vagaExpirada && (
                        <p className="text-xs text-red-400 mt-3 pt-3 border-t border-gray-100 text-center">
                          Vaga expirada — prazo encerrado
                        </p>
                      )}

                      {match.status === 'aceito' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-400 flex-1">Aguardando confirmação do prestador</p>
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja cancelar este match?')) {
                                responderMatch(match.vaga_id, match.prestador_id, 'cancelar_contratante');
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-red-500 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 font-medium transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      )}

                      {match.status === 'confirmado' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          {prestadorUser?.celular && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{prestadorUser.celular}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => responderMatch(match.vaga_id, match.prestador_id, 'concluir')}
                              className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Marcar como Concluído
                            </button>
                            {prestadorUser?.celular && (
                              <a
                                href={`https://wa.me/55${prestadorUser.celular.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" /> Contatar Prestador
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {match.status === 'concluido' && (
                        avaliadosIds.has(match.id) ? (
                          <p className="text-xs text-emerald-600 mt-3 pt-3 border-t border-gray-100 text-center flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Avaliação realizada
                          </p>
                        ) : (
                          <Link
                            href={`/avaliar/${match.id}`}
                            className="btn-secondary w-full mt-3 text-sm py-2.5 flex items-center justify-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                          >
                            <Star className="w-3.5 h-3.5" /> Avaliar Prestador
                          </Link>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <BottomNav />
      </div>
    </AuthProvider>
  );
}
