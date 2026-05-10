'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { getAuthToken } from '@/lib/supabase';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Save, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ESTADOS_BR } from '@/lib/types';
import type { Plano } from '@/lib/types';
import toast from 'react-hot-toast';

export default function AdminEditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: adminUser, loading: authLoading } = useAppStore();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    cpf_cnpj: '',
    celular: '',
    tipo: '',
    cidade: '',
    estado: '',
    plano_id: '',
    ativo: true,
  });

  useEffect(() => {
    if (!authLoading && adminUser) {
      if (adminUser.tipo !== 'admin') { router.push('/'); return; }
      fetchUser();
      fetchPlanos();
    }
  }, [adminUser, authLoading]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getById', userId }),
      });
      const { data, error } = await res.json();
      if (error) throw new Error(error);
      if (!data) throw new Error('Usuário não encontrado');
      setForm({
        nome: data.nome || '',
        email: data.email || '',
        password: '',
        cpf_cnpj: data.cpf_cnpj || '',
        celular: data.celular || '',
        tipo: data.tipo || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        plano_id: data.plano_id || '',
        ativo: data.ativo,
      });
    } catch (err: any) {
      toast.error('Erro ao carregar usuário');
      router.push('/admin/usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanos = async () => {
    try {
      const res = await fetch('/api/admin/planos');
      const data = await res.json();
      setPlanos((data.planos || []).filter((p: Plano) => p.ativo));
    } catch (err) {
      console.error(err);
    }
  };

  const updateForm = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const planosDoTipo = planos.filter((p) => p.tipo_usuario === form.tipo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.cpf_cnpj || !form.celular) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload: any = {
        id: userId,
        nome: form.nome,
        email: form.email,
        cpf_cnpj: form.cpf_cnpj,
        celular: form.celular,
        cidade: form.cidade || null,
        estado: form.estado || null,
        plano_id: form.plano_id || null,
        ativo: form.ativo,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Usuário atualizado!');
      router.push('/admin/usuarios');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthProvider>
      {(authLoading || loading) ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
              <Link href="/admin/usuarios" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Editar Usuário</h1>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h2 className="font-semibold mb-4">Dados do Usuário</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Nome completo *</label>
                    <input value={form.nome} onChange={(e) => updateForm('nome', e.target.value)} required
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Nova senha (deixe vazio para não alterar)</label>
                    <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} minLength={6}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                      placeholder="••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">CPF/CNPJ *</label>
                    <input value={form.cpf_cnpj} onChange={(e) => updateForm('cpf_cnpj', e.target.value)} required
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Celular *</label>
                    <input value={form.celular} onChange={(e) => updateForm('celular', e.target.value)} required
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Tipo</label>
                    <input value={form.tipo === 'prestador' ? 'Prestador' : form.tipo === 'contratante' ? 'Contratante' : 'Admin'} disabled
                      className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Cidade</label>
                    <input value={form.cidade} onChange={(e) => updateForm('cidade', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Estado</label>
                    <select value={form.estado} onChange={(e) => updateForm('estado', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500">
                      <option value="">Selecione</option>
                      {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.ativo} onChange={(e) => updateForm('ativo', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm font-medium text-gray-300">Usuário ativo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Plano */}
              {form.tipo !== 'admin' && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h2 className="font-semibold mb-4">Plano de Acesso</h2>
                  {planosDoTipo.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum plano cadastrado para este tipo.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button" onClick={() => updateForm('plano_id', '')}
                        className={`text-left p-4 rounded-xl border-2 transition-colors ${!form.plano_id ? 'border-gray-400 bg-gray-700/30' : 'border-gray-600 hover:border-gray-500'}`}>
                        <span className="font-semibold text-white">Sem plano</span>
                        <p className="text-xs text-gray-500">Acesso gratuito</p>
                      </button>
                      {planosDoTipo.map((plano) => (
                        <button key={plano.id} type="button"
                          onClick={() => updateForm('plano_id', plano.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-colors ${form.plano_id === plano.id ? 'border-brand-500 bg-brand-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
                          <span className="font-semibold text-white">{plano.nome}</span>
                          <p className="text-brand-400 font-bold">{formatCurrency(plano.valor)}</p>
                          <p className="text-xs text-gray-500">{plano.duracao_dias} dias</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
