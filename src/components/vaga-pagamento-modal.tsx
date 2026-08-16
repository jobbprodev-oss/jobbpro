'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QrCode, Copy, Clock, CheckCircle2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Plano } from '@/lib/types';

interface VagaPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vagaData: any;
  onSuccess: () => void;
}

export default function VagaPagamentoModal({
  isOpen,
  onClose,
  vagaData,
  onSuccess,
}: VagaPagamentoModalProps) {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    pagamento_id: string;
    asaas_payment_id: string;
    qr_code: string;
    copia_cola: string;
    valor: number;
  } | null>(null);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [vagaId, setVagaId] = useState<string | null>(null);
  const [publicacaoGratuitaAtiva, setPublicacaoGratuitaAtiva] = useState(false);
  const [configCarregada, setConfigCarregada] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPlanoSelecionado(null);
      setPixData(null);
      setPagamentoConfirmado(false);
      setVagaId(null);
      setConfigCarregada(false);
      setPublicacaoGratuitaAtiva(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchPlanos();
      fetch('/api/configuracoes', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => setPublicacaoGratuitaAtiva(!!data?.publicacao_vaga_gratuita_ativo))
        .catch(() => {})
        .finally(() => setConfigCarregada(true));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && configCarregada && planos.length > 0 && !planoSelecionado && !pixData) {
      setPlanoSelecionado(planos[0]);
    }
  }, [isOpen, configCarregada, planos, planoSelecionado, pixData, publicacaoGratuitaAtiva]);

  const fetchPlanos = async () => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) return;

      const { data: planosData, error: planosError } = await supabase
        .from('planos')
        .select('*')
        .eq('tipo_usuario', 'contratante')
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

      const idVaga = vagaId || await salvarVagaAguardandoPagamento();
      setVagaId(idVaga);

      const response = await fetch('/api/pagamentos/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          tipo: 'publicacao_vaga',
          plano_id: planoSelecionado.id,
          descricao: `Publicação de oportunidade: ${vagaData.titulo}`,
          vaga_id: idVaga,
        }),
      });

      const pixResponse = await response.json();
      if (!response.ok) throw new Error(pixResponse.error);

      if (pixResponse.gratuito) {
        setPagamentoConfirmado(true);
        onSuccess();
        onClose();
        return;
      }

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
            onSuccess();
            onClose();
          }
        } catch {}
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const salvarVagaAguardandoPagamento = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Buscar perfil do contratante
      const { data: perfil } = await supabase
        .from('contratante_perfil')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!perfil) throw new Error('Perfil não encontrado');

      const { data: vagaCriada, error } = await supabase.from('vagas').insert({
        contratante_id: perfil.id,
        titulo: vagaData.titulo,
        funcao_principal: vagaData.funcao_principal,
        data: vagaData.data,
        horario_inicio: vagaData.horario_inicio,
        horario_fim: vagaData.horario_fim,
        local_servico: vagaData.local_servico,
        endereco_completo: [vagaData.endereco_completo, vagaData.numero_complemento].filter(Boolean).join(', '),
        cep: vagaData.cep,
        cidade: vagaData.cidade,
        bairro: vagaData.bairro,
        estado: vagaData.estado,
        valor_oferecido: parseFloat(vagaData.valor_oferecido),
        vestimenta: vagaData.vestimenta,
        descricao: vagaData.descricao,
        ativa: false,
        vagas_disponiveis: 1,
        termo_aceite: vagaData.termo_aceite,
      }).select('id').single();

      if (error) throw error;
      console.log('[VAGA_PIX] Vaga salva aguardando pagamento:', vagaCriada.id);
      return vagaCriada.id;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{publicacaoGratuitaAtiva ? 'Finalizar Oportunidade' : 'Publicar Oportunidade - Pagamento'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Oportunidade a ser publicada</p>
            <p className="font-medium text-gray-900 text-sm">{vagaData.titulo}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(vagaData.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {vagaData.horario_inicio} - {vagaData.horario_fim}
            </p>
          </div>

          {planoSelecionado && !pixData && publicacaoGratuitaAtiva && !pagamentoConfirmado && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700">
                  Sua oportunidade será publicada gratuitamente.
                </p>
              </div>

              <button
                onClick={gerarPix}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? 'Publicando...' : 'Publicar Oportunidade'}
              </button>
            </div>
          )}

          {!planoSelecionado && !pixData && !publicacaoGratuitaAtiva && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Selecione um plano de publicação</h3>
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
                        </div>
                        <p className="text-lg font-bold text-brand-600">R$ {plano.valor.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {planoSelecionado && !pixData && !publicacaoGratuitaAtiva && (
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
                <p className="text-xs text-gray-400 mt-1">Pague via PIX para publicar a oportunidade</p>
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
            </div>
          )}

          {pagamentoConfirmado && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pagamento confirmado!</h3>
              <p className="text-sm text-gray-500">Sua oportunidade foi publicada com sucesso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
