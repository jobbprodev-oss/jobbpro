'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import AuthProvider from '@/components/auth-provider';
import { Loader2, MapPin, Calendar, Clock, Shirt, Users, FileText, Heart, Star, User, CheckCircle } from 'lucide-react';
import DisponibilidadeCheckModal from '@/components/disponibilidade-check-modal';
import { formatCurrency, formatDate, formatTime, getVestimentaLabel, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';
import type { Vaga, Match } from '@/lib/types';
import toast from 'react-hot-toast';

export default function VagaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vagaId = params.id as string;
  const { user, prestadorPerfil } = useAppStore();
  const [enviando, setEnviando] = useState(false);
  const [jaEnviou, setJaEnviou] = useState(false);
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDisponibilidadeModal, setShowDisponibilidadeModal] = useState(false);

  useEffect(() => {
    if (vagaId) fetchVaga();
  }, [vagaId]);

  useEffect(() => {
    if (vagaId && prestadorPerfil) checkInteresseExistente();
  }, [vagaId, prestadorPerfil]);

  const checkInteresseExistente = async () => {
    if (!prestadorPerfil) return;
    const { data } = await supabase
      .from('matches')
      .select('id')
      .eq('vaga_id', vagaId)
      .eq('prestador_id', prestadorPerfil.id)
      .not('status', 'in', '("recusado","cancelado")')
      .maybeSingle();
    if (data) setJaEnviou(true);
  };

  const fetchVaga = async () => {
    setLoading(true);
    try {
      const { data: vagaData, error } = await supabase
        .from('vagas')
        .select('*')
        .eq('id', vagaId)
        .single();
      if (error) throw error;
      setVaga(vagaData);

      if (user?.tipo === 'contratante') {
        const token = await getAuthToken();
        const res = await fetch(`/api/match?vaga_id=${vagaId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const result = await res.json();
        const ativos = (result.matches || []).filter((m: Match) =>
          ['pendente', 'aceito', 'confirmado'].includes(m.status)
        );
        setMatches(ativos);
      }
    } catch (err) {
      console.error('Erro ao carregar vaga:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Detalhes da Oportunidade" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      </div>
      </AuthProvider>
    );
  }

  if (!vaga) {
    return (
      <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Oportunidade" showBack />
        <div className="text-center py-20">
          <p className="text-gray-500">Oportunidade não encontrada</p>
        </div>
      </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
    <div className="min-h-screen bg-gray-50">
      <Header title="Detalhes da Oportunidade" showBack />

      <div className="page-container">
        <div className="card p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{vaga.titulo}</h1>
              <p className="text-brand-600 font-medium">{vaga.funcao_principal}</p>
            </div>
            <span className={`badge ${
              !vaga.ativa ? 'bg-gray-100 text-gray-500' :
              new Date(vaga.data + 'T23:59:59') < new Date() ? 'bg-red-100 text-red-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {!vaga.ativa ? 'Encerrada' : new Date(vaga.data + 'T23:59:59') < new Date() ? 'Expirada' : 'Ativa'}
            </span>
          </div>

          <p className="text-3xl font-bold text-emerald-600 mb-4">{formatCurrency(vaga.valor_oferecido)}</p>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(vaga.data)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{formatTime(vaga.horario_inicio)} - {formatTime(vaga.horario_fim)}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              {user?.tipo === 'prestador' ? (
                <span>{[vaga.cidade, vaga.bairro].filter(Boolean).join(', ') || 'Local não informado'}</span>
              ) : (
                <span>{vaga.local_servico}{vaga.cidade ? `, ${vaga.cidade}` : ''}</span>
              )}
            </div>
            {vaga.endereco_completo && user?.tipo !== 'prestador' && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{vaga.endereco_completo}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Shirt className="w-4 h-4 text-gray-400" />
              <span>{getVestimentaLabel(vaga.vestimenta)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{vaga.vagas_preenchidas > 0 ? 'Oportunidade preenchida' : 'Oportunidade disponível'}</span>
            </div>
          </div>
        </div>

        {vaga.descricao && (
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-700">Descrição</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{vaga.descricao}</p>
          </div>
        )}

        {user?.tipo === 'contratante' && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Interesses Recebidos</h3>
              <span className="text-sm text-gray-400">{matches.length}</span>
            </div>
            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Nenhum prestador demonstrou interesse ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => {
                  const prestador = (match as any).prestador_perfil;
                  const prestadorUser = prestador?.users;
                  return (
                    <button
                      key={match.id}
                      onClick={() => router.push('/dashboard/contratante/matches')}
                      className="w-full text-left card-hover p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                          {prestadorUser?.foto_url ? (
                            <img src={prestadorUser.foto_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-brand-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{prestadorUser?.nome || 'Prestador'}</p>
                          <p className="text-sm text-gray-500">{prestador?.funcao_principal}</p>
                          {prestador?.media_avaliacao > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-500">{prestador.media_avaliacao.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`badge text-xs ${getMatchStatusColor(match.status)}`}>
                            {getMatchStatusLabel(match.status)}
                          </span>
                          <CheckCircle className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {user?.tipo === 'prestador' && vaga.ativa && prestadorPerfil && (() => {
          const normalize = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
          const funcoesPrestador = [
            prestadorPerfil.funcao_principal,
            prestadorPerfil.funcao_2,
            prestadorPerfil.funcao_3,
            prestadorPerfil.funcao_4,
            prestadorPerfil.funcao_5,
            prestadorPerfil.funcao_6,
          ].filter(Boolean).map(normalize);
          const funcaoCompativel = funcoesPrestador.includes(normalize(vaga.funcao_principal));
          return funcaoCompativel ? (
          jaEnviou ? (
            <div className="w-full mt-4 flex items-center justify-center gap-2 btn-secondary text-emerald-600 cursor-default">
              <Heart className="w-5 h-5 fill-emerald-600" />
              Interesse Enviado
            </div>
          ) : (
          <button
            onClick={() => setShowDisponibilidadeModal(true)}
            disabled={enviando}
            className="w-full mt-4 flex items-center justify-center gap-2 btn-primary"
          >
            {enviando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Heart className="w-5 h-5" />
            )}
            {enviando ? 'Enviando...' : 'Tenho Interesse nesta Oportunidade'}
          </button>
          )
          ) : (
            <div className="w-full mt-4 text-center py-3 px-4 bg-gray-100 rounded-xl text-sm text-gray-500">
              Você não possui a função cadastrada no seu perfil
            </div>
          );
        })()}

        <DisponibilidadeCheckModal
          isOpen={showDisponibilidadeModal}
          onClose={() => setShowDisponibilidadeModal(false)}
          vagaData={vaga.data}
          vagaHorarioInicio={vaga.horario_inicio}
          vagaHorarioFim={vaga.horario_fim}
          onConfirm={async () => {
            if (jaEnviou || enviando) return;
            setEnviando(true);
            try {
              // Calcular score de compatibilidade
              const calculateMatchScore = () => {
                let score = 50; // Base score
                
                // Função principal (30%)
                const normScore = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
                const vagaFuncNorm = normScore(vaga.funcao_principal);
                if (normScore(prestadorPerfil!.funcao_principal) === vagaFuncNorm) {
                  score += 30;
                } else if (
                  [prestadorPerfil!.funcao_2, prestadorPerfil!.funcao_3, prestadorPerfil!.funcao_4, prestadorPerfil!.funcao_5, prestadorPerfil!.funcao_6]
                    .some((f) => normScore(f) === vagaFuncNorm)
                ) {
                  score += 20;
                }
                
                // Localização (20%) - usando dados do user se disponíveis
                const prestadorUser = user;
                if (prestadorUser?.cidade && vaga.cidade && prestadorUser.cidade.toLowerCase() === vaga.cidade.toLowerCase()) {
                  score += 20;
                } else if (prestadorUser?.estado && vaga.estado && prestadorUser.estado === vaga.estado) {
                  score += 10;
                }
                
                return Math.min(Math.round(score), 100);
              };
              
              const token = await getAuthToken();
              const res = await fetch('/api/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                  vaga_id: vagaId,
                  prestador_id: prestadorPerfil!.id,
                  action: 'criar',
                  match_score: calculateMatchScore(),
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              toast.success('Interesse enviado! Aguarde resposta do contratante.');
              setJaEnviou(true);
            } catch (err: any) {
              if (err.message?.includes('já existe')) {
                toast.error('Você já demonstrou interesse nesta oportunidade');
                setJaEnviou(true);
              } else {
                toast.error(err.message || 'Erro ao enviar interesse');
              }
            } finally {
              setEnviando(false);
            }
          }}
        />
      </div>
    </div>
    </AuthProvider>
  );
}
