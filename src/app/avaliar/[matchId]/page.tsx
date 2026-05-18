'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import AuthProvider from '@/components/auth-provider';
import RatingStars from '@/components/rating-stars';
import { Loader2, Star, User as UserIcon, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AvaliarPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const { user, loading: authLoading } = useAppStore();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [jaAvaliou, setJaAvaliou] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo === 'admin') { router.push('/admin'); return; }
      if (matchId) fetchMatch();
    }
  }, [user, authLoading, matchId]);

  const fetchMatch = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [matchRes, avRes] = await Promise.all([
        fetch(`/api/match?match_id=${matchId}`, { headers }),
        fetch(`/api/avaliacoes?match_id=${matchId}`, { headers }),
      ]);

      const matchData = await matchRes.json();
      if (!matchRes.ok) throw new Error(matchData.error);
      setMatch(matchData.match);

      const avData = await avRes.json();
      if (avData.jaAvaliou) setJaAvaliou(true);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const enviarAvaliacao = async () => {
    if (!user || !match) return;
    if (nota === 0) {
      toast.error('Selecione uma nota');
      return;
    }

    const isPrestador = user.tipo === 'prestador';
    const avaliadoId = isPrestador
      ? match.contratante_perfil?.user_id
      : match.prestador_perfil?.user_id;

    if (!avaliadoId) {
      toast.error('Erro ao identificar avaliado');
      return;
    }

    setEnviando(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ match_id: matchId, avaliado_id: avaliadoId, nota, descricao }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setJaAvaliou(true); toast.error('Você já avaliou este serviço'); return; }
        throw new Error(data.error);
      }
      toast.success('Avaliação enviada!');
      setJaAvaliou(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  const getAvaliadoInfo = () => {
    if (!match || !user) return { nome: '', foto: '', funcao: '' };
    if (user.tipo === 'prestador') {
      return {
        nome: match.contratante_perfil?.users?.nome || 'Contratante',
        foto: match.contratante_perfil?.users?.foto_url,
        funcao: match.contratante_perfil?.nome_empresa || 'Contratante',
      };
    }
    return {
      nome: match.prestador_perfil?.users?.nome || 'Prestador',
      foto: match.prestador_perfil?.users?.foto_url,
      funcao: match.prestador_perfil?.funcao_principal || 'Prestador',
    };
  };

  return (
    <AuthProvider>
      {authLoading || loading ? (
        <div className="min-h-screen bg-gray-50">
          <Header title="Avaliar" showBack />
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        </div>
      ) : !match ? (
        <div className="min-h-screen bg-gray-50">
          <Header title="Avaliar" showBack />
          <div className="text-center py-20">
            <p className="text-gray-500">Serviço não encontrado</p>
          </div>
        </div>
      ) : jaAvaliou ? (
        <div className="min-h-screen bg-gray-50">
          <Header title="Avaliar" showBack />
          <div className="page-container text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Avaliação enviada!</h2>
            <p className="text-gray-500 mb-6">Obrigado pelo seu feedback.</p>
            <button
              onClick={() => router.back()}
              className="btn-primary"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Avaliar Serviço" showBack />

          <div className="page-container">
            {/* Vaga info */}
            <div className="card p-4 mb-4">
              <h3 className="font-semibold text-gray-900">{match.vagas?.titulo}</h3>
              <p className="text-sm text-brand-600">{match.vagas?.funcao_principal}</p>
            </div>

            {/* Avaliado */}
            <div className="card p-4 mb-6">
              <p className="text-sm text-gray-500 mb-3">
                Avaliar {user?.tipo === 'prestador' ? 'contratante' : 'prestador'}:
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center overflow-hidden">
                  {getAvaliadoInfo().foto ? (
                    <img src={getAvaliadoInfo().foto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-brand-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{getAvaliadoInfo().nome}</p>
                  <p className="text-sm text-gray-500">{getAvaliadoInfo().funcao}</p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="card p-5 mb-4 text-center">
              <h3 className="font-semibold text-gray-700 mb-1">Como foi a experiência?</h3>
              <p className="text-sm text-gray-400 mb-4">Toque nas estrelas para avaliar</p>
              <div className="flex justify-center">
                <RatingStars rating={nota} size="lg" interactive onChange={setNota} />
              </div>
              {nota > 0 && (
                <p className="text-sm text-brand-600 font-medium mt-2">
                  {nota === 1 && 'Ruim'}
                  {nota === 2 && 'Regular'}
                  {nota === 3 && 'Bom'}
                  {nota === 4 && 'Muito bom'}
                  {nota === 5 && 'Excelente'}
                </p>
              )}
            </div>

            {/* Comentário */}
            <div className="card p-4 mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Comentário (opcional)
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Conte como foi a experiência..."
                className="input-field min-h-[100px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{descricao.length}/500</p>
            </div>

            <button
              onClick={enviarAvaliacao}
              disabled={enviando || nota === 0}
              className="btn-success w-full flex items-center justify-center gap-2"
            >
              {enviando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Star className="w-5 h-5" />
              )}
              {enviando ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
