'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Search, Shield, Users, User, Eye, Ban, CheckCircle, ChevronDown, Plus, Edit2, Star, X, MessageSquare } from 'lucide-react';
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
  media_avaliacao?: number;
  total_avaliacoes?: number;
}

interface Avaliacao {
  id: string;
  nota: number;
  descricao?: string;
  created_at: string;
  matches?: { vagas?: { titulo?: string } };
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [popupUser, setPopupUser] = useState<UserRow | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);

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
      // Buscar users via API server-side (bypass RLS)
      const res = await fetch('/api/users/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const { data: users, error: usersError } = await res.json();

      if (usersError) throw new Error(usersError);
      setUsuarios(users || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirAvaliacoes = async (u: UserRow) => {
    setPopupUser(u);
    setAvaliacoes([]);
    setLoadingAvaliacoes(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/avaliacoes?user_id=${u.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setAvaliacoes(data.avaliacoes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  const toggleAtivo = async (userId: string, ativo: boolean) => {
    try {
      const res = await fetch('/api/users/query', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', userId, record: { ativo: !ativo } }),
      });
      const { error } = await res.json();
      if (error) throw new Error(error);
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
                          {u.media_avaliacao && u.media_avaliacao > 0 ? (
                            <button
                              onClick={() => abrirAvaliacoes(u)}
                              className="flex items-center gap-1 hover:opacity-75 transition-opacity cursor-pointer"
                              title="Ver comentários"
                            >
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              <span className="text-white font-medium">{u.media_avaliacao.toFixed(1)}</span>
                              {u.total_avaliacoes ? (
                                <span className="text-xs text-gray-500">({u.total_avaliacoes})</span>
                              ) : null}
                            </button>
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

      {/* Popup avaliações */}
      {popupUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPopupUser(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="font-bold text-white">{popupUser.nome}</h2>
                <p className="text-xs text-gray-400">Avaliações recebidas</p>
              </div>
              <button onClick={() => setPopupUser(null)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {loadingAvaliacoes ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : avaliacoes.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Nenhuma avaliação encontrada</p>
                </div>
              ) : avaliacoes.map((av) => (
                <div key={av.id} className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= av.nota ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">{new Date(av.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {av.matches?.vagas?.titulo && (
                    <p className="text-xs text-brand-400 mb-1">Vaga: {av.matches.vagas.titulo}</p>
                  )}
                  {av.descricao ? (
                    <p className="text-sm text-gray-300">{av.descricao}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Sem comentário</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
