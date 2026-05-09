'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Calendar, Clock, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Disponibilidade } from '@/lib/types';

interface DisponibilidadeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  vagaData: string;
  vagaHorarioInicio: string;
  vagaHorarioFim: string;
  onConfirm: () => void;
}

export default function DisponibilidadeCheckModal({
  isOpen,
  onClose,
  vagaData,
  vagaHorarioInicio,
  vagaHorarioFim,
  onConfirm,
}: DisponibilidadeCheckModalProps) {
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [temDisponibilidade, setTemDisponibilidade] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkDisponibilidade();
    }
  }, [isOpen]);

  const checkDisponibilidade = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Buscar perfil do prestador
      const { data: perfil } = await supabase
        .from('prestador_perfil')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!perfil) {
        toast.error('Perfil não encontrado');
        return;
      }

      // Buscar disponibilidades na data da vaga
      const { data: dispData, error } = await supabase
        .from('disponibilidades')
        .select('*')
        .eq('prestador_id', perfil.id)
        .eq('data', vagaData)
        .eq('disponivel', true);

      if (error) throw error;

      setDisponibilidades(dispData || []);

      // Verificar se há disponibilidade compatível
      const vagaInicio = new Date(`${vagaData}T${vagaHorarioInicio}`);
      const vagaFim = new Date(`${vagaData}T${vagaHorarioFim}`);

      const temDisponibilidadeCompativel = dispData?.some(disp => {
        const dispInicio = new Date(`${disp.data}T${disp.horario_inicio}`);
        const dispFim = new Date(`${disp.data}T${disp.horario_fim}`);
        
        // Verifica se o horário da vaga está DENTRO do horário de disponibilidade
        return (
          vagaInicio >= dispInicio && 
          vagaFim <= dispFim
        );
      });

      setTemDisponibilidade(temDisponibilidadeCompativel && (dispData?.length || 0) > 0);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Verificar Disponibilidade</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Vaga selecionada</p>
            <p className="font-medium text-gray-900">
              {new Date(vagaData + 'T00:00:00').toLocaleDateString('pt-BR')} • {vagaHorarioInicio} - {vagaHorarioFim}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Verificando sua disponibilidade...</p>
            </div>
          ) : temDisponibilidade ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-emerald-900">Você está disponível!</p>
                  <p className="text-sm text-emerald-700">Encontramos disponibilidade compatível com esta vaga.</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Suas disponibilidades neste dia:</p>
                {disponibilidades.map((disp) => (
                  <div key={disp.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {disp.horario_inicio} - {disp.horario_fim}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="btn-primary w-full"
              >
                Confirmar Interesse na Vaga
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">Sem disponibilidade</p>
                  <p className="text-sm text-amber-700">
                    {disponibilidades.length === 0 
                      ? 'Você não cadastrou nenhuma disponibilidade para este dia.'
                      : 'Nenhuma de suas disponibilidades é compatível com o horário desta vaga.'
                    }
                  </p>
                </div>
              </div>

              {disponibilidades.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Suas disponibilidades neste dia:</p>
                  {disponibilidades.map((disp) => (
                    <div key={disp.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {disp.horario_inicio} - {disp.horario_fim}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Para se interessar em vagas, cadastre sua disponibilidade no painel do prestador.
                </p>
              </div>

              <button
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
