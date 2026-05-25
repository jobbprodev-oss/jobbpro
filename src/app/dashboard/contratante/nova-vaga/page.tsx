'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, CheckCircle2, PlusCircle } from 'lucide-react';
import { ESTADOS_BR } from '@/lib/types';
import { useFuncoes } from '@/hooks/useFuncoes';
import SearchableSelect from '@/components/searchable-select';
import SolicitarFuncaoModal from '@/components/solicitar-funcao-modal';
import VagaPagamentoModal from '@/components/vaga-pagamento-modal';
import { maskCEP } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NovaVagaPage() {
  const router = useRouter();
  const { contratantePerfil } = useAppStore();
  const { funcoes } = useFuncoes();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    funcao_principal: '',
    data: '',
    horario_inicio: '',
    horario_fim: '',
    local_servico: '',
    endereco_completo: '',
    numero_complemento: '',
    cep: '',
    cidade: '',
    bairro: '',
    estado: '',
    valor_oferecido: '',
    vestimenta: 'casual',
    descricao: '',
    termo_aceite: false,
  });

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [showSolicitarFuncao, setShowSolicitarFuncao] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buscarCep = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco_completo: data.logradouro || prev.endereco_completo,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      } else {
        toast.error('CEP não encontrado');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSubmit = () => {
    if (!form.titulo || !form.funcao_principal || !form.data || !form.horario_inicio || !form.horario_fim) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!form.valor_oferecido) {
      toast.error('Informe o valor oferecido');
      return;
    }
    if (!form.termo_aceite) {
      toast.error('Aceite os termos para continuar');
      return;
    }
    if (!contratantePerfil) {
      toast.error('Perfil não encontrado');
      return;
    }

    setShowPagamentoModal(true);
  };

  return (
    <AuthProvider>
    <div className="min-h-screen bg-gray-50">
      <Header title="Nova Vaga" showBack />

      <div className="page-container space-y-4">
        <h2 className="section-title">Detalhes da Vaga</h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Título da Vaga *</label>
          <input type="text" value={form.titulo} onChange={(e) => updateForm('titulo', e.target.value)} className="input-field" placeholder="Ex: Garçom para evento corporativo" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Função Principal *</label>
          <SearchableSelect
            value={form.funcao_principal}
            onChange={(v) => updateForm('funcao_principal', v)}
            options={funcoes}
            placeholder="Buscar função..."
          />
          <button type="button" onClick={() => setShowSolicitarFuncao(true)}
            className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <PlusCircle className="w-4 h-4" /> Não encontrou? Solicitar nova função
          </button>
          <SolicitarFuncaoModal open={showSolicitarFuncao} onClose={() => setShowSolicitarFuncao(false)} />
        </div>

        <h2 className="section-title pt-2">Data e Horário</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Data *</label>
          <input type="date" value={form.data} onChange={(e) => updateForm('data', e.target.value)} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Horário Início *</label>
            <input type="time" value={form.horario_inicio} onChange={(e) => updateForm('horario_inicio', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Horário Fim *</label>
            <input type="time" value={form.horario_fim} onChange={(e) => updateForm('horario_fim', e.target.value)} className="input-field" />
          </div>
        </div>

        <h2 className="section-title pt-2">Local</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Local do Serviço *</label>
          <input type="text" value={form.local_servico} onChange={(e) => updateForm('local_servico', e.target.value)} className="input-field" placeholder="Nome do local" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">CEP</label>
          <div className="relative">
            <input
              type="text"
              value={form.cep}
              onChange={(e) => {
                const v = maskCEP(e.target.value);
                updateForm('cep', v);
                if (v.replace(/\D/g, '').length === 8) buscarCep(v);
              }}
              className="input-field pr-10"
              placeholder="00000-000"
              maxLength={9}
            />
            {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-500" />}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço</label>
          <input type="text" value={form.endereco_completo} onChange={(e) => updateForm('endereco_completo', e.target.value)} className="input-field" placeholder="Rua, Avenida..." />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Nº / Complemento</label>
          <input type="text" value={form.numero_complemento} onChange={(e) => updateForm('numero_complemento', e.target.value)} className="input-field" placeholder="123, Sala 4, Bloco B..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Bairro</label>
            <input type="text" value={form.bairro} onChange={(e) => updateForm('bairro', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade</label>
            <input type="text" value={form.cidade} onChange={(e) => updateForm('cidade', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">UF</label>
            <select value={form.estado} onChange={(e) => updateForm('estado', e.target.value)} className="select-field">
              <option value="">UF</option>
              {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>

        <h2 className="section-title pt-2">Remuneração e Detalhes</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Valor Oferecido (R$) *</label>
          <input type="number" step="0.01" value={form.valor_oferecido} onChange={(e) => updateForm('valor_oferecido', e.target.value)} className="input-field" placeholder="150.00" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Vestimenta</label>
          <select value={form.vestimenta} onChange={(e) => updateForm('vestimenta', e.target.value)} className="select-field">
            <option value="casual">Casual</option>
            <option value="social">Social</option>
            <option value="uniforme">Uniforme</option>
            <option value="esporte_fino">Esporte Fino</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
          <textarea value={form.descricao} onChange={(e) => updateForm('descricao', e.target.value)} className="input-field min-h-[100px] resize-none" placeholder="Descreva a vaga..." />
        </div>

        <div className="card p-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="termos" checked={form.termo_aceite} onChange={(e) => updateForm('termo_aceite', e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="termos" className="text-sm text-gray-600">
              Confirmo que as informações são verdadeiras e aceito os{' '}
              <a href="/termos" target="_blank" className="text-brand-600 font-medium underline">termos da plataforma</a>.
            </label>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-success w-full flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {loading ? 'Publicando...' : 'Publicar Vaga'}
        </button>

        <VagaPagamentoModal
          isOpen={showPagamentoModal}
          onClose={() => setShowPagamentoModal(false)}
          vagaData={form}
          onSuccess={() => {
            router.push('/dashboard/contratante');
          }}
        />
      </div>
      <BottomNav />
    </div>
    </AuthProvider>
  );
}
