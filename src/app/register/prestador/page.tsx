'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Camera, Loader2, CheckCircle2, Upload, PlusCircle, QrCode, Copy, Clock } from 'lucide-react';
import { supabase, uploadImage } from '@/lib/supabase';
import { ESTADOS_BR } from '@/lib/types';
import { useFuncoes } from '@/hooks/useFuncoes';
import SearchableSelect from '@/components/searchable-select';
import { maskCPF, maskPhone, maskCEP } from '@/lib/utils';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3 | 4 | 5;

export default function RegisterPrestadorPage() {
  const router = useRouter();
  const { funcoes } = useFuncoes();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [funcaoCustom, setFuncaoCustom] = useState('');
  const [showInputCustom, setShowInputCustom] = useState(false);
  const [pixData, setPixData] = useState<{ asaas_payment_id: string; qr_code: string; copia_cola: string; valor: number; plano_id: string; plano_nome: string; duracao_dias: number } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [planoConfirmado, setPlanoConfirmado] = useState<{ plano_id: string; duracao_dias: number; userId: string } | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [erroFinalizacao, setErroFinalizacao] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalizingRef = useRef(false);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {} finally {
      setBuscandoCep(false);
    }
  };

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    celular: '',
    email: '',
    senha: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    funcao_principal: '',
    funcao_2: '',
    funcao_3: '',
    valor_pretendido: '',
    vestimenta: 'casual',
    aceita_negociacao: false,
    descricao: '',
    indicacao: false,
    indicacao_nome: '',
    indicacao_telefone: '',
    termo_aceite: false,
  });

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDocFile(file);
  };

  const validateStep = (s: Step): boolean => {
    switch (s) {
      case 1:
        if (!form.nome || !form.cpf || !form.celular || !form.email) {
          toast.error('Preencha nome, CPF, celular e e-mail');
          return false;
        }
        if (!form.senha || form.senha.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres');
          return false;
        }
        return true;
      case 2:
        if (!form.endereco || !form.cidade || !form.estado) {
          toast.error('Preencha endereço, cidade e estado');
          return false;
        }
        return true;
      case 3:
        if (!form.funcao_principal) {
          toast.error('Selecione a função principal');
          return false;
        }
        if (!fotoFile) {
          toast.error('A foto do rosto é obrigatória');
          return false;
        }
        return true;
      case 4:
        if (!form.termo_aceite) {
          toast.error('Aceite o Termo de Uso para continuar');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // Ativa o plano após confirmação do pagamento (conta já foi criada antes do PIX)
  const finalizeAfterPayment = async (userId: string, plano_id: string, duracao_dias: number) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setFinalizando(true);
    setErroFinalizacao(null);
    try {
      if (plano_id) {
        const expira = new Date();
        expira.setDate(expira.getDate() + (duracao_dias || 365));
        const r = await fetch('/api/users/query', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId,
            record: { plano_id, plano_ativo: true, plano_expira_em: expira.toISOString() },
          }),
        });
        const { error: planError } = await r.json();
        if (planError) throw new Error(planError);
      }
      setPagamentoConfirmado(true);
      toast.success('Cadastro realizado com sucesso! Bem-vindo ao JOBBPRO!');
      router.push('/dashboard/prestador');
    } catch (err: any) {
      const msg: string = err.message || '';
      console.error('[finalizeAfterPayment prestador]', msg);
      setErroFinalizacao(msg || 'Erro ao ativar o plano. Entre em contato com o suporte.');
    } finally {
      setFinalizando(false);
      finalizingRef.current = false;
    }
  };

  const nextStep = async () => {
    if (!validateStep(step)) return;

    if (step === 1) {
      setCheckingEmail(true);
      try {
        const res = await fetch('/api/users/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'emailExists', email: form.email.trim().toLowerCase() }),
        });
        const data = await res.json();
        if (data.exists) {
          toast.error('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
          return;
        }
      } catch {
        // falha silenciosa — não bloqueia o cadastro
      } finally {
        setCheckingEmail(false);
      }
    }

    if (step === 4) {
      setCheckingEmail(true);
      try {
        const [emailRes, cpfRes, celularRes] = await Promise.all([
          fetch('/api/users/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'emailExists', email: form.email.trim().toLowerCase() }),
          }),
          fetch('/api/users/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'cpfExists', cpf: form.cpf, tipo: 'prestador' }),
          }),
          fetch('/api/users/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'celularExists', celular: form.celular, tipo: 'prestador' }),
          }),
        ]);
        const [emailData, cpfData, celularData] = await Promise.all([
          emailRes.json(), cpfRes.json(), celularRes.json(),
        ]);
        if (emailData.exists) {
          toast.error('Este e-mail já está cadastrado. Utilize outro e-mail ou faça login.');
          return;
        }
        if (cpfData.exists) {
          toast.error('Este CPF já está cadastrado para este tipo de conta.');
          return;
        }
        if (celularData.exists) {
          toast.error('Este celular já está cadastrado para este tipo de conta.');
          return;
        }
      } catch {} finally { setCheckingEmail(false); }
      setStep(5);
      return;
    }

    setStep((s) => Math.min(s + 1, 5) as Step);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const gerarPixCadastro = async () => {
    setPixLoading(true);
    setErroFinalizacao(null);
    try {
      // PASSO 1: Criar conta Supabase ANTES de gerar o PIX
      let userId: string;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
      });
      if (authError && (authError.message?.includes('already registered') || authError.message?.includes('Email already exists'))) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.senha,
        });
        if (loginError) {
          toast.error('Este e-mail já está cadastrado com outra senha. Use "Esqueci minha senha" para recuperar o acesso.');
          return;
        }
        userId = loginData.user!.id;
      } else if (authError) {
        throw authError;
      } else if (!authData.user) {
        throw new Error('Erro ao criar conta. Verifique os dados e tente novamente.');
      } else {
        userId = authData.user.id;
        if (!authData.session) {
          await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.senha });
        }
      }
      setPendingUserId(userId);

      // PASSO 2: Upload de imagens e salvar perfil
      let fotoUrl = null;
      let docUrl = null;
      if (fotoFile) fotoUrl = await uploadImage(fotoFile, 'avatars', userId);
      if (docFile) docUrl = await uploadImage(docFile, 'documentos', userId);

      const [upsertRes, perfilRes] = await Promise.all([
        fetch('/api/users/query', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert',
            record: {
              id: userId,
              tipo: 'prestador',
              nome: form.nome,
              cpf_cnpj: form.cpf.replace(/\D/g, ''),
              rg: form.rg,
              data_nascimento: form.data_nascimento || null,
              celular: form.celular.replace(/\D/g, ''),
              email: form.email.trim().toLowerCase(),
              cep: form.cep,
              endereco: form.endereco,
              numero: form.numero,
              complemento: form.complemento,
              bairro: form.bairro,
              cidade: form.cidade,
              estado: form.estado,
              foto_url: fotoUrl,
              foto_documento_url: docUrl,
              indicacao: form.indicacao,
              indicacao_nome: form.indicacao ? form.indicacao_nome : null,
              indicacao_telefone: form.indicacao ? form.indicacao_telefone.replace(/\D/g, '') : null,
              termo_aceite: form.termo_aceite,
              plano_ativo: false,
            },
          }),
        }),
        fetch('/api/users/query', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsertPrestadorPerfil',
            record: {
              user_id: userId,
              funcao_principal: form.funcao_principal,
              funcao_2: form.funcao_2 || null,
              funcao_3: form.funcao_3 || null,
              valor_pretendido: form.valor_pretendido ? parseFloat(form.valor_pretendido) : null,
              vestimenta: form.vestimenta,
              aceita_negociacao: form.aceita_negociacao,
              descricao: form.descricao,
            },
          }),
        }),
      ]);
      const { error: userError } = await upsertRes.json();
      if (userError) throw new Error(userError);
      const { error: perfilError } = await perfilRes.json();
      if (perfilError) throw new Error(perfilError);

      if (funcaoCustom.trim()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch('/api/funcoes/solicitar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ nome_funcao: funcaoCustom.trim() }),
            });
          }
        } catch {}
      }

      // PASSO 3: Gerar PIX (conta já salva)
      const res = await fetch('/api/pagamentos/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_usuario: 'prestador',
          nome: form.nome,
          cpf: form.cpf,
          celular: form.celular,
          email: form.email,
          user_id: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPixData(data);

      // PASSO 4: Polling — apenas ativa plano
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/pagamentos/cadastro?payment_id=${data.asaas_payment_id}`);
          const statusData = await statusRes.json();
          if (statusData.status === 'CONFIRMED') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPlanoConfirmado({ plano_id: data.plano_id, duracao_dias: data.duracao_dias, userId });
            await finalizeAfterPayment(userId, data.plano_id, data.duracao_dias);
          }
        } catch {}
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar PIX');
    } finally {
      setPixLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          {step > 1 ? (
            <button onClick={prevStep} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <Link href="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
          )}
          <h1 className="font-semibold text-gray-900">Cadastro Prestador</h1>
          <span className="ml-auto text-sm text-gray-400">Passo {step}/5</span>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </header>

      <div className="page-container">
        {step === 1 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="section-title">Dados Pessoais</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome completo *</label>
              <input type="text" value={form.nome} onChange={(e) => updateForm('nome', e.target.value)} className="input-field" placeholder="Seu nome completo" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CPF *</label>
              <input type="text" value={form.cpf} onChange={(e) => updateForm('cpf', maskCPF(e.target.value))} className="input-field" placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">RG</label>
              <input type="text" value={form.rg} onChange={(e) => updateForm('rg', e.target.value)} className="input-field" placeholder="Seu RG" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data de Nascimento</label>
              <input type="date" value={form.data_nascimento} onChange={(e) => updateForm('data_nascimento', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Celular *</label>
              <input type="tel" value={form.celular} onChange={(e) => updateForm('celular', maskPhone(e.target.value))} className="input-field" placeholder="(11) 99999-9999" maxLength={15} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail *</label>
              <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="input-field" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Senha *</label>
              <input type="password" value={form.senha} onChange={(e) => updateForm('senha', e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="section-title">Endereço</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CEP</label>
              <div className="relative">
                <input type="text" value={form.cep} onChange={(e) => { const v = maskCEP(e.target.value); updateForm('cep', v); if (v.replace(/\D/g, '').length === 8) buscarCep(v); }} className="input-field" placeholder="00000-000" maxLength={9} />
                {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-600" />}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço *</label>
              <input type="text" value={form.endereco} onChange={(e) => updateForm('endereco', e.target.value)} className="input-field" placeholder="Rua, Avenida..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Número</label>
                <input type="text" value={form.numero} onChange={(e) => updateForm('numero', e.target.value)} className="input-field" placeholder="Nº" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Complemento</label>
                <input type="text" value={form.complemento} onChange={(e) => updateForm('complemento', e.target.value)} className="input-field" placeholder="Apto, Bloco..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bairro</label>
              <input type="text" value={form.bairro} onChange={(e) => updateForm('bairro', e.target.value)} className="input-field" placeholder="Bairro" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade *</label>
                <input type="text" value={form.cidade} onChange={(e) => updateForm('cidade', e.target.value)} className="input-field" placeholder="Cidade" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">UF *</label>
                <select value={form.estado} onChange={(e) => updateForm('estado', e.target.value)} className="select-field">
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="section-title">Profissional</h2>

            <div className="flex flex-col items-center mb-4">
              <label className="cursor-pointer">
                <div className="w-28 h-28 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden hover:border-brand-500 transition-colors">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">Foto *</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" capture="user" onChange={handleFotoChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-2">Foto do rosto (obrigatória)</p>
            </div>

            <div>
              <label className="cursor-pointer block">
                <div className="input-field flex items-center gap-3">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className={docFile ? 'text-gray-900' : 'text-gray-400'}>
                    {docFile ? docFile.name : 'Foto do documento'}
                  </span>
                </div>
                <input type="file" accept="image/*" onChange={handleDocChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Função Principal *</label>
              <SearchableSelect
                value={form.funcao_principal}
                onChange={(v) => updateForm('funcao_principal', v)}
                options={funcoes.filter((f) => f !== form.funcao_2 && f !== form.funcao_3)}
                placeholder="Buscar função..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Função 2</label>
              <SearchableSelect
                value={form.funcao_2}
                onChange={(v) => updateForm('funcao_2', v)}
                options={funcoes.filter((f) => f !== form.funcao_principal && f !== form.funcao_3)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Função 3</label>
              <SearchableSelect
                value={form.funcao_3}
                onChange={(v) => updateForm('funcao_3', v)}
                options={funcoes.filter((f) => f !== form.funcao_principal && f !== form.funcao_2)}
                placeholder="Opcional"
              />
            </div>
            {!showInputCustom ? (
              <button type="button" onClick={() => setShowInputCustom(true)}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                <PlusCircle className="w-4 h-4" /> Não encontrou sua função? Solicitar nova
              </button>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nome da função que deseja solicitar</label>
                <input
                  value={funcaoCustom}
                  onChange={(e) => setFuncaoCustom(e.target.value)}
                  placeholder="Ex: Sommelier, Chef de Cozinha..."
                  className="input-field"
                />
                <p className="text-xs text-gray-500">Será enviada para aprovação do administrador após o cadastro.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Valor pretendido (R$)</label>
              <input type="number" step="0.01" value={form.valor_pretendido} onChange={(e) => updateForm('valor_pretendido', e.target.value)} className="input-field" placeholder="150.00" />
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
            <div className="flex items-center gap-3">
              <input type="checkbox" id="negociacao" checked={form.aceita_negociacao} onChange={(e) => updateForm('aceita_negociacao', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="negociacao" className="text-sm text-gray-700">Aceita negociação de valor</label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sobre você</label>
              <textarea value={form.descricao} onChange={(e) => updateForm('descricao', e.target.value)} className="input-field min-h-[100px] resize-none" placeholder="Descreva sua experiência..." />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="section-title">Confirmar Cadastro</h2>

            <div className="card p-4 space-y-3">
              <h3 className="font-medium text-gray-700">Resumo</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Nome:</span>
                <span className="font-medium">{form.nome}</span>
                <span className="text-gray-500">Função:</span>
                <span className="font-medium">{form.funcao_principal}</span>
                <span className="text-gray-500">Cidade:</span>
                <span className="font-medium">{form.cidade}/{form.estado}</span>
                <span className="text-gray-500">Valor:</span>
                <span className="font-medium">R$ {form.valor_pretendido || '—'}</span>
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="indicacao" checked={form.indicacao} onChange={(e) => updateForm('indicacao', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="indicacao" className="text-sm font-medium text-gray-700">Foi indicação?</label>
              </div>
              {form.indicacao && (
                <div className="space-y-3 pl-8">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Nome de quem indicou *</label>
                    <input type="text" value={form.indicacao_nome} onChange={(e) => updateForm('indicacao_nome', e.target.value)} className="input-field" placeholder="Nome completo" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone de quem indicou *</label>
                    <input type="tel" value={form.indicacao_telefone} onChange={(e) => updateForm('indicacao_telefone', maskPhone(e.target.value))} className="input-field" placeholder="(11) 99999-9999" maxLength={15} />
                  </div>
                </div>
              )}
            </div>

            <div className="card p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="termos" checked={form.termo_aceite} onChange={(e) => updateForm('termo_aceite', e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <label htmlFor="termos" className="text-sm text-gray-600 leading-relaxed">
                  Declaro que as informações fornecidas são verdadeiras e aceito o{' '}
                  <a href="/termos" target="_blank" className="text-brand-600 font-medium underline">Termo de Uso</a> e a{' '}
                  <a href="/privacidade" target="_blank" className="text-brand-600 font-medium underline">Política de Privacidade</a> da plataforma JOBBPRO.
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="section-title">Pagamento do Cadastro</h2>

            {!pixData && !pixLoading && (
              <div className="card p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Realize o pagamento via PIX para concluir seu cadastro e ativar o acesso.
                </p>
                <button onClick={gerarPixCadastro} className="btn-primary w-full flex items-center justify-center gap-2">
                  <QrCode className="w-5 h-5" /> Gerar PIX para pagamento
                </button>
              </div>
            )}

            {pixLoading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                <p className="text-sm text-gray-500">Gerando cobrança PIX...</p>
              </div>
            )}

            {pixData && !pagamentoConfirmado && !finalizando && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">{pixData.plano_nome}</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {pixData.valor.toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs text-gray-400 mt-1">Validade: {pixData.duracao_dias} dias</p>
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

            {finalizando && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                <p className="text-sm text-gray-500">Finalizando seu cadastro...</p>
              </div>
            )}

            {erroFinalizacao && !finalizando && (
              <div className="card p-4 space-y-3 border border-red-200 bg-red-50">
                <p className="text-sm font-medium text-red-700">Pagamento confirmado, mas ocorreu um erro ao criar sua conta:</p>
                <p className="text-xs text-red-600">{erroFinalizacao}</p>
                <p className="text-xs text-gray-500">Seu pagamento foi recebido. Clique abaixo para tentar novamente.</p>
                <button
                  onClick={() => planoConfirmado && finalizeAfterPayment(planoConfirmado.userId, planoConfirmado.plano_id, planoConfirmado.duracao_dias)}
                  className="btn-primary w-full"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {pagamentoConfirmado && !erroFinalizacao && !finalizando && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pagamento confirmado!</h3>
                <p className="text-sm text-gray-500">Redirecionando para seu painel...</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          {step < 4 ? (
            <button onClick={nextStep} disabled={checkingEmail} className="btn-primary w-full flex items-center justify-center gap-2">
              {checkingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {checkingEmail ? 'Verificando...' : 'Próximo'}
            </button>
          ) : step === 4 ? (
            <button onClick={nextStep} disabled={checkingEmail} className="btn-primary w-full flex items-center justify-center gap-2">
              {checkingEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {checkingEmail ? 'Verificando e-mail...' : 'Próximo: Pagamento'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
