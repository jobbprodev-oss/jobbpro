'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, ArrowLeft, Gift, UserPlus, Tag, Briefcase, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface GratuitoData {
  cadastro_gratuito_ativo?: boolean;
  funcao_extra_gratuita_ativo?: boolean;
  publicacao_vaga_gratuita_ativo?: boolean;
  disponibilidade_gratuita_ativo?: boolean;
}

type ChaveGratuito = keyof GratuitoData;

export default function AdminGratuitoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [data, setData] = useState<GratuitoData>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ChaveGratuito | null>(null);

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

  const toggle = async (chave: ChaveGratuito, mensagens: { on: string; off: string }) => {
    if (savingKey) return;
    const novoValor = !data[chave];
    setSavingKey(chave);
    setData(prev => ({ ...prev, [chave]: novoValor }));
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ [chave]: novoValor }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      setData(json.configuracoes || {});
      toast.success(novoValor ? mensagens.on : mensagens.off);
    } catch (err: any) {
      setData(prev => ({ ...prev, [chave]: !novoValor }));
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSavingKey(null);
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
              <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-brand-400" />
                <h1 className="text-lg font-bold">Período Gratuito</h1>
              </div>
            </div>
          </header>

          <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
            <ControleGratuito
              icon={UserPlus}
              titulo="Cadastro gratuito"
              descricao="Quando ativo, novos cadastros não geram cobrança no Asaas."
              ativo={!!data.cadastro_gratuito_ativo}
              saving={savingKey === 'cadastro_gratuito_ativo'}
              disabled={!!savingKey}
              onToggle={() => toggle('cadastro_gratuito_ativo', {
                on: 'Cadastro gratuito ativado!',
                off: 'Cadastro voltou a exigir pagamento.',
              })}
            />

            <ControleGratuito
              icon={Tag}
              titulo="Adicionar função gratuita"
              descricao="Quando ativo, o prestador pode adicionar novas funções (quantidade ilimitada) sem pagamento."
              ativo={!!data.funcao_extra_gratuita_ativo}
              saving={savingKey === 'funcao_extra_gratuita_ativo'}
              disabled={!!savingKey}
              onToggle={() => toggle('funcao_extra_gratuita_ativo', {
                on: 'Adição de função gratuita ativada!',
                off: 'Adição de função voltou a exigir pagamento.',
              })}
            />

            <ControleGratuito
              icon={Briefcase}
              titulo="Publicação de oportunidade gratuita"
              descricao="Quando ativo, a oportunidade pode ser publicada sem a cobrança atual no Asaas."
              ativo={!!data.publicacao_vaga_gratuita_ativo}
              saving={savingKey === 'publicacao_vaga_gratuita_ativo'}
              disabled={!!savingKey}
              onToggle={() => toggle('publicacao_vaga_gratuita_ativo', {
                on: 'Publicação de oportunidade gratuita ativada!',
                off: 'Publicação de oportunidade voltou a exigir pagamento.',
              })}
            />

            <ControleGratuito
              icon={CalendarCheck}
              titulo="Disponibilidade gratuita"
              descricao="Quando ativo, o prestador libera a disponibilidade sem seleção de planos nem cobrança no Asaas."
              ativo={!!data.disponibilidade_gratuita_ativo}
              saving={savingKey === 'disponibilidade_gratuita_ativo'}
              disabled={!!savingKey}
              onToggle={() => toggle('disponibilidade_gratuita_ativo', {
                on: 'Disponibilidade gratuita ativada!',
                off: 'Disponibilidade voltou a exigir pagamento.',
              })}
            />

            <div className="text-xs text-gray-500 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
              <p>Regras:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Cada controle funciona de forma independente dos demais.</li>
                <li>Nenhum pagamento já aprovado será alterado ou apagado.</li>
                <li>Usuários pagos mantêm acesso normalmente.</li>
                <li>Ao desativar, a funcionalidade correspondente volta ao fluxo pago atual.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}

function ControleGratuito({
  icon: Icon,
  titulo,
  descricao,
  ativo,
  saving,
  disabled,
  onToggle,
}: {
  icon: any;
  titulo: string;
  descricao: string;
  ativo: boolean;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{titulo}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{descricao}</p>
            <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
              {ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            ativo ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
          }`}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {ativo ? 'Desativar' : 'Ativar'}
        </button>
      </div>
    </div>
  );
}
