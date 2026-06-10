'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QrCode, Copy, Clock, CheckCircle2, Loader2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Plano } from '@/lib/types';

interface DisponibilidadePagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisponibilidadePagamentoModal({
  isOpen,
  onClose,
  onSuccess,
}: DisponibilidadePagamentoModalProps) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    asaas_payment_id: string;
    qr_code: string;
    copia_cola: string;
    valor: number;
  } | null>(null);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [verificandoStatus, setVerificandoStatus] = useState(false);
  const [validadeInfo, setValidadeInfo] = useState<{ inicio: string; fim: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlanos();
    }
  }, [isOpen]);

  const fetchPlanos = async () => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) return;

      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('*')
        .eq('tipo_usuario', 'prestador')
        .eq('categoria', 'servico')
        .eq('ativo', true)
        .order('valor', { ascending: true });

      if (planosError) throw planosError;
      setPlanos(planosData || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar planos');
    }
  };

  const gerarPix = async () => {
    if (!planoSelecionado) return;
    setLoading(true);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Usuário não autenticado');

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Sessão não encontrada');

      const response = await fetch('/api/pagamentos/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          tipo: 'disponibilidade',
          plano_id: planoSelecionado.id,
          descricao: `Disponibilidade ${planoSelecionado.duracao_horas ?? 24}h`,
        }),
      });

      const pixResponse = await response.json();
      if (!response.ok) throw new Error(pixResponse.error);

      setPixData(pixResponse);
      // Iniciar polling
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/pagamentos/status?id=${pixResponse.asaas_payment_id}`, {
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          });
          const statusData = await statusRes.json();
          if (statusData.status === 'confirmado') {
            clearInterval(interval);
            setPagamentoConfirmado(true);
            // Salvar disponibilidade após pagamento
            await salvarDisponibilidade();
          }
        } catch {}
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const verificarPagamento = async () => {
    if (!pixData) return;
    setVerificandoStatus(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Sessão não encontrada');

      const statusRes = await fetch(`/api/pagamentos/status?id=${pixData.asaas_payment_id}`, {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const statusData = await statusRes.json();
      
      if (statusData.status === 'confirmado') {
        setPagamentoConfirmado(true);
        await salvarDisponibilidade();
      } else {
        toast('Pagamento ainda não confirmado. Tente novamente em alguns instantes.', { icon: '⏳' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar status');
    } finally {
      setVerificandoStatus(false);
    }
  };

  const salvarDisponibilidade = async () => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Usuário não autenticado');

      const { data: perfil, error: perfilError } = await supabase
        .from('prestador_perfil')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (perfilError || !perfil) throw new Error('Perfil não encontrado');

      const duracaoHoras = planoSelecionado?.duracao_horas ?? 24;
      const agora = new Date();
      const fimDate = new Date(agora.getTime() + duracaoHoras * 60 * 60 * 1000);

      const pad = (n: number) => String(n).padStart(2, '0');
      const dataStr = agora.toISOString().split('T')[0];
      const inicioStr = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
      const fimStr = `${pad(fimDate.getHours())}:${pad(fimDate.getMinutes())}`;
      const expiresAt = fimDate.toISOString();

      const { error: insertError } = await supabase.from('disponibilidades').insert({
        prestador_id: perfil.id,
        data: dataStr,
        horario_inicio: inicioStr,
        horario_fim: fimStr,
        disponivel: true,
        plano_id: planoSelecionado?.id ?? null,
        expires_at: expiresAt,
      });

      if (insertError) throw insertError;

      const fmtDT = (d: Date) =>
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setValidadeInfo({ inicio: fmtDT(agora), fim: fmtDT(fimDate) });

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar disponibilidade');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Disponibilidade - Pagamento</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Validade da disponibilidade</p>
            <p className="text-xs text-gray-400">Inicia no momento da confirmação do pagamento</p>
          </div>

          {!planoSelecionado && !pixData && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Selecione um plano de serviço</h3>
              {planos.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum plano disponível</p>
              ) : (
                <div className="space-y-2">
                  {planos.map((plano) => (
                    <button
                      key={plano.id}
                      onClick={() => setPlanoSelecionado(plano)}
                      className="w-full p-3 border border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{plano.nome}</p>
                          <p className="text-xs text-gray-500">{plano.descricao}</p>
                          {plano.duracao_horas && (
                            <p className="text-xs text-brand-600 font-medium mt-0.5">Válido por {plano.duracao_horas}h</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-brand-600">R$ {plano.valor.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {planoSelecionado && !pixData && (
            <div className="space-y-4">
              <div className="card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{planoSelecionado.nome}</p>
                    <p className="text-xs text-gray-500">{planoSelecionado.descricao}</p>
                  </div>
                  <p className="text-xl font-bold text-brand-600">R$ {planoSelecionado.valor.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={gerarPix}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                {loading ? 'Gerando PIX...' : 'Gerar PIX para pagamento'}
              </button>

              <button
                onClick={() => setPlanoSelecionado(null)}
                className="btn-secondary w-full"
              >
                Voltar para planos
              </button>
            </div>
          )}

          {pixData && !pagamentoConfirmado && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">R$ {pixData.valor.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-gray-400 mt-1">Pague via PIX para ativar</p>
              </div>

              <div className="flex justify-center">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                  <img src={`data:image/png;base64,${pixData.qr_code}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">PIX Copia e Cola:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={pixData.copia_cola || ''} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 truncate" />
                  <button onClick={() => { navigator.clipboard.writeText(pixData.copia_cola); toast.success('Código copiado!'); }}
                    className="flex items-center gap-1 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">Aguardando pagamento... Verificação automática a cada 5 segundos.</p>
              </div>

              <button
                onClick={verificarPagamento}
                disabled={verificandoStatus}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {verificandoStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Verificar Pagamento
                  </>
                )}
              </button>
            </div>
          )}

          {pagamentoConfirmado && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pagamento confirmado!</h3>
              {validadeInfo ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                  <p className="font-medium">Disponibilidade ativa</p>
                  <p className="mt-1">De {validadeInfo.inicio}</p>
                  <p>Até {validadeInfo.fim}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sua disponibilidade foi cadastrada com sucesso.</p>
              )}
              <button onClick={onClose} className="btn-primary w-full">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
