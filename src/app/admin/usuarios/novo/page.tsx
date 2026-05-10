'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getAuthToken, supabase, uploadImage } from '@/lib/supabase';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, UserPlus, Check, Upload, FileText, X, PlusCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FUNCOES_DISPONIVEIS, ESTADOS_BR } from '@/lib/types';
import type { Plano } from '@/lib/types';
import SearchableSelect from '@/components/searchable-select';
import SolicitarFuncaoModal from '@/components/solicitar-funcao-modal';
import toast from 'react-hot-toast';

export default function AdminNovoUsuarioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [saving, setSaving] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [showSolicitarFuncao, setShowSolicitarFuncao] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    password: '',
    cpf_cnpj: '',
    celular: '',
    tipo: 'prestador',
    cidade: '',
    estado: '',
    plano_id: '',
    funcao_principal: '',
    funcao_2: '',
    funcao_3: '',
    nome_empresa: '',
  });

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchPlanos();
    }
  }, [user, authLoading]);

  const fetchPlanos = async () => {
    try {
      const res = await fetch('/api/admin/planos');
      const data = await res.json();
      setPlanos((data.planos || []).filter((p: Plano) => p.ativo));
    } catch (err) {
      console.error(err);
    }
  };

  const updateForm = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const planosDoTipo = planos.filter((p) => p.tipo_usuario === form.tipo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.password || !form.cpf_cnpj || !form.celular) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!docFile) {
      toast.error('Foto do documento é obrigatória');
      return;
    }
    setSaving(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          ...form,
          plano_id: form.plano_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Upload documento se fornecido
      if (docFile && data.user?.id) {
        const fileExt = docFile.name.split('.').pop();
        const fileName = `${data.user.id}/documento_${Date.now()}.${fileExt}`;
        const { error: upErr } = await supabase.storage.from('documentos').upload(fileName, docFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);
          await fetch('/api/users/query', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', userId: data.user.id, record: { foto_documento_url: urlData.publicUrl } }),
          });
        }
      }

      toast.success('Usuário criado com sucesso!');
      router.push('/admin/usuarios');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPlano = planos.find((p) => p.id === form.plano_id);

  return (
    <AuthProvider>
      {authLoading ? (
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
                <UserPlus className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Novo Usuário</h1>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados básicos */}
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
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Senha *</label>
                    <input type="password" value={form.password} onChange={(e) => updateForm('password', e.target.value)} required minLength={6}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
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
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Tipo de Usuário *</label>
                    <select value={form.tipo} onChange={(e) => { updateForm('tipo', e.target.value); updateForm('plano_id', ''); }}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500">
                      <option value="prestador">Prestador</option>
                      <option value="contratante">Contratante</option>
                    </select>
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
                </div>
              </div>

              {/* Documento RG/CNH */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h2 className="font-semibold mb-4">Documento (RG ou CNH) *</h2>
                <p className="text-sm text-gray-400 mb-3">Envie uma foto ou PDF do documento de identificação. <span className="text-red-400">(Obrigatório)</span></p>
                {docFile ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-600 rounded-lg">
                    <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{docFile.name}</p>
                      <p className="text-xs text-gray-500">{(docFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {docPreview && docFile.type.startsWith('image/') && (
                      <img src={docPreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    )}
                    <button type="button" onClick={() => { setDocFile(null); setDocPreview(null); }}
                      className="p-1 text-red-400 hover:bg-red-500/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-brand-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-500" />
                    <span className="text-sm text-gray-400">Clique para enviar foto ou PDF</span>
                    <span className="text-xs text-gray-500">JPG, PNG ou PDF - Máx 5MB</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 5MB)'); return; }
                        setDocFile(file);
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setDocPreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }
                    }} />
                  </label>
                )}
              </div>

              {/* Campos específicos por tipo */}
              {form.tipo === 'prestador' && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h2 className="font-semibold mb-4">Dados Profissionais</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Função Principal *</label>
                      <SearchableSelect
                        value={form.funcao_principal}
                        onChange={(v) => updateForm('funcao_principal', v)}
                        options={FUNCOES_DISPONIVEIS.filter((f) => f !== form.funcao_2 && f !== form.funcao_3)}
                        placeholder="Buscar função..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Função 2</label>
                      <SearchableSelect
                        value={form.funcao_2}
                        onChange={(v) => updateForm('funcao_2', v)}
                        options={FUNCOES_DISPONIVEIS.filter((f) => f !== form.funcao_principal && f !== form.funcao_3)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1 block">Função 3</label>
                      <SearchableSelect
                        value={form.funcao_3}
                        onChange={(v) => updateForm('funcao_3', v)}
                        options={FUNCOES_DISPONIVEIS.filter((f) => f !== form.funcao_principal && f !== form.funcao_2)}
                        placeholder="Opcional"
                      />
                    </div>
                    <button type="button" onClick={() => setShowSolicitarFuncao(true)}
                      className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium">
                      <PlusCircle className="w-4 h-4" /> Não encontrou a função? Solicitar nova
                    </button>
                    <SolicitarFuncaoModal open={showSolicitarFuncao} onClose={() => setShowSolicitarFuncao(false)} />
                  </div>
                </div>
              )}
              {form.tipo === 'contratante' && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h2 className="font-semibold mb-4">Dados da Empresa</h2>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-1 block">Nome da Empresa</label>
                    <input value={form.nome_empresa} onChange={(e) => updateForm('nome_empresa', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500" />
                  </div>
                </div>
              )}

              {/* Plano */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h2 className="font-semibold mb-4">Plano de Acesso</h2>
                {planosDoTipo.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum plano cadastrado para {form.tipo === 'prestador' ? 'prestadores' : 'contratantes'}.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {planosDoTipo.map((plano) => (
                        <button key={plano.id} type="button"
                          onClick={() => updateForm('plano_id', form.plano_id === plano.id ? '' : plano.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-colors ${
                            form.plano_id === plano.id
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{plano.nome}</span>
                            {form.plano_id === plano.id && <Check className="w-4 h-4 text-brand-400" />}
                          </div>
                          <p className="text-brand-400 font-bold">{formatCurrency(plano.valor)}</p>
                          <p className="text-xs text-gray-500">{plano.duracao_dias} dias</p>
                        </button>
                      ))}
                    </div>
                    {!form.plano_id && (
                      <p className="text-xs text-yellow-500">Nenhum plano selecionado — usuário terá acesso gratuito.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Resumo e Submit */}
              {selectedPlano && (
                <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
                  <p className="text-sm text-emerald-300">
                    Plano selecionado: <strong>{selectedPlano.nome}</strong> — {formatCurrency(selectedPlano.valor)} por {selectedPlano.duracao_dias} dias
                  </p>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Criar Usuário
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
