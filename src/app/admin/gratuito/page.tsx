'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Gift, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface GratuitoData {
  sistema_gratuito_ativo?: boolean;
  gratuito_inicio?: string;
  gratuito_fim?: string;
}

export default function AdminGratuitoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [data, setData] = useState<GratuitoData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') { router.push('/'); return; }
      fetchConfig();
    }
  }, [user, authLoading]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/configuracoes', {
        cache: 'no-store',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.configuracoes || {});
    } catch (err) {
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const salvar = async (ativar: boolean) => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      const payload: GratuitoData = {
        sistema_gratuito_ativo: ativar,
        gratuito_inicio: ativar ? (data.gratuito_inicio || new Date().toISOString().slice(0, 16)) : undefined,
        gratuito_fim: ativar ? data.gratuito_fim : undefined,
      };
      const res = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json.configuracoes || {});
      toast.success(ativar ? 'Período gratuito ativado!' : 'Sistema voltou para versão paga!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const formatInput = (v?: string) => v ? v.slice(0, 16) : '';

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
              <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Período Gratuito</h1>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-6">
              <div>
                <h2 className="font-semibold mb-1">Período gratuito do sistema</h2>
                <p className="text-sm text-gray-400">Quando ativo, cadastros e novas funções são liberados sem cobrança no Asaas.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!data.sistema_gratuito_ativo}
                  onChange={(e) => setData({ ...data, sistema_gratuito_ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-medium text-gray-300">Ativar versão gratuita</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Data de início</label>
                  <input
                    type="datetime-local"
                    value={formatInput(data.gratuito_inicio)}
                    onChange={(e) => setData({ ...data, gratuito_inicio: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Data de término</label>
                  <input
                    type="datetime-local"
                    value={formatInput(data.gratuito_fim)}
                    onChange={(e) => setData({ ...data, gratuito_fim: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => salvar(true)}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Ativar período gratuito
                </button>
                <button
                  type="button"
                  onClick={() => salvar(false)}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Voltar para versão paga
                </button>
              </div>

              <div className="text-xs text-gray-500 bg-gray-900/50 p-4 rounded-lg">
                <p>Regras:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Ativo: novos cadastros e funções são liberados sem cobrança.</li>
                  <li>Nenhum pagamento já aprovado será alterado ou apagado.</li>
                  <li>Usuários pagos mantêm acesso normalmente.</li>
                  <li>Ao voltar para paga, apenas novos cadastros/funções voltam a exigir pagamento.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}
