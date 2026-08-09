'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, getAuthToken } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { useFuncoes } from '@/hooks/useFuncoes';
import SearchableSelect from '@/components/searchable-select';
import { X, Loader2, Plus, QrCode, Copy, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { PrestadorPerfil } from '@/lib/types';
import toast from 'react-hot-toast';

interface AdicionarFuncaoModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'selecao' | 'pagamento' | 'confirmado';

export default function AdicionarFuncaoModal({ open, onClose }: AdicionarFuncaoModalProps) {
  const { prestadorPerfil, setPrestadorPerfil } = useAppStore();
  const [funcao, setFuncao] = useState('');
  const [nomeSolicitar, setNomeSolicitar] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('selecao');
  const [pixData, setPixData] = useState<{ pagamento_id: string; qr_code: string; copia_cola: string; valor: number } | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [valorFuncao, setValorFuncao] = useState<number>(9.90);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const { funcoes } = useFuncoes();

  // Reset ao fechar + buscar plano
  useEffect(() => {
    if (!open) {
      setStep('selecao');
      setPixData(null);
      setFuncao('');
      setNomeSolicitar('');
      setLoading(false);
      setVerificando(false);
      if (pollRef.current) clearInterval(pollRef.current);
    } else {
      supabase
        .from('planos')
        .select('valor')
        .eq('categoria', 'funcao')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => { if (data?.valor) setValorFuncao(data.valor); });
    }
  }, [open]);

  // Polling de status quando em pagamento
  useEffect(() => {
    if (step === 'pagamento' && pixData) {
      pollRef.current = setInterval(async () => {
        try {
          const token = await getAuthToken();
          const res = await fetch(`/api/pagamentos/status?id=${pixData.pagamento_id}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const data = await res.json();
          if (data.status === 'confirmado') {
            setStep('confirmado');
            if (pollRef.current) clearInterval(pollRef.current);
            // Recarregar perfil com a função já adicionada pelo backend
            await recarregarPerfil();
          }
        } catch {}
      }, 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [step, pixData]);

  if (!open || !prestadorPerfil) return null;

  const funcoesUsadas = [
    prestadorPerfil.funcao_principal,
    prestadorPerfil.funcao_2,
    prestadorPerfil.funcao_3,
    prestadorPerfil.funcao_4,
    prestadorPerfil.funcao_5,
    prestadorPerfil.funcao_6,
    ...(prestadorPerfil.funcoes_extras || []),
  ].filter(Boolean);

  const slot = !prestadorPerfil.funcao_2 ? 'funcao_2' : !prestadorPerfil.funcao_3 ? 'funcao_3' : null;
  const todasPreenchidas = !slot;

  const opcoesDisponiveis = funcoes.filter((f) => !funcoesUsadas.includes(f));

  const handleSalvar = async () => {
    if (!funcao.trim() || !slot) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prestador_perfil')
        .update({ [slot]: funcao, updated_at: new Date().toISOString() })
        .eq('id', prestadorPerfil.id);
      if (error) throw error;

      setPrestadorPerfil({
        ...prestadorPerfil,
        [slot]: funcao,
      } as PrestadorPerfil);

      toast.success('Função adicionada com sucesso!');
      setFuncao('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPix = async () => {
    if (!nomeSolicitar.trim()) {
      toast.error('Digite o nome da função');
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/pagamentos/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tipo: 'funcao_extra', nome_funcao: nomeSolicitar.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.gratuito) {
        toast.success('Função liberada gratuitamente!');
        setStep('confirmado');
        await recarregarPerfil();
        return;
      }

      setPixData({
        pagamento_id: data.pagamento_id,
        qr_code: data.qr_code,
        copia_cola: data.copia_cola,
        valor: data.valor,
      });
      setStep('pagamento');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recarregarPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from('prestador_perfil')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (perfil) setPrestadorPerfil(perfil as PrestadorPerfil);
    } catch {}
  };

  const copiarCodigoPixCopiaCola = () => {
    if (pixData?.copia_cola) {
      navigator.clipboard.writeText(pixData.copia_cola);
      toast.success('Código PIX copiado!');
    }
  };

  const handleVerificarManual = async () => {
    if (!pixData) return;
    setVerificando(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/pagamentos/status?id=${pixData.pagamento_id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data.status === 'confirmado') {
        setStep('confirmado');
        if (pollRef.current) clearInterval(pollRef.current);
        await recarregarPerfil();
      } else {
        toast('Pagamento ainda não confirmado. Aguarde...', { icon: '⏳' });
      }
    } catch {
      toast.error('Erro ao verificar pagamento');
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'confirmado' ? 'Pagamento Confirmado' : step === 'pagamento' ? 'Pagamento PIX' : todasPreenchidas ? 'Adicionar Função Extra' : 'Adicionar Função'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP: Confirmado */}
        {step === 'confirmado' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Pagamento confirmado!</h3>
            <p className="text-sm text-gray-500">
              A função <strong>"{nomeSolicitar}"</strong> foi adicionada ao seu perfil com sucesso!
            </p>
            <button onClick={onClose}
              className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
              Fechar
            </button>
          </div>
        )}

        {/* STEP: Pagamento PIX */}
        {step === 'pagamento' && pixData && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Valor a pagar</p>
              <p className="text-2xl font-bold text-gray-900">R$ {pixData.valor.toFixed(2).replace('.', ',')}</p>
              <p className="text-xs text-gray-400 mt-1">Função extra: {nomeSolicitar}</p>
            </div>

            <div className="flex justify-center">
              {pixData.qr_code ? (
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                  <img
                    src={`data:image/png;base64,${pixData.qr_code}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">PIX Copia e Cola:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={pixData.copia_cola || ''}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 truncate"
                />
                <button onClick={copiarCodigoPixCopiaCola}
                  className="flex items-center gap-1 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">Aguardando pagamento... Verificação automática a cada 5 segundos.</p>
            </div>

            <button onClick={handleVerificarManual} disabled={verificando}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              {verificando ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Já paguei, verificar agora
            </button>
          </div>
        )}

        {/* STEP: Seleção (todas preenchidas - precisa pagar) */}
        {step === 'selecao' && todasPreenchidas && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Você já possui 3 funções no perfil. Para adicionar mais uma, é necessário um pagamento de <strong>R$ {valorFuncao.toFixed(2).replace('.', ',')}</strong> via PIX.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Função desejada *</label>
              <SearchableSelect
                value={nomeSolicitar}
                onChange={setNomeSolicitar}
                options={opcoesDisponiveis}
                placeholder="Buscar função..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleGerarPix} disabled={loading || !nomeSolicitar.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Pagar R$ {valorFuncao.toFixed(2).replace('.', ',')} via PIX
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* STEP: Seleção (slot disponível - grátis) */}
        {step === 'selecao' && !todasPreenchidas && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Selecione uma função para adicionar ao seu perfil como <strong>{slot === 'funcao_2' ? 'Função 2' : 'Função 3'}</strong>.
            </p>
            <SearchableSelect
              value={funcao}
              onChange={setFuncao}
              options={opcoesDisponiveis}
              placeholder="Buscar função..."
            />
            <div className="flex gap-3">
              <button onClick={handleSalvar} disabled={loading || !funcao.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
