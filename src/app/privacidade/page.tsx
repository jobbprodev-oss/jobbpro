'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PrivacidadePage() {
  const [politica, setPolitica] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolitica();
  }, []);

  const fetchPolitica = async () => {
    try {
      const res = await fetch('/api/configuracoes');
      const data = await res.json();
      setPolitica(data?.politica_privacidade || '');
    } catch (err) {
      console.error('Erro ao buscar política:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-700 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-400" />
            <h1 className="text-lg font-bold">Política de Privacidade</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {politica ? (
          <div className="prose prose-invert max-w-none">
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {politica}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Política não disponível</h2>
            <p className="text-gray-500">A política de privacidade ainda não foi configurada pela administração.</p>
          </div>
        )}
      </main>
    </div>
  );
}
