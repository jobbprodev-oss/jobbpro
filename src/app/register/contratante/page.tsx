'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ESTADOS_BR } from '@/lib/types';
import { maskCPFouCNPJ, maskPhone, maskCEP } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function RegisterContratantePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    cpf_cnpj: '',
    celular: '',
    email: '',
    senha: '',
    nome_empresa: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    termo_aceite: false,
  });

  const [buscandoCep, setBuscandoCep] = useState(false);

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

  const handleSubmit = async () => {
    if (!form.nome || !form.cpf_cnpj || !form.celular || !form.email) {
      toast.error('Preencha nome, CPF/CNPJ, celular e e-mail');
      return;
    }
    if (!form.senha || form.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!form.termo_aceite) {
      toast.error('Aceite os termos para continuar');
      return;
    }

    setLoading(true);
    try {
      let userId: string;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha,
      });

      if (authError && authError.message?.includes('already registered')) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.senha,
        });
        if (loginError) throw loginError;
        if (!loginData.user) throw new Error('Erro ao fazer login');
        userId = loginData.user.id;
      } else if (authError) {
        throw authError;
      } else if (!authData.user) {
        throw new Error('Erro ao criar conta');
      } else {
        userId = authData.user.id;
      }

      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        tipo: 'contratante',
        nome: form.nome,
        cpf_cnpj: form.cpf_cnpj.replace(/\D/g, ''),
        celular: form.celular.replace(/\D/g, ''),
        email: form.email,
        cep: form.cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        termo_aceite: form.termo_aceite,
      }, { onConflict: 'id' });
      if (userError) throw userError;

      const { error: perfilError } = await supabase.from('contratante_perfil').upsert({
        user_id: userId,
        nome_empresa: form.nome_empresa || null,
      }, { onConflict: 'user_id' });
      if (perfilError) throw perfilError;

      toast.success('Cadastro realizado com sucesso!');
      router.push('/dashboard/contratante');
    } catch (err: any) {
      toast.error(err.message || 'Erro no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">Cadastro Contratante</h1>
        </div>
      </header>

      <div className="page-container space-y-4">
        <h2 className="section-title">Dados da Empresa / Pessoa</h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Nome / Razão Social *</label>
          <input type="text" value={form.nome} onChange={(e) => updateForm('nome', e.target.value)} className="input-field" placeholder="Nome completo ou razão social" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Nome Fantasia</label>
          <input type="text" value={form.nome_empresa} onChange={(e) => updateForm('nome_empresa', e.target.value)} className="input-field" placeholder="Nome da empresa (opcional)" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">CPF ou CNPJ *</label>
          <input type="text" value={form.cpf_cnpj} onChange={(e) => updateForm('cpf_cnpj', maskCPFouCNPJ(e.target.value))} className="input-field" placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Celular *</label>
          <input type="tel" value={form.celular} onChange={(e) => updateForm('celular', maskPhone(e.target.value))} className="input-field" placeholder="(11) 99999-9999" maxLength={15} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className="input-field" placeholder="contato@empresa.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Senha *</label>
          <input type="password" value={form.senha} onChange={(e) => updateForm('senha', e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" />
        </div>

        <h2 className="section-title pt-4">Endereço</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">CEP</label>
          <div className="relative">
            <input type="text" value={form.cep} onChange={(e) => { const v = maskCEP(e.target.value); updateForm('cep', v); if (v.replace(/\D/g, '').length === 8) buscarCep(v); }} className="input-field" placeholder="00000-000" maxLength={9} />
            {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-600" />}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço</label>
          <input type="text" value={form.endereco} onChange={(e) => updateForm('endereco', e.target.value)} className="input-field" placeholder="Rua, Avenida..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Número</label>
            <input type="text" value={form.numero} onChange={(e) => updateForm('numero', e.target.value)} className="input-field" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Complemento</label>
            <input type="text" value={form.complemento} onChange={(e) => updateForm('complemento', e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Bairro</label>
          <input type="text" value={form.bairro} onChange={(e) => updateForm('bairro', e.target.value)} className="input-field" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
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

        <div className="card p-4 mt-6">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="termos" checked={form.termo_aceite} onChange={(e) => updateForm('termo_aceite', e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="termos" className="text-sm text-gray-600 leading-relaxed">
              Declaro que as informações são verdadeiras e aceito os{' '}
              <span className="text-brand-600 font-medium">Termos de Uso</span> e{' '}
              <span className="text-brand-600 font-medium">Política de Privacidade</span>.
            </label>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-success w-full flex items-center justify-center gap-2 mt-6">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
        </button>
      </div>
    </div>
  );
}
