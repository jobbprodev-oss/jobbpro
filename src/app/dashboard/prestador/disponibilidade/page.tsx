'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, Plus, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
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

  const hoje = new Date().toISOString().split('T')[0];
  const [novaData, setNovaData] = useState(hoje);

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
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDisponibilidades(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const isExpirada = (d: Disponibilidade) => {
    if (d.expires_at) return new Date(d.expires_at) < new Date();
    return new Date(d.data + 'T23:59:59') < new Date();
  };

  const formatExpiry = (d: Disponibilidade) => {
    if (!d.expires_at) return null;
    const exp = new Date(d.expires_at);
    return exp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const adicionarDisponibilidade = () => {
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

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Disponibilidade" />

        {authLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div className="page-container">
            <div className="card p-4 mb-4 bg-brand-50 border border-brand-100">
              <p className="text-sm text-brand-700">Cadastre sua disponibilidade. O prazo de validade será definido automaticamente conforme o plano selecionado.</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{disponibilidades.length} disponibilidade(s) cadastrada(s)</p>
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
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Data da disponibilidade</label>
                  <input
                    type="date"
                    value={novaData}
                    readOnly
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">A data é sempre a data atual</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={adicionarDisponibilidade}
                    disabled={salvando}
                    className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-1"
                  >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {salvando ? 'Salvando...' : 'Salvar disponibilidade'}
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
                <p className="text-gray-400 text-sm mt-1">Adicione sua disponibilidade para receber matches</p>
              </div>
            ) : (
              <div className="space-y-2">
                {disponibilidades.map((d) => {
                  const expirada = isExpirada(d);
                  const expiry = formatExpiry(d);
                  return (
                    <div key={d.id} className={`card p-4 flex items-center justify-between ${expirada ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${expirada ? 'bg-red-50' : 'bg-brand-50'}`}>
                          {expirada
                            ? <AlertCircle className="w-5 h-5 text-red-400" />
                            : <Calendar className="w-5 h-5 text-brand-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {formatDate(d.data)} às {d.horario_inicio}
                          </p>
                          {expirada ? (
                            <p className="text-xs text-red-500 font-medium">Expirada</p>
                          ) : expiry ? (
                            <p className="text-xs text-gray-400">Válido até {expiry}</p>
                          ) : null}
                        </div>
                      </div>
                      <button
                        onClick={() => removerDisponibilidade(d.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <BottomNav />

        <DisponibilidadePagamentoModal
          isOpen={showPagamentoModal}
          onClose={() => setShowPagamentoModal(false)}
          onSuccess={() => {
            setShowForm(false);
            setShowPagamentoModal(false);
            fetchDisponibilidades();
          }}
        />
      </div>
    </AuthProvider>
  );
}
