'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { Loader2, Save, Camera, User as UserIcon, PlusCircle } from 'lucide-react';
import { uploadImage } from '@/lib/supabase';
import { ESTADOS_BR } from '@/lib/types';
import { useFuncoes } from '@/hooks/useFuncoes';
import SearchableSelect from '@/components/searchable-select';
import SolicitarFuncaoModal from '@/components/solicitar-funcao-modal';
import type { User, PrestadorPerfil, ContratantePerfil } from '@/lib/types';
import { maskPhone, maskCEP } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function EditarPerfilPage() {
  const { funcoes } = useFuncoes();
  const router = useRouter();
  const { user, prestadorPerfil, contratantePerfil, setUser, setPrestadorPerfil, setContratantePerfil, loading: authLoading } = useAppStore();
  const [salvando, setSalvando] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');

  // Dados pessoais
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Prestador
  const [funcaoPrincipal, setFuncaoPrincipal] = useState('');
  const [funcao2, setFuncao2] = useState('');
  const [funcao3, setFuncao3] = useState('');
  const [valorPretendido, setValorPretendido] = useState('');
  const [vestimenta, setVestimenta] = useState('casual');
  const [aceitaNegociacao, setAceitaNegociacao] = useState(false);
  const [descricao, setDescricao] = useState('');

  // Contratante
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [descricaoEmpresa, setDescricaoEmpresa] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [showSolicitarFuncao, setShowSolicitarFuncao] = useState(false);

  const buscarCepApi = async (cepVal: string) => {
    const cepLimpo = cepVal.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro || endereco);
        setBairro(data.bairro || bairro);
        setCidade(data.localidade || cidade);
        setEstado(data.uf || estado);
      }
    } catch {} finally {
      setBuscandoCep(false);
    }
  };

  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setCelular(user.celular || '');
      setCep(user.cep || '');
      setEndereco(user.endereco || '');
      setNumero(user.numero || '');
      setComplemento(user.complemento || '');
      setBairro(user.bairro || '');
      setCidade(user.cidade || '');
      setEstado(user.estado || '');
      setFotoPreview(user.foto_url || '');
    }
    if (prestadorPerfil) {
      setFuncaoPrincipal(prestadorPerfil.funcao_principal || '');
      setFuncao2(prestadorPerfil.funcao_2 || '');
      setFuncao3(prestadorPerfil.funcao_3 || '');
      setValorPretendido(prestadorPerfil.valor_pretendido?.toString() || '');
      setVestimenta(prestadorPerfil.vestimenta || 'casual');
      setAceitaNegociacao(prestadorPerfil.aceita_negociacao || false);
      setDescricao(prestadorPerfil.descricao || '');
    }
    if (contratantePerfil) {
      setNomeEmpresa(contratantePerfil.nome_empresa || '');
      setDescricaoEmpresa(contratantePerfil.descricao || '');
    }
  }, [user, prestadorPerfil, contratantePerfil]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSalvar = async () => {
    if (!user) return;
    if (!nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSalvando(true);
    try {
      let fotoUrl = user.foto_url;
      if (fotoFile) {
        const url = await uploadImage(fotoFile, 'avatars', user.id);
        if (url) fotoUrl = url;
      }

      const updateRes = await fetch('/api/users/query', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          userId: user.id,
          record: {
            nome: nome.trim(),
            celular: celular.replace(/\D/g, ''),
            cep,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            foto_url: fotoUrl,
            updated_at: new Date().toISOString(),
          },
        }),
      });
      const { error: userError } = await updateRes.json();
      if (userError) throw new Error(userError);

      setUser({ ...user, nome: nome.trim(), celular: celular.replace(/\D/g, ''), cep, endereco, numero, complemento, bairro, cidade, estado, foto_url: fotoUrl } as User);

      if (user.tipo === 'prestador' && prestadorPerfil) {
        const { error } = await supabase
          .from('prestador_perfil')
          .update({
            funcao_principal: funcaoPrincipal,
            funcao_2: funcao2 || null,
            funcao_3: funcao3 || null,
            valor_pretendido: valorPretendido ? parseFloat(valorPretendido) : null,
            vestimenta,
            aceita_negociacao: aceitaNegociacao,
            descricao: descricao || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prestadorPerfil.id);
        if (error) throw error;

        setPrestadorPerfil({
          ...prestadorPerfil,
          funcao_principal: funcaoPrincipal,
          funcao_2: funcao2 || null,
          funcao_3: funcao3 || null,
          valor_pretendido: valorPretendido ? parseFloat(valorPretendido) : null,
          vestimenta,
          aceita_negociacao: aceitaNegociacao,
          descricao: descricao || null,
        } as PrestadorPerfil);
      }

      if (user.tipo === 'contratante' && contratantePerfil) {
        const { error } = await supabase
          .from('contratante_perfil')
          .update({
            nome_empresa: nomeEmpresa || null,
            descricao: descricaoEmpresa || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contratantePerfil.id);
        if (error) throw error;

        setContratantePerfil({
          ...contratantePerfil,
          nome_empresa: nomeEmpresa || null,
          descricao: descricaoEmpresa || null,
        } as ContratantePerfil);
      }

      toast.success('Perfil atualizado!');
      router.push('/perfil');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const isPrestador = user?.tipo === 'prestador';

  return (
    <AuthProvider>
      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          <Header title="Editar Perfil" showBack />

          <div className="page-container space-y-4">
            {/* Foto */}
            <div className="card p-5 text-center">
              <div className="relative w-24 h-24 mx-auto mb-3">
                <div className="w-24 h-24 rounded-full bg-brand-100 overflow-hidden">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="w-10 h-10 text-brand-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Camera className="w-4 h-4 text-white" />
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Dados Pessoais */}
            <h2 className="section-title">Dados Pessoais</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Celular</label>
              <input type="tel" value={celular} onChange={(e) => setCelular(maskPhone(e.target.value))} className="input-field" placeholder="(11) 99999-9999" maxLength={15} />
            </div>

            <h2 className="section-title pt-2">Endereço</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CEP</label>
              <div className="relative">
                <input type="text" value={cep} onChange={(e) => { const v = maskCEP(e.target.value); setCep(v); if (v.replace(/\D/g, '').length === 8) buscarCepApi(v); }} className="input-field" placeholder="00000-000" maxLength={9} />
                {buscandoCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-600" />}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Endereço</label>
              <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="input-field" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Número</label>
                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Complemento</label>
                <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} className="input-field" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bairro</label>
              <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className="input-field" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Cidade</label>
                <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">UF</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="select-field">
                  <option value="">UF</option>
                  {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            {/* Prestador */}
            {isPrestador && (
              <>
                <h2 className="section-title pt-2">Dados Profissionais</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Função Principal *</label>
                  <SearchableSelect
                    value={funcaoPrincipal}
                    onChange={setFuncaoPrincipal}
                    options={funcoes.filter((f) => f !== funcao2 && f !== funcao3)}
                    placeholder="Buscar função..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Função 2</label>
                  <SearchableSelect
                    value={funcao2}
                    onChange={setFuncao2}
                    options={funcoes.filter((f) => f !== funcaoPrincipal && f !== funcao3)}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Função 3</label>
                  <SearchableSelect
                    value={funcao3}
                    onChange={setFuncao3}
                    options={funcoes.filter((f) => f !== funcaoPrincipal && f !== funcao2)}
                    placeholder="Opcional"
                  />
                </div>
                <button type="button" onClick={() => setShowSolicitarFuncao(true)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                  <PlusCircle className="w-4 h-4" /> Não encontrou sua função? Solicitar nova
                </button>
                <SolicitarFuncaoModal open={showSolicitarFuncao} onClose={() => setShowSolicitarFuncao(false)} />
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Valor Pretendido (R$)</label>
                  <input type="number" value={valorPretendido} onChange={(e) => setValorPretendido(e.target.value)} className="input-field" placeholder="0.00" step="0.01" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Vestimenta</label>
                  <select value={vestimenta} onChange={(e) => setVestimenta(e.target.value)} className="select-field">
                    <option value="casual">Casual</option>
                    <option value="social">Social</option>
                    <option value="uniforme">Uniforme</option>
                    <option value="esporte_fino">Esporte Fino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="negociacao" checked={aceitaNegociacao} onChange={(e) => setAceitaNegociacao(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-brand-600" />
                  <label htmlFor="negociacao" className="text-sm text-gray-700">Aceita negociação de valor</label>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Fale sobre você..." />
                </div>
              </>
            )}

            {/* Contratante */}
            {!isPrestador && (
              <>
                <h2 className="section-title pt-2">Dados da Empresa</h2>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nome Fantasia</label>
                  <input type="text" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Descrição</label>
                  <textarea value={descricaoEmpresa} onChange={(e) => setDescricaoEmpresa(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Sobre a empresa..." />
                </div>
              </>
            )}

            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="btn-success w-full flex items-center justify-center gap-2 mt-4"
            >
              {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

          <BottomNav />
        </div>
      )}
    </AuthProvider>
  );
}
