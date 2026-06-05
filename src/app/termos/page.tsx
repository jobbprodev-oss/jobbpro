'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function TermosPage() {
  const [termos, setTermos] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTermos();
  }, []);

  const fetchTermos = async () => {
    try {
      const res = await fetch('/api/configuracoes');
      const data = await res.json();
      setTermos(data?.termos_uso || '');
    } catch (err) {
      console.error('Erro ao buscar termos:', err);
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
            <FileText className="w-5 h-5 text-brand-400" />
            <h1 className="text-lg font-bold">Termo de Uso</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {termos ? (
          <div className="prose prose-invert max-w-none">
            <div className="bg-gray-800 rounded-lg p-8">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {termos}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">Termos não disponíveis</h2>
            <p className="text-gray-500">Os termos de uso ainda não foram configurados pela administração.</p>
          </div>
        )}
      </main>
    </div>
  );
}
