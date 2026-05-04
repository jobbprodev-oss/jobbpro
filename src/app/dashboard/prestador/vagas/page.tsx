'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import VagaCard from '@/components/vaga-card';
import { Loader2, Search, Filter, MapPin } from 'lucide-react';
import { FUNCOES_DISPONIVEIS } from '@/lib/types';
import type { Vaga } from '@/lib/types';

export default function PrestadorVagasPage() {
  const { loading: authLoading } = useAppStore();
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFuncao, setFiltroFuncao] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVagas();
  }, []);

  const fetchVagas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vagas')
        .select('*')
        .eq('ativa', true)
        .gte('data', new Date().toISOString().split('T')[0])
        .order('data', { ascending: true });

      if (filtroFuncao) {
        query = query.or(`funcao_principal.ilike.%${filtroFuncao}%,funcao_2.ilike.%${filtroFuncao}%,funcao_3.ilike.%${filtroFuncao}%`);
      }
      if (filtroCidade) {
        query = query.ilike('cidade', `%${filtroCidade}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVagas(data || []);
    } catch (err) {
      console.error('Erro ao buscar vagas:', err);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    fetchVagas();
    setShowFilters(false);
  };

  const limparFiltros = () => {
    setFiltroFuncao('');
    setFiltroCidade('');
    setShowFilters(false);
    setTimeout(fetchVagas, 0);
  };

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Buscar Vagas" />

          <div className="page-container">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  showFilters || filtroFuncao || filtroCidade
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {(filtroFuncao || filtroCidade) && (
                  <span className="w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
                    {(filtroFuncao ? 1 : 0) + (filtroCidade ? 1 : 0)}
                  </span>
                )}
              </button>
              <span className="text-sm text-gray-400 ml-auto">{vagas.length} vagas encontradas</span>
            </div>

            {showFilters && (
              <div className="card p-4 mb-4 space-y-3 animate-slide-up">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Função</label>
                  <select
                    value={filtroFuncao}
                    onChange={(e) => setFiltroFuncao(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Todas as funções</option>
                    {FUNCOES_DISPONIVEIS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filtroCidade}
                      onChange={(e) => setFiltroCidade(e.target.value)}
                      placeholder="Filtrar por cidade"
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={aplicarFiltros} className="btn-primary flex-1 text-sm py-2.5">
                    Aplicar
                  </button>
                  <button onClick={limparFiltros} className="btn-secondary flex-1 text-sm py-2.5">
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : vagas.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma vaga encontrada</p>
                <p className="text-gray-400 text-sm mt-1">Tente alterar os filtros</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vagas.map((vaga) => (
                  <VagaCard key={vaga.id} vaga={vaga as any} />
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
