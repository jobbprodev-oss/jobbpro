'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, FileText, Shield, Save, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface TermosData {
  termos_uso?: string;
  politica_privacidade?: string;
}

export default function AdminTermosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [termosData, setTermosData] = useState<TermosData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'termos' | 'politica'>('termos');

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') {
        router.push('/');
        return;
      }
      fetchTermos();
    }
  }, [user, authLoading]);

  const fetchTermos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('termos_uso, politica_privacidade')
        .eq('id', 'global')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTermosData(data || {});
    } catch (err) {
      console.error('Erro ao buscar termos:', err);
      toast.error('Erro ao carregar termos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuracoes')
        .upsert({
          id: 'global',
          termos_uso: termosData.termos_uso || '',
          politica_privacidade: termosData.politica_privacidade || '',
        });

      if (error) throw error;
      toast.success('Termos salvos com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar termos');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              <h1 className="text-lg font-bold">Termos e Políticas</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Abas */}
          <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('termos')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'termos'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Termos de Uso
            </button>
            <button
              onClick={() => setActiveTab('politica')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'politica'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              Política de Privacidade
            </button>
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6">
              {activeTab === 'termos' ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-brand-400" />
                      Termos de Uso
                    </h2>
                    <textarea
                      value={termosData.termos_uso || ''}
                      onChange={(e) => setTermosData({ ...termosData, termos_uso: e.target.value })}
                      placeholder="Digite os termos de uso da plataforma..."
                      className="w-full h-96 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-brand-400" />
                      Política de Privacidade
                    </h2>
                    <textarea
                      value={termosData.politica_privacidade || ''}
                      onChange={(e) => setTermosData({ ...termosData, politica_privacidade: e.target.value })}
                      placeholder="Digite a política de privacidade da plataforma..."
                      className="w-full h-96 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-400">Visualização</h3>
                  <Link
                    href={activeTab === 'termos' ? '/termos' : '/privacidade'}
                    target="_blank"
                    className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
                  >
                    <Eye className="w-3 h-3" />
                    Ver página
                  </Link>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {activeTab === 'termos' 
                      ? termosData.termos_uso || 'Nenhum conteúdo cadastrado'
                      : termosData.politica_privacidade || 'Nenhum conteúdo cadastrado'
                    }
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthProvider>
  );
}
