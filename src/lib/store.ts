import { create } from 'zustand';
import type { User, PrestadorPerfil, ContratantePerfil, Notificacao } from './types';

interface AppState {
  user: User | null;
  prestadorPerfil: PrestadorPerfil | null;
  contratantePerfil: ContratantePerfil | null;
  notificacoes: Notificacao[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setPrestadorPerfil: (perfil: PrestadorPerfil | null) => void;
  setContratantePerfil: (perfil: ContratantePerfil | null) => void;
  setNotificacoes: (notificacoes: Notificacao[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  prestadorPerfil: null,
  contratantePerfil: null,
  notificacoes: [],
  loading: true,
  setUser: (user) => set({ user }),
  setPrestadorPerfil: (prestadorPerfil) => set({ prestadorPerfil }),
  setContratantePerfil: (contratantePerfil) => set({ contratantePerfil }),
  setNotificacoes: (notificacoes) => set({ notificacoes }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, prestadorPerfil: null, contratantePerfil: null, notificacoes: [], loading: false }),
}));
