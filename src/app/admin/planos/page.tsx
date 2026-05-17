'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getAuthToken } from '@/lib/supabase';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Plus, CreditCard, Edit2, Trash2, X, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Plano, PlanoCategoria } from '@/lib/types';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  nome: '',
  descricao: '',
  valor: '',
  duracao_dias: '30',
  duracao_horas: '24',
  tipo_usuario: 'prestador' as string,
  categoria: 'servico' as string,
  recursos: '',
};

export default function AdminPlanosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | PlanoCategoria>('todos');

  const planosFiltrados = filtroCategoria === 'todos'
    ? planos
    : planos.filter((p) => (p.categoria ?? 'servico').trim().toLowerCase() === filtroCategoria);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchPlanos();
    }
  }, [user, authLoading]);

  const fetchPlanos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/planos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlanos(data.planos || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNew = (cat?: string) => {
    const categoria = cat || (filtroCategoria !== 'todos' ? filtroCategoria : 'servico');
    setForm({ ...EMPTY_FORM, categoria });
    setEditingId(null);
    setShowForm(true);
  };

  const isPlanoUnico = editingId
    ? ['cadastro', 'funcao'].includes(planos.find((p) => p.id === editingId)?.categoria ?? '')
    : false;

  const openEdit = (plano: Plano) => {
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || '',
      valor: String(plano.valor),
      duracao_dias: String(plano.duracao_dias),
      duracao_horas: String(plano.duracao_horas ?? 24),
      tipo_usuario: plano.tipo_usuario,
      categoria: plano.categoria || 'servico',
      recursos: (plano.recursos || []).join(', '),
    });
    setEditingId(plano.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.valor || !form.duracao_dias) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        nome: form.nome,
        descricao: form.descricao || null,
        valor: parseFloat(form.valor),
        duracao_dias: parseInt(form.duracao_dias),
        duracao_horas: form.categoria === 'servico' ? parseInt(form.duracao_horas) : null,
        tipo_usuario: form.tipo_usuario,
        categoria: form.categoria,
        recursos: form.recursos ? form.recursos.split(',').map((r) => r.trim()).filter(Boolean) : [],
      };

      const res = await fetch('/api/admin/planos', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingId ? 'Plano atualizado!' : 'Plano criado!');
      setShowForm(false);
      fetchPlanos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Desativar este plano?')) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/planos?id=${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Erro ao desativar');
      toast.success('Plano desativado');
      fetchPlanos();
    } catch (err: any) {
      toast.error(err.message);
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
                <CreditCard className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Planos</h1>
              </div>
              {(filtroCategoria === 'servico' ||
                (['cadastro', 'funcao'].includes(filtroCategoria) && planosFiltrados.length === 0)
              ) && (
                <button
                  onClick={() => openNew()}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {filtroCategoria === 'servico' ? 'Novo Plano' : 'Criar Plano'}
                </button>
              )}
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Filtro por Categoria */}
            <div className="flex gap-2 mb-6">
              {[
                {v: 'todos', l: 'Todos'},
                {v: 'servico', l: 'Planos de Serviço'},
                {v: 'cadastro', l: 'Planos de Cadastro'},
                {v: 'funcao', l: 'Compra de Função'},
              ].map(({v, l}) => (
                <button key={v} onClick={() => setFiltroCategoria(v as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filtroCategoria === v ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {/* Modal Form */}
            {showForm && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">{editingId ? 'Editar Plano' : 'Novo Plano'}</h2>
                    <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Nome *</label>
                      <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" placeholder="Ex: Plano Básico" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Descrição</label>
                      <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 h-20 resize-none" placeholder="Descrição do plano..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Valor (R$) *</label>
                        <input type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
                          className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                      </div>
                      {form.categoria === 'servico' ? (
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-1 block">Validade (horas) *</label>
                          <input type="number" min="1" value={form.duracao_horas} onChange={(e) => setForm({ ...form, duracao_horas: e.target.value })}
                            className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                            placeholder="Ex: 24, 36, 72" />
                        </div>
                      ) : (
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-1 block">Duração (dias) *</label>
                          <input type="number" min="1" value={form.duracao_dias} onChange={(e) => setForm({ ...form, duracao_dias: e.target.value })}
                            className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Tipo de Usuário *</label>
                        <select value={form.tipo_usuario} onChange={(e) => setForm({ ...form, tipo_usuario: e.target.value })}
                          disabled={isPlanoUnico}
                          className={`w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 ${isPlanoUnico ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <option value="prestador">Prestador</option>
                          <option value="contratante">Contratante</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-1 block">Categoria</label>
                        <select
                          value={form.categoria}
                          onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                          disabled={isPlanoUnico}
                          className={`w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 ${isPlanoUnico ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="servico">Plano de Serviço</option>
                          <option value="cadastro">Plano de Cadastro</option>
                          <option value="funcao">Compra de Função</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Recursos (separados por vírgula)</label>
                      <input value={form.recursos} onChange={(e) => setForm({ ...form, recursos: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                        placeholder="Ex: Vagas ilimitadas, Destaque no perfil" />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {editingId ? 'Salvar' : 'Criar'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista */}
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-500" /></div>
            ) : planosFiltrados.length === 0 ? (
              <div className="text-center py-20">
                <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum plano encontrado</p>
                <button onClick={() => openNew()} className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors">
                  Criar plano
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planosFiltrados.map((plano) => (
                  <div key={plano.id} className={`bg-gray-800 border rounded-xl p-5 ${plano.ativo ? 'border-gray-700' : 'border-red-900/50 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white">{plano.nome}</h3>
                        <div className="flex gap-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plano.tipo_usuario === 'prestador' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'}`}>
                            {plano.tipo_usuario === 'prestador' ? 'Prestador' : 'Contratante'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            (plano.categoria || 'servico') === 'cadastro' ? 'bg-amber-500/20 text-amber-400' :
                            (plano.categoria) === 'funcao' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {{
                        'cadastro': 'Cadastro',
                        'servico': 'Serviço',
                        'funcao': 'Compra de Função',
                      }[(plano.categoria || 'servico')] ?? 'Serviço'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(plano)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Ícone de exclusão oculto */}
                      </div>
                    </div>
                    {plano.descricao && <p className="text-sm text-gray-400 mb-3">{plano.descricao}</p>}
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-brand-400">{formatCurrency(plano.valor)}</span>
                      <span className="text-xs text-gray-500">
                        {(plano.categoria || 'servico') === 'servico' && plano.duracao_horas
                          ? `/ ${plano.duracao_horas}h`
                          : `/ ${plano.duracao_dias} dias`}
                      </span>
                    </div>
                    {plano.recursos && plano.recursos.length > 0 && (
                      <ul className="space-y-1 mt-3 pt-3 border-t border-gray-700">
                        {plano.recursos.map((r, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!plano.ativo && <p className="text-xs text-red-400 mt-3 font-medium">Desativado</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
