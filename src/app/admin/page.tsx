'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, Users, Briefcase, ClipboardList, Star, Shield, LogOut, TrendingUp, AlertTriangle } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalPrestadores: number;
  totalContratantes: number;
  totalVagas: number;
  vagasAtivas: number;
  totalMatches: number;
  matchesPendentes: number;
  matchesConcluidos: number;
  totalAvaliacoes: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.tipo !== 'admin') {
        router.push(`/dashboard/${user.tipo}`);
        return;
      }
      fetchStats();
    }
  }, [user, authLoading]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersRes, vagasRes, vagasAtivasRes, matchesRes, matchesPendRes, matchesConcRes, avalsRes] = await Promise.all([
        supabase.from('users').select('tipo', { count: 'exact', head: true }),
        supabase.from('vagas').select('id', { count: 'exact', head: true }),
        supabase.from('vagas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
        supabase.from('avaliacoes').select('id', { count: 'exact', head: true }),
      ]);

      const { count: prestCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo', 'prestador');
      const { count: contCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('tipo', 'contratante');

      setStats({
        totalUsers: (usersRes.count || 0),
        totalPrestadores: prestCount || 0,
        totalContratantes: contCount || 0,
        totalVagas: vagasRes.count || 0,
        vagasAtivas: vagasAtivasRes.count || 0,
        totalMatches: matchesRes.count || 0,
        matchesPendentes: matchesPendRes.count || 0,
        matchesConcluidos: matchesConcRes.count || 0,
        totalAvaliacoes: avalsRes.count || 0,
      });
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAppStore.getState().reset();
    router.push('/login');
  };

  return (
    <AuthProvider>
      {(authLoading || loading) ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <header className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">JOBBPRO Admin</h1>
                  <p className="text-xs text-gray-400">Painel Administrativo</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{user?.nome}</span>
                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-6 py-8">
            <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Users} label="Total Usuários" value={stats.totalUsers} color="blue" />
                <StatCard icon={Users} label="Prestadores" value={stats.totalPrestadores} color="emerald" />
                <StatCard icon={Users} label="Contratantes" value={stats.totalContratantes} color="violet" />
                <StatCard icon={Briefcase} label="Vagas" value={stats.totalVagas} sub={`${stats.vagasAtivas} ativas`} color="yellow" />
                <StatCard icon={ClipboardList} label="Matches" value={stats.totalMatches} color="blue" />
                <StatCard icon={AlertTriangle} label="Pendentes" value={stats.matchesPendentes} color="yellow" />
                <StatCard icon={TrendingUp} label="Concluídos" value={stats.matchesConcluidos} color="emerald" />
                <StatCard icon={Star} label="Avaliações" value={stats.totalAvaliacoes} color="yellow" />
              </div>
            )}

            {/* Navigation */}
            <h3 className="text-lg font-semibold mb-4">Gerenciar</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/usuarios" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Users className="w-8 h-8 text-brand-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Usuários</h4>
                <p className="text-sm text-gray-400 mt-1">Gerenciar prestadores e contratantes</p>
              </Link>
              <Link href="/admin/vagas" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Briefcase className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Vagas</h4>
                <p className="text-sm text-gray-400 mt-1">Visualizar e gerenciar vagas</p>
              </Link>
              <Link href="/admin/matches" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <ClipboardList className="w-8 h-8 text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Matches</h4>
                <p className="text-sm text-gray-400 mt-1">Acompanhar contratos e serviços</p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </AuthProvider>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
  };
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
