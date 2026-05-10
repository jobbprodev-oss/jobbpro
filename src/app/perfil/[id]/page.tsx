'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/header';
import AuthProvider from '@/components/auth-provider';
import RatingStars from '@/components/rating-stars';
import { User as UserIcon, MapPin, Briefcase, Star, Loader2 } from 'lucide-react';
import { formatCurrency, getVestimentaLabel, formatPhone } from '@/lib/utils';
import type { User, PrestadorPerfil, ContratantePerfil } from '@/lib/types';

export default function PerfilPublicoPage() {
  const params = useParams();
  const userId = params.id as string;
  const [usuario, setUsuario] = useState<User | null>(null);
  const [prestadorPerfil, setPrestadorPerfil] = useState<PrestadorPerfil | null>(null);
  const [contratantePerfil, setContratantePerfil] = useState<ContratantePerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchPerfil();
  }, [userId]);

  const fetchPerfil = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getById', userId }),
      });
      const { data: userData, error } = await res.json();
      if (error) throw new Error(error);
      if (!userData) return;
      setUsuario(userData as User);

      if (userData.tipo === 'prestador') {
        const { data: perfil } = await supabase
          .from('prestador_perfil')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (perfil) setPrestadorPerfil(perfil);
      } else {
        const { data: perfil } = await supabase
          .from('contratante_perfil')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (perfil) setContratantePerfil(perfil);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPrestador = usuario?.tipo === 'prestador';

  if (loading) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header title="Perfil" showBack />
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        </div>
      </AuthProvider>
    );
  }

  if (!usuario) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header title="Perfil" showBack />
          <div className="text-center py-20">
            <p className="text-gray-500">Perfil não encontrado</p>
          </div>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Perfil" showBack />

        <div className="page-container">
          {/* Avatar & Name */}
          <div className="card p-5 text-center mb-4">
            <div className="w-24 h-24 rounded-full bg-brand-100 mx-auto mb-3 overflow-hidden">
              {usuario.foto_url ? (
                <img src={usuario.foto_url} alt={usuario.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-brand-400" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{usuario.nome}</h2>
            <p className="text-sm text-brand-600 font-medium capitalize">{usuario.tipo}</p>

            {isPrestador && prestadorPerfil && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <RatingStars rating={prestadorPerfil.media_avaliacao} size="md" />
                <span className="text-sm text-gray-500 ml-1">({prestadorPerfil.total_avaliacoes})</span>
              </div>
            )}
            {!isPrestador && contratantePerfil && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <RatingStars rating={contratantePerfil.media_avaliacao} size="md" />
                <span className="text-sm text-gray-500 ml-1">({contratantePerfil.total_avaliacoes})</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="card p-4 mb-4 space-y-3">
            {usuario.cidade && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{usuario.cidade}{usuario.estado ? `/${usuario.estado}` : ''}</span>
              </div>
            )}
          </div>

          {/* Prestador */}
          {isPrestador && prestadorPerfil && (
            <div className="card p-4 mb-4 space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Profissional
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Função Principal:</span>
                <span className="font-medium">{prestadorPerfil.funcao_principal}</span>
                {prestadorPerfil.funcao_2 && (
                  <>
                    <span className="text-gray-500">Função 2:</span>
                    <span className="font-medium">{prestadorPerfil.funcao_2}</span>
                  </>
                )}
                {prestadorPerfil.funcao_3 && (
                  <>
                    <span className="text-gray-500">Função 3:</span>
                    <span className="font-medium">{prestadorPerfil.funcao_3}</span>
                  </>
                )}
                <span className="text-gray-500">Valor:</span>
                <span className="font-medium text-emerald-600">
                  {prestadorPerfil.valor_pretendido ? formatCurrency(prestadorPerfil.valor_pretendido) : '—'}
                </span>
                <span className="text-gray-500">Vestimenta:</span>
                <span className="font-medium">{getVestimentaLabel(prestadorPerfil.vestimenta)}</span>
                <span className="text-gray-500">Serviços:</span>
                <span className="font-medium">{prestadorPerfil.total_servicos}</span>
              </div>
              {prestadorPerfil.descricao && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{prestadorPerfil.descricao}</p>
                </div>
              )}
            </div>
          )}

          {/* Contratante */}
          {!isPrestador && contratantePerfil && (
            <div className="card p-4 mb-4 space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Empresa
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {contratantePerfil.nome_empresa && (
                  <>
                    <span className="text-gray-500">Nome Fantasia:</span>
                    <span className="font-medium">{contratantePerfil.nome_empresa}</span>
                  </>
                )}
                <span className="text-gray-500">Contratações:</span>
                <span className="font-medium">{contratantePerfil.total_contratacoes}</span>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Star className="w-4 h-4" /> Estatísticas
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-brand-600">
                  {isPrestador ? prestadorPerfil?.total_servicos || 0 : contratantePerfil?.total_contratacoes || 0}
                </p>
                <p className="text-xs text-gray-500">{isPrestador ? 'Serviços' : 'Contratações'}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">
                  {(isPrestador ? prestadorPerfil?.media_avaliacao : contratantePerfil?.media_avaliacao)?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-gray-500">Avaliação</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {isPrestador ? prestadorPerfil?.total_avaliacoes || 0 : contratantePerfil?.total_avaliacoes || 0}
                </p>
                <p className="text-xs text-gray-500">Avaliações</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}
