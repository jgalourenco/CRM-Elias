export type FasePaciente =
  | 'Prospeccao'
  | 'Primeira_consulta'
  | 'Ativo'
  | 'Em_acompanhamento'
  | 'Concluido'
  | 'Inativo'

export type Sexo = 'Feminino' | 'Masculino' | 'Outro'

export type TipoAtendimento =
  | 'Consulta'
  | 'Retorno'
  | 'Aplicacao_APP'
  | 'Aplicacao_APP_AV'
  | 'Aplicacao_Manipulado'
  | 'Outro'

export type StatusAtendimento = 'Agendado' | 'Realizado' | 'No_show' | 'Cancelado'

export type TipoLancamento =
  | 'Consulta'
  | 'Retorno'
  | 'Manipulado'
  | 'Aplicacao_APP'
  | 'Aplicacao_APP_AV'
  | 'Pacote'
  | 'Outro'

export type StatusLancamento = 'Pago' | 'Pendente' | 'Cancelado'

export type TipoAplicacaoPacote = 'APP' | 'APP_AV'

export type CanalMensagem = 'WhatsApp' | 'Email'
export type DirecaoMensagem = 'entrada' | 'saida'
export type StatusMensagem = 'enviada' | 'pendente' | 'falhou'

export type CanalProspeccao = 'WhatsApp' | 'Instagram' | 'Telefone' | 'Email' | 'Indicacao'
export type PrioridadeProspeccao = 'alta' | 'media' | 'baixa'
export type EtapaProspeccao =
  | 'primeiro_contato'
  | 'proposta'
  | 'comparacao'
  | 'recomendacao'
  | 'fechamento'

export type FaseRoadmapAutomacao =
  | 'Prospeccao'
  | 'Primeira_consulta'
  | 'Retorno'
  | 'Manipulado'
  | 'Aplicacao_APP'
  | 'Aplicacao_APP_AV'
  | 'D1'
  | 'NF'
  | 'No_show'
  | 'LTV'

export interface Anamnese {
  como_chegou?: string
  indicacao_profissional?: string
  comorbidades?: string[]
  alergias?: string[]
  medicamentos?: string
  objetivos?: string
}

export interface Paciente {
  id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  sexo?: Sexo
  telefone?: string
  email?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  observacoes?: string
  anamnese?: Anamnese
  fase: FasePaciente
  pacote_atual_id?: string
  aplicacoes_restantes?: number
  ltv?: number
  id_cliente?: string
  id_assinatura?: string
  id_convenio?: string
  convenio?: string
  created: string
  updated: string
  expand?: {
    pacote_atual_id?: Pacote
  }
}

export interface Pacote {
  id: string
  nome: string
  tipo_aplicacao: TipoAplicacaoPacote
  quantidade_aplicacoes: number
  valor_total: number
  valor_por_aplicacao: number
  ativo?: boolean
  created: string
  updated: string
}

export interface Prospeccao {
  id: string
  paciente_id: string
  canal?: CanalProspeccao
  prioridade: PrioridadeProspeccao
  etapa: EtapaProspeccao
  data_proximo_contato?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
  }
}

export interface Atendimento {
  id: string
  paciente_id: string
  tipo: TipoAtendimento
  profissional?: string
  data_hora: string
  status: StatusAtendimento
  observacoes?: string
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
  }
}

export interface Lancamento {
  id: string
  paciente_id: string
  descricao: string
  tipo: TipoLancamento
  valor: number
  status: StatusLancamento
  data: string
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
  }
}

export interface Mensagem {
  id: string
  paciente_id: string
  canal: CanalMensagem
  direcao: DirecaoMensagem
  template?: string
  conteudo: string
  status: StatusMensagem
  lida: boolean
  agendada_para?: string
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
  }
}

export interface Automacao {
  id: string
  nome: string
  fase_roadmap: FaseRoadmapAutomacao
  canal: CanalMensagem
  template: string
  gatilho: string
  atraso_minutos?: number
  ativo?: boolean
  created: string
  updated: string
}

export interface Usuario {
  id: string
  email: string
  name: string
  avatar?: string
  papel?: 'Administrador' | 'Recepção' | 'Financeiro'
  created: string
  updated: string
}

export interface MedXImportacao {
  id: string
  nome_arquivo: string
  total_registros: number
  importados: number
  erros: number
  log_erros: Array<{ linha: number; nome?: string; erro: string }>
  criado_por?: string
  created: string
  updated: string
}
