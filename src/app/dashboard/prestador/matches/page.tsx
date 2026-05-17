'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ClipboardList, Calendar, MapPin, CheckCircle, XCircle, Star, MessageCircle, Phone } from 'lucide-react';
import { formatCurrency, formatDate, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';
import type { Match } from '@/lib/types';
import toast from 'react-hot-toast';

export default function PrestadorMatchesPage() {
  const { prestadorPerfil, loading: authLoading } = useAppStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('todos');

  useEffect(() => {
    if (!authLoading && prestadorPerfil) fetchMatches();
  }, [prestadorPerfil, authLoading]);

  const fetchMatches = async () => {
    if (!prestadorPerfil) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/match?prestador_id=${prestadorPerfil.id}`, {
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

  const responderMatch = async (matchId: string, vagaId: string, acao: 'aceitar' | 'recusar' | 'confirmar') => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          vaga_id: vagaId,
          prestador_id: prestadorPerfil?.id,
          action: acao,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        acao === 'confirmar' ? 'Presença confirmada!' :
        acao === 'aceitar' ? 'Match aceito!' : 'Match recusado'
      );
      fetchMatches();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao responder');
    }
  };

  const matchesFiltrados = filtro === 'todos'
    ? matches
    : matches.filter((m) => m.status === filtro);

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Meus Contratos" />

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
                  const vaga = (match as any).vagas;
                  const vagaExpirada = vaga?.data ? new Date(vaga.data + 'T23:59:59') < new Date() : false;
                  return (
                  <div key={match.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {vaga?.titulo || 'Vaga'}
                        </h3>
                        <p className="text-sm text-brand-600">
                          {vaga?.funcao_principal}
                        </p>
                      </div>
                      {vagaExpirada && match.status === 'pendente' ? (
                        <span className="badge text-xs bg-red-100 text-red-700">Expirada</span>
                      ) : (
                        <span className={`badge text-xs ${getMatchStatusColor(match.status)}`}>
                          {getMatchStatusLabel(match.status)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-gray-500 mt-2">
                      {(match as any).vagas?.data && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate((match as any).vagas.data)}</span>
                        </div>
                      )}
                      {(match as any).vagas?.cidade && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{(match as any).vagas.cidade}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(match.valor_acordado || (match as any).vagas?.valor_oferecido || 0)}
                        </span>
                      </div>
                      {(match as any).contratante_perfil?.users?.nome && (
                        <p className="text-xs text-gray-400">
                          Contratante: {(match as any).contratante_perfil.users.nome}
                        </p>
                      )}
                    </div>

                    {match.status === 'pendente' && !vagaExpirada && (
                      <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 text-center">
                        Aguardando resposta do contratante
                      </p>
                    )}

                    {match.status === 'pendente' && vagaExpirada && (
                      <p className="text-xs text-red-400 mt-3 pt-3 border-t border-gray-100 text-center">
                        Vaga expirada — prazo encerrado
                      </p>
                    )}

                    {match.status === 'aceito' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => responderMatch(match.id, match.vaga_id, 'confirmar')}
                          className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" /> Confirmar
                        </button>
                        <button
                          onClick={() => responderMatch(match.id, match.vaga_id, 'recusar')}
                          className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    )}

                    {match.status === 'confirmado' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                        {(match as any).contratante_perfil?.users?.celular && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{(match as any).contratante_perfil.users.celular}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <p className="flex-1 text-xs text-gray-400 flex items-center justify-center">
                            Aguardando conclusão do contratante
                          </p>
                          {(match as any).contratante_perfil?.users?.celular && (
                            <a
                              href={`https://wa.me/55${(match as any).contratante_perfil.users.celular.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" /> Contatar Contratante
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {match.status === 'concluido' && (
                      <Link
                        href={`/avaliar/${match.id}`}
                        className="btn-secondary w-full mt-3 text-sm py-2.5 flex items-center justify-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      >
                        <Star className="w-4 h-4" /> Avaliar Contratante
                      </Link>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      )}
    </AuthProvider>
  );
}
