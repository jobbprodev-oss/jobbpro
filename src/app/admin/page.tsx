'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import AuthProvider from '@/components/auth-provider';
import { Loader2, Users, Briefcase, ClipboardList, Star, Shield, LogOut, TrendingUp, AlertTriangle, CreditCard, Tag, Bell, FileText, UserPlus, Users2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { user, notificacoes, loading: authLoading } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<{id: string; nome: string; email: string; created_at: string}[]>([]);

  useEffect(() => {
    const checkAccess = async () => {
      // Esperar auth carregar
      if (authLoading) return;

      // Se o user já está no store como admin, OK
      if (user && user.tipo === 'admin') {
        setAuthorized(true);
        fetchStats();
        return;
      }

      // Se user existe mas não é admin, redirecionar
      if (user && user.tipo !== 'admin') {
        router.push(`/dashboard/${user.tipo}`);
        return;
      }

      // User é null - verificar se tem sessão ativa antes de redirecionar
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Tem sessão mas user não carregou - tentar via API
      try {
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
        });
        const data = await res.json();
        if (data.tipo === 'admin') {
          setAuthorized(true);
          fetchStats();
          return;
        }
      } catch (e) {
        console.error('[ADMIN] check-user error:', e);
      }

      router.push('/login');
    };

    checkAccess();
  }, [user, authLoading]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Users stats via server-side API (bypass RLS)
      const usersRes = await fetch('/api/users/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      });
      const userStats = await usersRes.json();

      const [vagasRes, vagasAtivasRes, matchesRes, matchesPendRes, matchesConcRes, avalsRes] = await Promise.all([
        supabase.from('vagas').select('id', { count: 'exact', head: true }),
        supabase.from('vagas').select('id', { count: 'exact', head: true }).eq('ativa', true),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'concluido'),
        supabase.from('avaliacoes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: userStats.totalUsers || 0,
        totalPrestadores: userStats.prestadores || 0,
        totalContratantes: userStats.contratantes || 0,
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

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || newAdminPassword.length < 6) return;
    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword, nome: newAdminName || 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Admin criado com sucesso!');
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        // Recarregar lista de admins
        const { data: admins } = await supabase
          .from('users')
          .select('id, nome, email, created_at')
          .eq('tipo', 'admin')
          .order('created_at', { ascending: true });
        if (admins) setAdminUsers(admins);
      } else {
        toast.error(data.error || 'Erro ao criar admin');
      }
    } catch (err: any) {
      toast.error('Erro ao criar admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAppStore.getState().reset();
    router.push('/login');
  };

  return (
    <AuthProvider>
      {(authLoading || (loading && !stats)) ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
        </div>
      ) : !authorized ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Verificando acesso...</p>
          </div>
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
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 hidden sm:inline">{user?.nome}</span>
                <Link href="/admin/notificacoes" className="relative p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                  <Bell className="w-5 h-5" />
                  {notificacoes.filter(n => !n.lida).length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notificacoes.filter(n => !n.lida).length > 9 ? '9+' : notificacoes.filter(n => !n.lida).length}
                    </span>
                  )}
                </Link>
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
                <StatCard icon={Briefcase} label="Oportunidades" value={stats.totalVagas} sub={`${stats.vagasAtivas} ativas`} color="yellow" />
                <StatCard icon={ClipboardList} label="Matches" value={stats.totalMatches} color="blue" />
                <StatCard icon={AlertTriangle} label="Pendentes" value={stats.matchesPendentes} color="yellow" />
                <StatCard icon={TrendingUp} label="Concluídos" value={stats.matchesConcluidos} color="emerald" />
                <StatCard icon={Star} label="Avaliações" value={stats.totalAvaliacoes} color="yellow" />
              </div>
            )}

            {/* Navigation */}
            <h3 className="text-lg font-semibold mb-4">Gerenciar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/usuarios" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Users className="w-8 h-8 text-brand-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Usuários</h4>
                <p className="text-sm text-gray-400 mt-1">Criar, editar e gerenciar usuários</p>
              </Link>
              <Link href="/admin/planos" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <CreditCard className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Planos</h4>
                <p className="text-sm text-gray-400 mt-1">Definir planos e valores de acesso</p>
              </Link>
              <Link href="/admin/funcoes" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Tag className="w-8 h-8 text-orange-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Funções</h4>
                <p className="text-sm text-gray-400 mt-1">Gerenciar funções e solicitações</p>
              </Link>
              <Link href="/admin/vagas" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Briefcase className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Oportunidades</h4>
                <p className="text-sm text-gray-400 mt-1">Visualizar e gerenciar oportunidades</p>
              </Link>
              <Link href="/admin/matches" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <ClipboardList className="w-8 h-8 text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Matches</h4>
                <p className="text-sm text-gray-400 mt-1">Acompanhar contratos e serviços</p>
              </Link>
              <Link href="/admin/termos" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <FileText className="w-8 h-8 text-red-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Termos e Políticas</h4>
                <p className="text-sm text-gray-400 mt-1">Configurar termos de uso e privacidade</p>
              </Link>
              <Link href="/admin/admins" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Shield className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Administradores</h4>
                <p className="text-sm text-gray-400 mt-1">Gerenciar acessos administrativos</p>
              </Link>
              <Link href="/admin/indicacoes" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <Users2 className="w-8 h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Indicações</h4>
                <p className="text-sm text-gray-400 mt-1">Visualizar todas as indicações realizadas</p>
              </Link>
              <Link href="/admin/whatsapp-logs" className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-brand-500 transition-colors group">
                <MessageSquare className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white">Logs WhatsApp</h4>
                <p className="text-sm text-gray-400 mt-1">Monitorar envios via NotificaMais</p>
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
