'use client';

import Link from 'next/link';
import { HardHat, Building2, ArrowRight } from 'lucide-react';
import Logo from '@/components/logo';

export default function RegisterTipoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-800 flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Logo size="lg" variant="dark" href="/" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm mx-auto w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complete seu cadastro</h1>
            <p className="text-gray-500 text-sm mt-1">
              Escolha o tipo de conta para continuar
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/register/prestador"
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50 transition-all group"
            >
              <div className="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <HardHat className="w-7 h-7 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Prestador de Serviço</h3>
                <p className="text-sm text-gray-500">Quero trabalhar em eventos e serviços</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" />
            </Link>

            <Link
              href="/register/contratante"
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Building2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Contratante</h3>
                <p className="text-sm text-gray-500">Quero contratar profissionais</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
