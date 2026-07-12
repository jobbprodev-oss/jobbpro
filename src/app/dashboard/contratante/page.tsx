'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import AuthProvider from '@/components/auth-provider';
import { PlusCircle, Loader2, Briefcase, MapPin, Calendar, Users, Bell } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import type { Vaga } from '@/lib/types';

export default function DashboardContratantePage() {
  const { user, contratantePerfil, notificacoes, loading: authLoading } = useAppStore();
  const matchPendentes = notificacoes.filter((n) => !n.lida && n.tipo === 'match').length;
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contratantePerfil) fetchVagas();
  }, [contratantePerfil]);

  const fetchVagas = async () => {
    if (!contratantePerfil) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vagas')
        .select('*')
        .eq('contratante_id', contratantePerfil.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVagas(data || []);
    } catch (err) {
      console.error('Erro ao buscar vagas:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header title="Início" />

        {authLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div className="page-container">
            {matchPendentes > 0 && (
              <Link href="/dashboard/contratante/matches" className="flex items-center gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl animate-slide-up">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 text-sm">Novo interesse recebido!</p>
                  <p className="text-xs text-amber-700">{matchPendentes} prestador{matchPendentes > 1 ? 'es demonstraram' : ' demonstrou'} interesse nas suas oportunidades. Toque para ver.</p>
                </div>
                <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {matchPendentes > 9 ? '9+' : matchPendentes}
                </span>
              </Link>
            )}

            {/* Welcome */}
            <div className="card p-4 mb-6">
              <p className="text-sm text-gray-500">Olá,</p>
              <h2 className="text-lg font-bold text-gray-900">{user?.nome?.split(' ')[0]}</h2>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-brand-600">{vagas.filter(v => v.ativa).length}</p>
                  <p className="text-xs text-gray-500">Oportunidades ativas</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-emerald-600">{contratantePerfil?.total_contratacoes || 0}</p>
                  <p className="text-xs text-gray-500">Contratações</p>
                </div>
              </div>
            </div>

            {/* Nova Vaga */}
            <Link href="/dashboard/contratante/nova-vaga" className="card-hover p-4 flex items-center gap-4 mb-6 border-2 border-dashed border-brand-200 bg-brand-50/50">
              <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                <PlusCircle className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-700">Publicar Nova Oportunidade</h3>
                <p className="text-sm text-brand-500">Encontre profissionais compatíveis</p>
              </div>
            </Link>

            {/* Minhas Vagas */}
            <h3 className="section-title">Minhas Oportunidades</h3>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            ) : vagas.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma oportunidade publicada</p>
                <p className="text-gray-400 text-sm mt-1">Publique sua primeira oportunidade</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vagas.map((vaga) => (
                  <Link key={vaga.id} href={`/vagas/${vaga.id}`} className="card-hover block p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{vaga.titulo}</h4>
                        <p className="text-sm text-brand-600">{vaga.funcao_principal}</p>
                      </div>
                      <span className={`badge ${
                        !vaga.ativa ? 'bg-gray-100 text-gray-500' :
                        new Date(vaga.data + 'T23:59:59') < new Date() ? 'bg-red-100 text-red-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {!vaga.ativa ? 'Encerrada' : new Date(vaga.data + 'T23:59:59') < new Date() ? 'Expirada' : 'Ativa'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(vaga.data)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{vaga.cidade || vaga.local_servico}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{vaga.vagas_preenchidas > 0 ? 'Oportunidade preenchida' : 'Oportunidade disponível'}</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 mt-2">{formatCurrency(vaga.valor_oferecido)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <BottomNav />
      </div>
    </AuthProvider>
  );
}
