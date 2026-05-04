'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import VagaCard from '@/components/vaga-card';
import AuthProvider from '@/components/auth-provider';
import { Briefcase, Clock, CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import type { VagaCompativel } from '@/lib/types';

export default function DashboardPrestadorPage() {
  const { user, prestadorPerfil, loading: authLoading } = useAppStore();
  const [vagas, setVagas] = useState<VagaCompativel[]>([]);
  const [loading, setLoading] = useState(true);
  const [disponivel, setDisponivel] = useState(true);

  useEffect(() => {
    if (prestadorPerfil) {
      setDisponivel(prestadorPerfil.disponivel);
      fetchVagas();
    }
  }, [prestadorPerfil]);

  const fetchVagas = async () => {
    if (!prestadorPerfil) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('buscar_vagas_compativeis', {
        prestador_uuid: prestadorPerfil.id,
      });
      if (error) throw error;
      setVagas(data || []);
    } catch (err) {
      console.error('Erro ao buscar vagas:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDisponibilidade = async () => {
    if (!prestadorPerfil) return;
    const newVal = !disponivel;
    setDisponivel(newVal);
    await supabase
      .from('prestador_perfil')
      .update({ disponivel: newVal })
      .eq('id', prestadorPerfil.id);
  };

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
      <div className="min-h-screen bg-gray-50">
        <Header title="Início" />

        <div className="page-container">
          {/* Status */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Olá,</p>
                <h2 className="text-lg font-bold text-gray-900">{user?.nome?.split(' ')[0]}</h2>
              </div>
              <button
                onClick={toggleDisponibilidade}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  disponivel
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {disponivel ? (
                  <><CheckCircle className="w-4 h-4" /> Disponível</>
                ) : (
                  <><XCircle className="w-4 h-4" /> Indisponível</>
                )}
              </button>
            </div>

            {prestadorPerfil && (
              <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span>{prestadorPerfil.funcao_principal}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{prestadorPerfil.total_servicos} serviços</span>
                </div>
              </div>
            )}
          </div>

          {/* Vagas compatíveis */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-title mb-0">Vagas para você</h3>
            <span className="text-sm text-gray-400">{vagas.length} encontradas</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : vagas.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma vaga compatível no momento</p>
              <p className="text-gray-400 text-sm mt-1">Configure sua disponibilidade para receber matches</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vagas.map((vaga) => (
                <VagaCard key={vaga.vaga_id} vaga={vaga} showMatch />
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
      )}
    </AuthProvider>
  );
}
