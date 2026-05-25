'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Search, ClipboardList, Eye } from 'lucide-react';
import { formatDate, formatCurrency, getMatchStatusLabel, getMatchStatusColor } from '@/lib/utils';

interface MatchRow {
  id: string;
  status: string;
  match_score: number;
  valor_acordado?: number;
  created_at: string;
  data_aceite?: string;
  data_conclusao?: string;
  vagas: { titulo: string; funcao_principal: string };
  prestador_perfil: { funcao_principal: string; users: { nome: string } };
  contratante_perfil: { nome_empresa?: string; users: { nome: string } };
}

export default function AdminMatchesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchMatches();
    }
  }, [user, authLoading]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/matches', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = matches.filter((m) => {
    if (filtro !== 'todos' && m.status !== filtro) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return (
        m.vagas?.titulo?.toLowerCase().includes(termo) ||
        m.prestador_perfil?.users?.nome?.toLowerCase().includes(termo) ||
        m.contratante_perfil?.users?.nome?.toLowerCase().includes(termo)
      );
    }
    return true;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pendente: 'bg-yellow-500/20 text-yellow-400',
      aceito: 'bg-emerald-500/20 text-emerald-400',
      confirmado: 'bg-teal-500/20 text-teal-400',
      concluido: 'bg-blue-500/20 text-blue-400',
      recusado: 'bg-red-500/20 text-red-400',
      cancelado: 'bg-gray-500/20 text-gray-400',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
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
                <ClipboardList className="w-5 h-5 text-yellow-400" />
                <h1 className="text-lg font-bold">Matches</h1>
              </div>
              <span className="text-sm text-gray-500 ml-auto">{filtrados.length} registros</span>
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
                  placeholder="Buscar por vaga, prestador ou contratante..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="aceito">Aceitos</option>
                <option value="confirmado">Confirmados</option>
                <option value="concluido">Concluídos</option>
                <option value="recusado">Recusados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-20">
                <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum match encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-medium">Vaga</th>
                      <th className="pb-3 font-medium">Prestador</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">Contratante</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Data</th>
                      <th className="pb-3 font-medium">Status</th>
                      {/* Coluna Ações oculta */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtrados.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-800/50">
                        <td className="py-3">
                          <p className="font-medium text-white truncate max-w-[180px]">{m.vagas?.titulo || '—'}</p>
                          <p className="text-xs text-gray-500">{m.vagas?.funcao_principal}</p>
                        </td>
                        <td className="py-3 text-gray-300">{m.prestador_perfil?.users?.nome || '—'}</td>
                        <td className="py-3 text-gray-400 hidden sm:table-cell">{m.contratante_perfil?.users?.nome || '—'}</td>
                        <td className="py-3 text-brand-400 font-medium">
                          {m.match_score !== null && m.match_score !== undefined ? `${Math.round(m.match_score)}%` : '—'}
                        </td>
                        <td className="py-3 text-gray-500 hidden md:table-cell">{formatDate(m.created_at.split('T')[0])}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(m.status)}`}>
                            {getMatchStatusLabel(m.status)}
                          </span>
                        </td>
                        {/* Coluna Ações oculta */}
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
