'use client';

import Link from 'next/link';
import { Briefcase, Users, Zap, Star, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 via-brand-700 to-brand-900">
      {/* Header */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-brand-600" />
          </div>
          <span className="text-xl font-bold text-white">JOBBPRO</span>
        </div>
        <Link href="/login" className="text-white/90 hover:text-white font-medium text-sm">
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-4 h-4 text-yellow-300" />
          <span className="text-white/90 text-sm font-medium">Match inteligente de serviços</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
          Conecte-se ao<br />
          <span className="text-yellow-300">serviço certo</span>
        </h1>
        <p className="text-white/80 text-base leading-relaxed mb-8 max-w-sm mx-auto">
          Encontre profissionais disponíveis ou vagas compatíveis de forma automática. 
          Rápido, prático e seguro.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/register/prestador"
            className="btn-primary flex items-center justify-center gap-2 bg-white text-brand-700 hover:bg-gray-100 shadow-xl"
          >
            <Users className="w-5 h-5" />
            Sou Prestador
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register/contratante"
            className="btn-secondary flex items-center justify-center gap-2 border-brand-600 text-brand-600 hover:bg-brand-50"
          >
            <Briefcase className="w-5 h-5" />
            Sou Contratante
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-10">
        <div className="grid gap-4">
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-yellow-500" />}
            title="Match Automático"
            description="Conectamos profissionais e vagas automaticamente por função, data e horário."
          />
          <FeatureCard
            icon={<Star className="w-6 h-6 text-yellow-500" />}
            title="Avaliações"
            description="Sistema de avaliação mútua para garantir qualidade e confiança."
          />
          <FeatureCard
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            title="Contratação Rápida"
            description="Encontre e contrate em minutos. Sem burocracia, sem complicação."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-10 bg-white/5 backdrop-blur-sm rounded-t-3xl">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Como funciona?</h2>
        <div className="space-y-6">
          <Step number="1" title="Cadastre-se" description="Crie sua conta como prestador ou contratante em menos de 2 minutos." />
          <Step number="2" title="Configure seu perfil" description="Adicione suas funções, disponibilidade e valor pretendido." />
          <Step number="3" title="Receba Matches" description="O sistema encontra automaticamente as melhores oportunidades para você." />
          <Step number="4" title="Conecte-se" description="Aceite propostas, trabalhe e avalie. Simples assim!" />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center">
        <p className="text-white/50 text-sm">
          © 2024 JOBBPRO. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex gap-4 items-start">
      <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold mb-1">{title}</h3>
        <p className="text-white/70 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full bg-yellow-400 text-brand-900 font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-white/60 text-sm mt-0.5">{description}</p>
      </div>
    </div>
  );
}
