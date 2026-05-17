'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, User, PlusCircle, ClipboardList, CalendarDays } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAppStore();

  const isPrestador = user?.tipo === 'prestador';

  if (!user) return null;

  const navItems = isPrestador
    ? [
        { href: '/dashboard/prestador', icon: Home, label: 'Início' },
        { href: '/dashboard/prestador/vagas', icon: Search, label: 'Vagas' },
        { href: '/dashboard/prestador/disponibilidade', icon: CalendarDays, label: 'Agenda' },
        { href: '/dashboard/prestador/matches', icon: ClipboardList, label: 'Contratos' },
        { href: '/perfil', icon: User, label: 'Perfil' },
      ]
    : [
        { href: '/dashboard/contratante', icon: Home, label: 'Início' },
        { href: '/dashboard/contratante/nova-vaga', icon: PlusCircle, label: 'Nova Vaga' },
        { href: '/dashboard/contratante/matches', icon: ClipboardList, label: 'Contratos' },
        { href: '/perfil', icon: User, label: 'Perfil' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
