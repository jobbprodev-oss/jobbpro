'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, QrCode, Copy, Clock, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/logo';
import { maskPhone } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PagamentoPendentePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{ id: string; tipo: string; nome: string; cpf_cnpj: string; celular: string; email: string } | null>(null);
  const [pixData, setPixData] = useState<{ asaas_payment_id: string; qr_code: string; copia_cola: string; valor: number; plano_id: string; plano_nome: string; duracao_dias: number } | null>(null);
  const [pixStatus, setPixStatus] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [erroAtivacao, setErroAtivacao] = useState<string | null>(null);
  const [celularInvalido, setCelularInvalido] = useState(false);
  const [novoCelular, setNovoCelular] = useState('');
  const [salvandoCelular, setSalvandoCelular] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalizingRef = useRef(false);

  useEffect(() => {
    loadPendingPayment();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadPendingPayment = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/pagamentos/pendente', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erro ao carregar dados');
        return;
      }

      setUserData(data.user);

      // Checar se celular é válido
      const digits = (data.user?.celular || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        setCelularInvalido(true);
      }

      // Plano já ativo (pago ou webhook já processou) — redirecionar direto
      if (data.pixStatus === 'confirmado' || data.user?.plano_ativo) {
        setPagamentoConfirmado(true);
        setTimeout(() => router.push(`/dashboard/${data.user.tipo}`), 2000);
        return;
      }

      setPixStatus(data.pixStatus);

      // PIX ainda válido — mostrar e iniciar polling
      if (data.payment && data.pixStatus === 'pendente') {
        setPixData({
          asaas_payment_id: data.payment.asaas_payment_id,
          qr_code: data.payment.pix_qr_code,
          copia_cola: data.payment.pix_copia_cola,
          valor: data.payment.valor,
          plano_id: data.payment.metadata?.plano_id,
          plano_nome: 'Cadastro JOBBPRO',
          duracao_dias: data.payment.metadata?.duracao_dias || 365,
        });
        startPolling(
          data.payment.asaas_payment_id,
          data.payment.metadata?.plano_id,
          data.payment.metadata?.duracao_dias || 365,
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: string, planoId: string, duracaoDias: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/pagamentos/cadastro?payment_id=${paymentId}`);
        const statusData = await statusRes.json();
        if (statusData.status === 'CONFIRMED') {
          clearInterval(intervalRef.current!);
          await finalizePayment(planoId, duracaoDias);
        }
      } catch {}
    }, 5000);
  };

  const finalizePayment = async (planoId: string, duracaoDias: number) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizando(true);
    setErroAtivacao(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !userData) throw new Error('Sessão expirada');

      const expira = new Date();
      expira.setDate(expira.getDate() + (duracaoDias || 365));

      const r = await fetch('/api/users/query', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userId: session.user.id,
          record: { plano_id: planoId, plano_ativo: true, plano_expira_em: expira.toISOString() },
        }),
      });
      const { error } = await r.json();
      if (error) throw new Error(error);

      setPagamentoConfirmado(true);
      toast.success('Pagamento confirmado! Bem-vindo ao JOBBPRO!');
      setTimeout(() => router.push(`/dashboard/${userData.tipo}`), 2000);
    } catch (err: any) {
      console.error('[PENDENTE] Erro ao ativar plano:', err);
      setErroAtivacao(err.message || 'Erro ao ativar plano. Contate o suporte.');
    } finally {
      setFinalizando(false);
      finalizingRef.current = false;
    }
  };

  const salvarCelular = async () => {
    const digits = novoCelular.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      toast.error('Celular inválido. Informe DDD + número (ex: 11 99999-9999)');
      return;
    }
    setSalvandoCelular(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
      const res = await fetch('/api/users/query', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userId: session.user.id,
          record: { celular: digits },
        }),
      });
      const { error } = await res.json();
      if (error) throw new Error(error);
      setUserData((prev) => prev ? { ...prev, celular: digits } : prev);
      setCelularInvalido(false);
      toast.success('Celular atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar celular');
    } finally {
      setSalvandoCelular(false);
    }
  };

  const gerarNovoPix = async () => {
    if (!userData) return;
    setPixLoading(true);
    setErroAtivacao(null);
    try {
      const res = await fetch('/api/pagamentos/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_usuario: userData.tipo,
          nome: userData.nome,
          cpf: userData.cpf_cnpj,
          celular: userData.celular,
          email: userData.email,
          user_id: userData.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPixData(data);
      setPixStatus('pendente');
      startPolling(data.asaas_payment_id, data.plano_id, data.duracao_dias);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar PIX');
    } finally {
      setPixLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Logo size="lg" variant="dark" href="/" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm mx-auto w-full">

          {pagamentoConfirmado ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pagamento confirmado!</h3>
              <p className="text-sm text-gray-500">Redirecionando para seu painel...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Pagamento Pendente</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {userData?.nome ? `Olá, ${userData.nome.split(' ')[0]}! ` : ''}
                  Complete o pagamento para acessar o JOBBPRO.
                </p>
              </div>

              {finalizando && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <p className="text-sm text-gray-500">Ativando sua conta...</p>
                </div>
              )}

              {erroAtivacao && !finalizando && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{erroAtivacao}</p>
                </div>
              )}

              {/* Formulário de correção de celular inválido */}
              {celularInvalido && !pagamentoConfirmado && !finalizando && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Celular inválido</p>
                      <p className="text-xs text-amber-700 mt-0.5">O celular cadastrado está incorreto. Corrija para gerar o PIX.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={novoCelular}
                      onChange={(e) => setNovoCelular(maskPhone(e.target.value))}
                      className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                    <button
                      onClick={salvarCelular}
                      disabled={salvandoCelular}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {salvandoCelular ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}

              {!finalizando && !pixData && !pixLoading && (
                <div className="space-y-3">
                  {pixStatus === 'expirado' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      Seu PIX anterior expirou. Gere um novo para continuar.
                    </div>
                  )}
                  <button
                    onClick={gerarNovoPix}
                    disabled={celularInvalido}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <QrCode className="w-5 h-5" />
                    {celularInvalido ? 'Corrija o celular acima para continuar' : 'Gerar PIX para pagamento'}
                  </button>
                </div>
              )}

              {pixLoading && (
                <div className="flex flex-col items-center py-6 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                  <p className="text-sm text-gray-500">Gerando cobrança PIX...</p>
                </div>
              )}

              {pixData && !finalizando && (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">{pixData.plano_nome}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {Number(pixData.valor).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Validade: {pixData.duracao_dias} dias</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                      <img
                        src={`data:image/png;base64,${pixData.qr_code}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">PIX Copia e Cola:</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={pixData.copia_cola || ''}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData!.copia_cola);
                          toast.success('Código copiado!');
                        }}
                        className="flex items-center gap-1 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copiar
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Aguardando pagamento... Verificação automática a cada 5 segundos.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
