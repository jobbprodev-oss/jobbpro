'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import RatingStars from '@/components/rating-stars';
import AdicionarFuncaoModal from '@/components/adicionar-funcao-modal';
import { User as UserIcon, Phone, Mail, MapPin, Briefcase, DollarSign, Star, Shield, Edit, Loader2, PlusCircle } from 'lucide-react';
import { formatCurrency, getVestimentaLabel, formatPhone } from '@/lib/utils';

export default function PerfilPage() {
  const { user, prestadorPerfil, contratantePerfil, loading } = useAppStore();
  const [showAdicionarFuncao, setShowAdicionarFuncao] = useState(false);

  const isPrestador = user?.tipo === 'prestador';

  return (
    <AuthProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
      <div className="min-h-screen bg-gray-50">
        <Header title="Meu Perfil" />

        <div className="page-container">
          {/* Avatar & Name */}
          <div className="card p-5 text-center mb-4">
            <div className="w-24 h-24 rounded-full bg-brand-100 mx-auto mb-3 overflow-hidden">
              {user?.foto_url ? (
                <img src={user.foto_url} alt={user.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-brand-400" />
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.nome}</h2>
            <p className="text-sm text-brand-600 font-medium capitalize">{user?.tipo}</p>

            {isPrestador && prestadorPerfil && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <RatingStars rating={prestadorPerfil.media_avaliacao} size="md" />
                <span className="text-sm text-gray-500 ml-1">
                  ({prestadorPerfil.total_avaliacoes})
                </span>
              </div>
            )}
            {!isPrestador && contratantePerfil && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <RatingStars rating={contratantePerfil.media_avaliacao} size="md" />
                <span className="text-sm text-gray-500 ml-1">
                  ({contratantePerfil.total_avaliacoes})
                </span>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="card p-4 mb-4 space-y-3">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Informações
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{user?.celular ? formatPhone(user.celular) : '—'}</span>
            </div>
            {user?.email && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
            )}
            {user?.cidade && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{user.cidade}{user.estado ? `/${user.estado}` : ''}</span>
              </div>
            )}
          </div>

          {/* Prestador-specific */}
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
                {prestadorPerfil.funcao_4 && (
                  <>
                    <span className="text-gray-500">Função 4:</span>
                    <span className="font-medium">{prestadorPerfil.funcao_4}</span>
                  </>
                )}
                {prestadorPerfil.funcao_5 && (
                  <>
                    <span className="text-gray-500">Função 5:</span>
                    <span className="font-medium">{prestadorPerfil.funcao_5}</span>
                  </>
                )}
                {prestadorPerfil.funcao_6 && (
                  <>
                    <span className="text-gray-500">Função 6:</span>
                    <span className="font-medium">{prestadorPerfil.funcao_6}</span>
                  </>
                )}
                <span className="text-gray-500">Valor:</span>
                <span className="font-medium text-emerald-600">
                  {prestadorPerfil.valor_pretendido ? formatCurrency(prestadorPerfil.valor_pretendido) : '—'}
                </span>
                <span className="text-gray-500">Vestimenta:</span>
                <span className="font-medium">{getVestimentaLabel(prestadorPerfil.vestimenta)}</span>
                <span className="text-gray-500">Negociação:</span>
                <span className="font-medium">{prestadorPerfil.aceita_negociacao ? 'Aceita' : 'Não aceita'}</span>
                <span className="text-gray-500">Serviços:</span>
                <span className="font-medium">{prestadorPerfil.total_servicos}</span>
              </div>
              {prestadorPerfil.descricao && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{prestadorPerfil.descricao}</p>
                </div>
              )}
              <button type="button" onClick={() => setShowAdicionarFuncao(true)}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium pt-2">
                <PlusCircle className="w-4 h-4" /> Adicionar mais funções
              </button>
              <AdicionarFuncaoModal open={showAdicionarFuncao} onClose={() => setShowAdicionarFuncao(false)} />
            </div>
          )}

          {/* Contratante-specific */}
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
              {contratantePerfil.descricao && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{contratantePerfil.descricao}</p>
                </div>
              )}
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

          <Link
            href="/perfil/editar"
            className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
          >
            <Edit className="w-5 h-5" /> Editar Perfil
          </Link>
        </div>

        <BottomNav />
      </div>
      )}
    </AuthProvider>
  );
}
