'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { LogoIcon } from '@/components/logo';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showLogout?: boolean;
}

export default function Header({ title, showBack = false, showNotifications = true, showLogout = true }: HeaderProps) {
  const router = useRouter();
  const { user, notificacoes } = useAppStore();
  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAppStore.getState().reset();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          ) : (
            <Link href={user ? `/dashboard/${user.tipo}` : '/'} className="flex items-center gap-2">
              <LogoIcon size="sm" />
            </Link>
          )}
          {title && <h1 className="text-base font-semibold text-gray-900 truncate">{title}</h1>}
        </div>

        <div className="flex items-center gap-1">
          {showNotifications && user && (
            <Link href="/notificacoes" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {showLogout && user && (
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
