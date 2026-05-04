'use client';

import Link from 'next/link';
import { MapPin, Clock, Calendar, DollarSign, Shirt } from 'lucide-react';
import { formatCurrency, formatDate, formatTime, getVestimentaLabel } from '@/lib/utils';
import type { VagaCompativel, Vaga } from '@/lib/types';

interface VagaCardProps {
  vaga: VagaCompativel | Vaga;
  showMatch?: boolean;
}

export default function VagaCard({ vaga, showMatch = false }: VagaCardProps) {
  const isCompativel = 'match_score' in vaga;
  const vagaId = isCompativel ? (vaga as VagaCompativel).vaga_id : (vaga as Vaga).id;
  const valor = isCompativel ? (vaga as VagaCompativel).valor_oferecido : (vaga as Vaga).valor_oferecido;

  return (
    <Link href={`/vagas/${vagaId}`} className="card-hover block p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base">
            {isCompativel ? (vaga as VagaCompativel).titulo : (vaga as Vaga).titulo}
          </h3>
          <p className="text-sm text-brand-600 font-medium">{vaga.funcao_principal}</p>
        </div>
        {showMatch && isCompativel ? (
          <div className="bg-emerald-50 text-emerald-700 badge">
            {Math.round((vaga as VagaCompativel).match_score)}% match
          </div>
        ) : !isCompativel && (
          <span className={`badge text-xs ${
            !(vaga as Vaga).ativa ? 'bg-gray-100 text-gray-500' :
            new Date(vaga.data + 'T23:59:59') < new Date() ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            {!(vaga as Vaga).ativa ? 'Inativa' : new Date(vaga.data + 'T23:59:59') < new Date() ? 'Pendente' : 'Ativa'}
          </span>
        )}
      </div>

      <div className="space-y-1.5 mt-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{formatDate(vaga.data)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatTime(vaga.horario_inicio)} - {formatTime(vaga.horario_fim)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {isCompativel
              ? [(vaga as VagaCompativel).cidade, (vaga as VagaCompativel).bairro].filter(Boolean).join(', ')
              : (vaga as Vaga).cidade ? [(vaga as Vaga).cidade, (vaga as Vaga).bairro].filter(Boolean).join(', ') : (vaga as Vaga).local_servico}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shirt className="w-4 h-4 flex-shrink-0" />
          <span>{getVestimentaLabel(vaga.vestimenta)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-lg font-bold text-emerald-600">
          <DollarSign className="w-5 h-5" />
          {formatCurrency(valor)}
        </div>
        {isCompativel && (vaga as VagaCompativel).contratante_nome && (
          <span className="text-xs text-gray-400">
            por {(vaga as VagaCompativel).contratante_nome}
          </span>
        )}
      </div>
    </Link>
  );
}
