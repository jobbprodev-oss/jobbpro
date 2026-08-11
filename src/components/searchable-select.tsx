'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ value, onChange, options, placeholder = 'Selecione...', className = '' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setCoords({
      top: openUp ? rect.top - Math.min(spaceAbove, 320) : rect.bottom,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(160, Math.min(320, openUp ? spaceAbove : spaceBelow)),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open]);

  const filtradas = options.filter((o) =>
    o.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setOpen(!open); setBusca(''); }}
        className="input-field flex items-center justify-between gap-2 text-left"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && coords && (
        <div
          className="fixed z-[100] bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col overflow-hidden"
          style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxHeight }}
        >
          <div className="p-2 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar função..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtradas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Nenhuma função encontrada</p>
            ) : (
              filtradas.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => { onChange(o); setOpen(false); setBusca(''); }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 transition-colors ${o === value ? 'bg-brand-50 text-brand-600 font-medium' : 'text-gray-700'}`}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
