'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import DisponibilidadePagamentoModal from '@/components/disponibilidade-pagamento-modal';
import { formatDate, formatTime } from '@/lib/utils';
import type { Disponibilidade } from '@/lib/types';
import toast from 'react-hot-toast';

export default function DisponibilidadePage() {
  const { prestadorPerfil, loading: authLoading } = useAppStore();
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const [novaData, setNovaData] = useState('');
  const [novaInicio, setNovaInicio] = useState('08:00');
  const [novaFim, setNovaFim] = useState('18:00');

  useEffect(() => {
    if (prestadorPerfil) fetchDisponibilidades();
  }, [prestadorPerfil]);

  const fetchDisponibilidades = async () => {
    if (!prestadorPerfil) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('disponibilidades')
        .select('*')
        .eq('prestador_id', prestadorPerfil.id)
        .gte('data', new Date().toISOString().split('T')[0])
        .order('data', { ascending: true });
      if (error) throw error;
      setDisponibilidades(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const adicionarDisponibilidade = () => {
    if (!novaData) {
      toast.error('Selecione uma data');
      return;
    }
    if (novaInicio >= novaFim) {
      toast.error('Horário de início deve ser anterior ao fim');
      return;
    }
    setShowPagamentoModal(true);
  };

  const removerDisponibilidade = async (id: string) => {
    try {
      const { error } = await supabase.from('disponibilidades').delete().eq('id', id);
      if (error) throw error;
      setDisponibilidades((prev) => prev.filter((d) => d.id !== id));
      toast.success('Removida');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover');
    }
  };

  const hoje = new Date().toISOString().split('T')[0];

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Disponibilidade" />

          <div className="page-container">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{disponibilidades.length} datas cadastradas</p>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {showForm && (
              <div className="card p-4 mb-4 space-y-3 animate-slide-up">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Data *</label>
                  <input
                    type="date"
                    value={novaData}
                    min={hoje}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Início</label>
                    <input
                      type="time"
                      value={novaInicio}
                      onChange={(e) => setNovaInicio(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fim</label>
                    <input
                      type="time"
                      value={novaFim}
                      onChange={(e) => setNovaFim(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={adicionarDisponibilidade}
                    disabled={salvando}
                    className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-1"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1 text-sm py-2.5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : disponibilidades.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma disponibilidade</p>
                <p className="text-gray-400 text-sm mt-1">Adicione suas datas disponíveis para receber matches</p>
              </div>
            ) : (
              <div className="space-y-2">
                {disponibilidades.map((d) => (
                  <div key={d.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{formatDate(d.data)}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatTime(d.horario_inicio)} - {formatTime(d.horario_fim)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removerDisponibilidade(d.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <BottomNav />

          <DisponibilidadePagamentoModal
            isOpen={showPagamentoModal}
            onClose={() => setShowPagamentoModal(false)}
            data={novaData}
            horario_inicio={novaInicio}
            horario_fim={novaFim}
            onSuccess={() => {
              setNovaData('');
              setNovaInicio('08:00');
              setNovaFim('18:00');
              setShowForm(false);
              fetchDisponibilidades();
            }}
          />
        </div>
      )}
    </AuthProvider>
  );
}
