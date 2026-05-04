export type UserType = 'prestador' | 'contratante' | 'admin';
export type MatchStatus = 'pendente' | 'aceito' | 'confirmado' | 'recusado' | 'concluido' | 'cancelado';
export type VestimentaTipo = 'social' | 'casual' | 'uniforme' | 'esporte_fino' | 'outro';

export interface User {
  id: string;
  tipo: UserType;
  nome: string;
  cpf_cnpj: string;
  rg?: string;
  data_nascimento?: string;
  celular: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  foto_url?: string;
  foto_documento_url?: string;
  ativo: boolean;
  termo_aceite: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrestadorPerfil {
  id: string;
  user_id: string;
  funcao_principal: string;
  funcao_2?: string;
  funcao_3?: string;
  valor_pretendido?: number;
  vestimenta: VestimentaTipo;
  aceita_negociacao: boolean;
  descricao?: string;
  media_avaliacao: number;
  total_avaliacoes: number;
  total_servicos: number;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
  users?: User;
}

export interface ContratantePerfil {
  id: string;
  user_id: string;
  nome_empresa?: string;
  descricao?: string;
  media_avaliacao: number;
  total_avaliacoes: number;
  total_contratacoes: number;
  created_at: string;
  updated_at: string;
  users?: User;
}

export interface Disponibilidade {
  id: string;
  prestador_id: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  disponivel: boolean;
  created_at: string;
}

export interface Vaga {
  id: string;
  contratante_id: string;
  titulo: string;
  funcao_principal: string;
  funcao_2?: string;
  funcao_3?: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  local_servico: string;
  endereco_completo?: string;
  cep?: string;
  cidade?: string;
  bairro?: string;
  estado?: string;
  valor_oferecido: number;
  vestimenta: VestimentaTipo;
  descricao?: string;
  ativa: boolean;
  termo_aceite: boolean;
  vagas_disponiveis: number;
  vagas_preenchidas: number;
  created_at: string;
  updated_at: string;
  contratante_perfil?: ContratantePerfil & { users?: User };
}

export interface Match {
  id: string;
  vaga_id: string;
  prestador_id: string;
  contratante_id: string;
  status: MatchStatus;
  match_score: number;
  valor_acordado?: number;
  data_match: string;
  data_aceite?: string;
  data_conclusao?: string;
  created_at: string;
  updated_at: string;
  vagas?: Vaga;
  prestador_perfil?: PrestadorPerfil & { users?: User };
  contratante_perfil?: ContratantePerfil & { users?: User };
}

export interface Avaliacao {
  id: string;
  match_id: string;
  avaliador_id: string;
  avaliado_id: string;
  nota: number;
  descricao?: string;
  created_at: string;
  avaliador?: User;
}

export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  link?: string;
  created_at: string;
}

export interface MatchResult {
  prestador_id: string;
  user_id: string;
  nome: string;
  foto_url: string;
  funcao_principal: string;
  valor_pretendido: number;
  media_avaliacao: number;
  match_score: number;
}

export interface VagaCompativel {
  vaga_id: string;
  titulo: string;
  funcao_principal: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  local_servico: string;
  cidade: string;
  bairro?: string;
  valor_oferecido: number;
  vestimenta: VestimentaTipo;
  match_score: number;
  contratante_nome: string;
  contratante_avaliacao: number;
}

export interface PrestadorCompativel {
  prestador_id: string;
  user_id: string;
  nome: string;
  foto_url: string;
  funcao_principal: string;
  valor_pretendido: number;
  media_avaliacao: number;
  total_servicos: number;
  vestimenta: VestimentaTipo;
  match_score: number;
  cidade: string;
}

export const FUNCOES_DISPONIVEIS = [
  'Garçom',
  'Garçonete',
  'Barman',
  'Cozinheiro(a)',
  'Auxiliar de Cozinha',
  'Copeiro(a)',
  'Maitre',
  'Hostess',
  'Recepcionista',
  'Segurança',
  'Manobrista',
  'Limpeza',
  'Promotor(a)',
  'DJ',
  'Fotógrafo(a)',
  'Decorador(a)',
  'Montador(a)',
  'Eletricista',
  'Encanador',
  'Pintor(a)',
  'Pedreiro',
  'Jardineiro(a)',
  'Motorista',
  'Entregador(a)',
  'Auxiliar Geral',
  'Outro',
];

export const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];
