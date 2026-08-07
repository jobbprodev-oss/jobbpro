'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, FileText, Shield } from 'lucide-react';

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  tipo: 'termos' | 'privacidade';
}

export default function LegalModal({ open, onClose, tipo }: LegalModalProps) {
  const [conteudo, setConteudo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/configuracoes', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setConteudo(tipo === 'termos' ? data?.termos_uso || '' : data?.politica_privacidade || '');
      })
      .catch(() => setConteudo(''))
      .finally(() => setLoading(false));
  }, [open, tipo]);

  if (!open) return null;

  const titulo = tipo === 'termos' ? 'Termo de Uso' : 'Política de Privacidade';
  const Icon = tipo === 'termos' ? FileText : Shield;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            </div>
          ) : conteudo ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{conteudo}</div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Conteúdo ainda não configurado pela administração.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-primary w-full">Fechar</button>
        </div>
      </div>
    </div>
  );
}
