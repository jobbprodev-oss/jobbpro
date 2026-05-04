'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Search, Briefcase, MapPin, Calendar, Trash2, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface VagaRow {
  id: string;
  titulo: string;
  funcao_principal: string;
  data: string;
  cidade?: string;
  valor_oferecido: number;
  ativa: boolean;
  vagas_disponiveis: number;
  vagas_preenchidas: number;
  created_at: string;
}

export default function AdminVagasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [vagas, setVagas] = useState<VagaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchVagas();
    }
  }, [user, authLoading]);

  const fetchVagas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vagas')
        .select('id, titulo, funcao_principal, data, cidade, valor_oferecido, ativa, vagas_disponiveis, vagas_preenchidas, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVagas(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const deletarVaga = async (vagaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;
    try {
      const { error } = await supabase.from('vagas').delete().eq('id', vagaId);
      if (error) throw error;
      setVagas((prev) => prev.filter((v) => v.id !== vagaId));
      toast.success('Vaga excluída');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  const filtradas = vagas.filter((v) => {
    if (filtro === 'ativas' && !v.ativa) return false;
    if (filtro === 'inativas' && v.ativa) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return v.titulo.toLowerCase().includes(termo) || v.funcao_principal.toLowerCase().includes(termo) || v.cidade?.toLowerCase().includes(termo);
    }
    return true;
  });

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h1 className="text-lg font-bold">Vagas</h1>
              </div>
              <span className="text-sm text-gray-500 ml-auto">{filtradas.length} registros</span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por título, função ou cidade..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="todas">Todas</option>
                <option value="ativas">Ativas</option>
                <option value="inativas">Inativas</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filtradas.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma vaga encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-medium">Título</th>
                      <th className="pb-3 font-medium">Função</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">Cidade</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Data</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Vagas</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtradas.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-800/50">
                        <td className="py-3 font-medium text-white max-w-[200px] truncate">{v.titulo}</td>
                        <td className="py-3 text-brand-400">{v.funcao_principal}</td>
                        <td className="py-3 text-gray-400 hidden sm:table-cell">{v.cidade || '—'}</td>
                        <td className="py-3 text-gray-400 hidden md:table-cell">{formatDate(v.data)}</td>
                        <td className="py-3 text-emerald-400 font-medium">{formatCurrency(v.valor_oferecido)}</td>
                        <td className="py-3 text-gray-400">{v.vagas_preenchidas > 0 ? 'Preenchida' : 'Disponível'}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v.ativa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {v.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/vagas/${v.id}`} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white" title="Ver">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button onClick={() => deletarVaga(v.id)} className="p-1.5 rounded-lg hover:bg-gray-700 text-red-400 hover:text-red-300" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
