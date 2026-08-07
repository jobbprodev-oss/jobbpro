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
      // Buscar TODAS as funções paginando (evita limite padrão de 1000 do PostgREST)
      const PAGE_SIZE = 1000;
      let allNames: string[] = [];
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from('funcoes')
          .select('nome')
          .eq('ativa', true)
          .order('nome')
          .range(from, from + PAGE_SIZE - 1);
        const names = data?.map((f: any) => f.nome) || [];
        allNames = allNames.concat(names);
        if (names.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      _cache = allNames;
      setFuncoes(allNames);
      setLoading(false);
    })();
  }, []);

  return { funcoes, loading };
}
