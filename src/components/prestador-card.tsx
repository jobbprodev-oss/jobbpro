'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DollarSign, Star, Briefcase } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MatchResult, PrestadorCompativel } from '@/lib/types';

interface PrestadorCardProps {
  prestador: MatchResult | PrestadorCompativel;
  onContratar?: () => void;
  showMatch?: boolean;
}

export default function PrestadorCard({ prestador, onContratar, showMatch = false }: PrestadorCardProps) {
  return (
    <div className="card-hover p-4 animate-slide-up">
      <div className="flex gap-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {prestador.foto_url ? (
            <Image
              src={prestador.foto_url}
              alt={prestador.nome}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-600 font-bold text-xl">
                {prestador.nome.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <Link href={`/perfil/${prestador.user_id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                {prestador.nome}
              </Link>
              <div className="flex items-center gap-1 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500">{prestador.funcao_principal}</span>
              </div>
            </div>
            {showMatch && (
              <span className="badge bg-emerald-50 text-emerald-700">
                {Math.round(prestador.match_score)}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700">
                {prestador.media_avaliacao > 0 ? prestador.media_avaliacao.toFixed(1) : 'Novo'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <DollarSign className="w-4 h-4" />
              {formatCurrency(prestador.valor_pretendido)}
            </div>
          </div>
        </div>
      </div>

      {onContratar && (
        <button onClick={onContratar} className="btn-primary w-full mt-3 text-sm py-2.5">
          Contratar
        </button>
      )}
    </div>
  );
}
