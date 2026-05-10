'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Shield, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
}

export default function AdminAdminsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') {
        router.push('/');
        return;
      }
      fetchAdmins();
    }
  }, [user, authLoading]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', filters: { tipo: 'admin' } }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      setAdmins(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newEmail || newPassword.length < 6) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, nome: newName || 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Admin criado com sucesso!');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        fetchAdmins();
      } else {
        toast.error(data.error || 'Erro ao criar admin');
      }
    } catch (err: any) {
      toast.error('Erro ao criar admin');
    } finally {
      setCreating(false);
    }
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
                <Shield className="w-5 h-5 text-pink-400" />
                <h1 className="text-lg font-bold">Administradores</h1>
              </div>
              <span className="ml-auto text-sm text-gray-500">{admins.length} registros</span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Formulário */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400 mb-3">Adicionar novo administrador</p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="sm:col-span-3 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="sm:col-span-4 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="text"
                  placeholder="Senha (min 6)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="sm:col-span-3 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleCreate}
                  disabled={creating || !newEmail || newPassword.length < 6}
                  className="sm:col-span-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Criar
                </button>
              </div>
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Cadastro</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {admins.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-white">{a.nome}</td>
                        <td className="px-4 py-3 text-gray-400">{a.email}</td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                          {a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum admin encontrado</td>
                      </tr>
                    )}
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
