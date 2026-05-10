'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Search, Shield, Users, User, Eye, Ban, CheckCircle, ChevronDown, Plus, Edit2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserRow {
  id: string;
  tipo: string;
  nome: string;
  email: string;
  celular: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
  created_at: string;
  avaliacao?: number;
  total_avaliacoes?: number;
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') {
        router.push('/');
        return;
      }
      fetchUsuarios();
    }
  }, [user, authLoading]);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      // First fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, tipo, nome, email, celular, cidade, estado, ativo, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      
      // Then fetch ratings for users with profiles
      const userIds = (users || []).map(u => u.id);
      if (userIds.length === 0) {
        setUsuarios([]);
        return;
      }
      
      const { data: prestadorRatings } = await supabase
        .from('prestador_perfil')
        .select('id, user_id, avaliacao, total_avaliacoes')
        .in('user_id', userIds);
        
      const { data: contratanteRatings } = await supabase
        .from('contratante_perfil')
        .select('id, user_id, avaliacao, total_avaliacoes')
        .in('user_id', userIds);
      
      // Process ratings
      const processedData = (users || []).map(user => {
        const prestadorRating = prestadorRatings?.find(r => r.user_id === user.id);
        const contratanteRating = contratanteRatings?.find(r => r.user_id === user.id);
        const rating = prestadorRating || contratanteRating;
        
        return {
          ...user,
          avaliacao: rating?.avaliacao,
          total_avaliacoes: rating?.total_avaliacoes,
        };
      });
      
      setUsuarios(processedData);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (userId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ativo: !ativo })
        .eq('id', userId);
      if (error) throw error;
      setUsuarios((prev) => prev.map((u) => u.id === userId ? { ...u, ativo: !ativo } : u));
      toast.success(ativo ? 'Usuário desativado' : 'Usuário ativado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  const filtrados = usuarios.filter((u) => {
    if (filtro !== 'todos' && u.tipo !== filtro) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return u.nome.toLowerCase().includes(termo) || u.email?.toLowerCase().includes(termo) || u.celular?.includes(termo);
    }
    return true;
  });

  const tipoLabel = (tipo: string) => {
    const map: Record<string, string> = { prestador: 'Prestador', contratante: 'Contratante', admin: 'Admin' };
    return map[tipo] || tipo;
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, string> = {
      prestador: 'bg-blue-500/20 text-blue-400',
      contratante: 'bg-violet-500/20 text-violet-400',
      admin: 'bg-red-500/20 text-red-400',
    };
    return map[tipo] || 'bg-gray-500/20 text-gray-400';
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
                <Users className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Usuários</h1>
              </div>
              <Link href="/admin/usuarios/novo" className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Novo Usuário
              </Link>
              <span className="text-sm text-gray-500">{filtrados.length} registros</span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, email ou celular..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="todos">Todos</option>
                <option value="prestador">Prestadores</option>
                <option value="contratante">Contratantes</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-3 font-medium">Nome</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Cidade</th>
                      <th className="pb-3 font-medium">Avaliação</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Cadastro</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filtrados.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-800/50">
                        <td className="py-3">
                          <p className="font-medium text-white">{u.nome}</p>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge(u.tipo)}`}>
                            {tipoLabel(u.tipo)}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 hidden sm:table-cell">{u.email || '—'}</td>
                        <td className="py-3 text-gray-400 hidden md:table-cell">
                          {u.cidade ? `${u.cidade}${u.estado ? `/${u.estado}` : ''}` : '—'}
                        </td>
                        <td className="py-3">
                          {u.avaliacao ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400">⭐</span>
                              <span className="text-white font-medium">{u.avaliacao.toFixed(1)}</span>
                              {u.total_avaliacoes && (
                                <span className="text-xs text-gray-500">({u.total_avaliacoes})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 hidden md:table-cell">{formatDate(u.created_at.split('T')[0])}</td>
                        <td className="py-3">
                          {u.ativo ? (
                            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs font-medium flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" /> Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/perfil/${u.id}`}
                              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
                              title="Ver perfil"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/admin/usuarios/${u.id}/editar`}
                              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            {u.tipo !== 'admin' && (
                              <button
                                onClick={() => toggleAtivo(u.id, u.ativo)}
                                className={`p-1.5 rounded-lg hover:bg-gray-700 ${u.ativo ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                                title={u.ativo ? 'Desativar' : 'Ativar'}
                              >
                                {u.ativo ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                            )}
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
