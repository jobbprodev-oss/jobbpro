import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

let _cache: string[] | null = null;

export function useFuncoes() {
  const [funcoes, setFuncoes] = useState<string[]>(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) {
      setFuncoes(_cache);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('funcoes')
        .select('nome')
        .eq('ativa', true)
        .order('nome');
      const names = data?.map((f: any) => f.nome) || [];
      _cache = names;
      setFuncoes(names);
      setLoading(false);
    })();
  }, []);

  return { funcoes, loading };
}
