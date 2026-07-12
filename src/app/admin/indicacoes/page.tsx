'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Search, Users2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Indicacao {
  id: string;
  nome: string;
  tipo: 'prestador' | 'contratante';
  email: string;
  celular: string;
  indicacao_nome: string;
  indicacao_telefone: string;
  created_at: string;
}

export default function AdminIndicacoesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchIndicacoes();
    }
  }, [user, authLoading]);

  const fetchIndicacoes = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/indicacoes', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIndicacoes(data.indicacoes || []);
    } catch (err) {
      console.error('Erro ao carregar indicações:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtradas = indicacoes.filter((i) => {
    if (filtroTipo !== 'todos' && i.tipo !== filtroTipo) return false;
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      i.indicacao_nome?.toLowerCase().includes(termo) ||
      i.nome?.toLowerCase().includes(termo) ||
      i.email?.toLowerCase().includes(termo) ||
      i.celular?.includes(termo) ||
      i.indicacao_telefone?.includes(termo)
    );
  });

  const formatPhone = (phone: string) => {
    if (!phone) return '—';
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

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
                <Users2 className="w-5 h-5 text-pink-400" />
                <h1 className="text-lg font-bold">Indicações</h1>
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
                  placeholder="Buscar por nome, quem indicou ou contato..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="todos">Todos</option>
                <option value="prestador">Prestadores</option>
                <option value="contratante">Contratantes</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filtradas.length === 0 ? (
              <div className="text-center py-20">
                <Users2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma indicação encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-medium">Quem indicou</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium">Nome do indicado</th>
                      <th className="pb-3 font-medium">Contato do indicado</th>
                      <th className="pb-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtradas.map((i) => (
                      <tr key={i.id} className="hover:bg-gray-800/50">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white">{i.indicacao_nome || '—'}</p>
                          {i.indicacao_telefone && (
                            <p className="text-xs text-gray-500 mt-0.5">{formatPhone(i.indicacao_telefone)}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            i.tipo === 'prestador'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-violet-500/20 text-violet-400'
                          }`}>
                            {i.tipo === 'prestador' ? 'Prestador' : 'Contratante'}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{i.nome || '—'}</td>
                        <td className="py-3 pr-4">
                          {i.email && <p className="text-gray-300">{i.email}</p>}
                          {i.celular && (
                            <p className="text-xs text-gray-500 mt-0.5">{formatPhone(i.celular)}</p>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(i.created_at.split('T')[0])}
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
