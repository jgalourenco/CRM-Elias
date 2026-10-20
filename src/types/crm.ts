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

export type StatusAtendimento =
  | 'Agendado'
  | 'Confirmado'
  | 'Chegou'
  | 'Em_atendimento'
  | 'Realizado'
  | 'No_show'
  | 'Cancelado'

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
  // Ficha completa (inspirada no MedX)
  nome_social?: string
  rg?: string
  nr_prontuario?: string
  vip?: boolean
  excluir_marketing?: boolean
  mala_direta?: boolean
  tags?: string
  tipo?: string
  matricula?: string
  numero_cns?: string
  telefone2?: string
  celular?: string
  telefone_comercial?: string
  contato?: string
  regiao?: string
  empresa?: string
  referencia?: string
  conheceu_por?: string
  indicado_por?: string
  estado_civil?: string
  profissao?: string
  escolaridade?: string
  religiao?: string
  pai?: string
  mae?: string
  acompanhante?: string
  filhos?: number
  conjuge?: string
  // Notas clínicas do prontuário
  diagnosticos?: string
  historia_pregressa?: string
  medicamentos_em_uso?: string
  alergias_alerta?: string
  obs_importantes?: string
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
  hora_chegada?: string
  hora_inicio_atendimento?: string
  hora_fim_atendimento?: string
  tipo_agendamento_id?: string
  setor_id?: string
  duracao_min?: number
  serie_recorrencia_id?: string
  numero_recorrencia?: number
  total_recorrencias?: number
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
    tipo_agendamento_id?: TipoAgendamento
    setor_id?: SetorAgenda
  }
}

export type StatusExame = 'Normal' | 'Alterado' | 'Atenção'

export interface ExameLaboratorial {
  id: string
  paciente_id: string
  data: string
  nome_exame: string
  resultado: string
  unidade?: string
  valor_referencia?: string
  status?: StatusExame
  laboratorio?: string
  observacoes?: string
  created: string
  updated: string
  expand?: {
    paciente_id?: Paciente
  }
}

export interface Nota {
  id: string
  usuario_id?: string
  data: string
  memo: string
  concluido?: boolean
  created: string
  updated: string
  expand?: {
    usuario_id?: Usuario
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

export type UserRole =
  | 'Administrador'
  | 'Gestor'
  | 'Profissional'
  | 'Visitante'
  | 'Gestor/Recepção'
  | 'Profissional/Saúde'
  | 'Visualização'
  | 'Recepção'
  | 'Financeiro'

export interface Usuario {
  id: string
  email: string
  name: string
  avatar?: string
  papel?: UserRole
  ativo?: boolean
  precisa_trocar_senha?: boolean
  mfa_enabled?: boolean
  mfa_configured_at?: string
  created: string
  updated: string
}

export interface MfaStatusResponse {
  enabled: boolean
  configuredAt: string | null
  recoveryCodesRemaining: number
  recoveryCodesTotal: number
  hasPendingSetup: boolean
}

export interface MfaSetupResponse {
  secret: string
  otpauthUrl: string
  recoveryCodes: string[]
  issuer: string
  account: string
}

export interface MfaChallengeData {
  requiresTwoFactor: true
  challengeToken: string
  mfaType: 'totp'
  user: {
    id: string
    email: string
    name: string
  }
}

export interface MedXImportacao {
  id: string
  nome_arquivo: string
  tipo?: string
  total_registros: number
  importados: number
  erros: number
  status?: 'concluida' | 'com_erro'
  usuario_nome?: string
  log_erros: Array<{ linha: number; nome?: string; erro: string }>
  criado_por?: string
  created: string
  updated: string
}

// ---------------------------------------------------------------------------
// Fase 1 — cadastros de apoio, financeiro, estoque, sessões e prontuário
// ---------------------------------------------------------------------------
interface Base {
  id: string
  created: string
  updated: string
}

export interface Procedimento extends Base {
  nome: string
  categoria?: string
  preco?: number
  custo?: number
  nr_sessoes?: number
  comissao_pct?: number
  ativo?: boolean
}

export interface TabelaConvenio extends Base {
  nome: string
  observacoes?: string
}

export type TipoContaCorrente = 'Caixa' | 'Banco' | 'Cartão'
export interface ContaCorrente extends Base {
  nome: string
  tipo?: TipoContaCorrente
  encargos_pct?: number
}

export interface PlanoConta extends Base {
  classificacao: string
  nome?: string
  tipo?: 'Receita' | 'Despesa'
}

export interface FormaPagamento extends Base {
  nome: string
  max_parcelas?: number
  taxa_adm_pct?: number
  exige_documento?: boolean
  prazo_primeira_parcela?: number
}

export interface Unidade extends Base {
  nome: string
  razao_social?: string
  cpf_cnpj?: string
  cnaes?: string
  logradouro?: string
  cidade?: string
  uf?: string
  ativo?: boolean
}

export interface SetorAgenda extends Base {
  nome: string
  ddd?: string
  telefone?: string
}

export interface TipoAgendamento extends Base {
  nome: string
  duracao_min?: number
  cor?: string
}

export interface Farmacia extends Base {
  nome: string
  email?: string
  telefone?: string
  telefone2?: string
  celular?: string
}

export interface CatalogoExame extends Base {
  nome: string
  grupo?: string
  peso?: number
  volume?: number
  min_m?: number
  max_m?: number
  min_f?: number
  max_f?: number
}

export interface Alimento extends Base {
  nome: string
  apresentacao?: string
  kcal?: number
  gramas?: number
  carboidratos?: number
  proteinas?: number
  gorduras?: number
  fibras?: number
}

export type TipoModeloDocumento = 'Receita' | 'Exame' | 'Atestado' | 'Outro'
export interface ModeloDocumento extends Base {
  titulo: string
  pasta?: string
  tipo?: TipoModeloDocumento
  conteudo?: string
}

export interface CabecalhoRodape extends Base {
  nome: string
  cabecalho?: string
  rodape?: string
  margem_topo?: number
  margem_base?: number
  padrao?: boolean
}

export interface Parametro<T = Record<string, unknown>> extends Base {
  chave: string
  valor: T
}

export type TipoItemFormulario = 'titulo' | 'rotulo' | 'caixa_texto' | 'painel_check' | 'painel_radio'
export interface ItemFormulario {
  id: string
  tipo: TipoItemFormulario
  rotulo: string
  opcoes?: string[]
}
export interface FormularioAnamnese extends Base {
  nome: string
  estrutura: ItemFormulario[]
  ativo?: boolean
}

export type TipoPerguntaApoio = 'Frequência' | 'Intensidade' | 'Sim ou Não' | 'Texto'
export interface PerguntaApoio {
  id: string
  nome: string
  tipo: TipoPerguntaApoio
  aplicacao: 'Ambos os sexos' | 'Feminino' | 'Masculino'
  peso: number
}
export interface QuestionarioApoio extends Base {
  nome: string
  perguntas: PerguntaApoio[]
  ativo?: boolean
}
export interface QuestionarioResposta extends Base {
  paciente_id: string
  questionario_id?: string
  questionario_nome?: string
  respostas: Record<string, string | number>
  pontuacao?: number
  data?: string
}

export interface EstoqueItem extends Base {
  nome: string
  apresentacao?: string
  unidade?: string
  saldo?: number
  minimo?: number
  oculto?: boolean
}
export interface EstoqueMovimento extends Base {
  item_id: string
  tipo: 'Entrada' | 'Saída' | 'Ajuste'
  quantidade: number
  data?: string
  motivo?: string
  origem?: string
  expand?: { item_id?: EstoqueItem }
}

export interface SessaoVenda extends Base {
  paciente_id: string
  procedimento_id?: string
  procedimento_nome?: string
  data_venda?: string
  quantidade?: number
  realizadas?: number
  concluida?: boolean
  fatura_id?: string
  expand?: { paciente_id?: Paciente; procedimento_id?: Procedimento }
}

export type StatusFatura = 'Fatura' | 'Paga' | 'Pendência' | 'Cancelada'
export interface ItemFatura {
  procedimento_id?: string
  descricao: string
  quantidade: number
  valor_unitario: number
}
export interface Fatura extends Base {
  paciente_id: string
  data: string
  valor?: number
  forma_pagamento_id?: string
  tabela?: string
  unidade?: string
  guia_nr?: string
  nf?: string
  recibo?: string
  fechado?: boolean
  status?: StatusFatura
  observacoes?: string
  itens?: ItemFatura[]
  expand?: { paciente_id?: Paciente; forma_pagamento_id?: FormaPagamento }
}

export interface ContaLancamento extends Base {
  natureza: 'Receber' | 'Pagar'
  descricao: string
  vencimento: string
  valor?: number
  pago?: number
  conta_id?: string
  classificacao_id?: string
  unidade?: string
  nr_controle?: string
  pagamentos?: PagamentoLancamento[]
  expand?: { conta_id?: ContaCorrente; classificacao_id?: PlanoConta }
}

export type TipoEvolucao = 'Evolução' | 'Anamnese' | 'Orientação'
export interface EvolucaoProntuario extends Base {
  paciente_id: string
  data?: string
  texto?: string
  profissional?: string
  tipo?: TipoEvolucao
}

export type TipoDocumentoPaciente =
  | 'Receita'
  | 'Exame'
  | 'Solicitação'
  | 'Resultado'
  | 'Atestado'
  | 'Outro'
export interface DocumentoPaciente extends Base {
  paciente_id: string
  titulo: string
  tipo?: TipoDocumentoPaciente
  data?: string
  arquivo?: string
  observacoes?: string
}

export interface PesquisaQualidade extends Base {
  paciente_id?: string
  data?: string
  notas: Record<string, number>
  comentario?: string
  expand?: { paciente_id?: Paciente }
}

export interface AuditoriaEvento extends Base {
  modulo?: string
  acao?: string
  usuario?: string
  descricao?: string
  data?: string
}

export interface IaExtrato extends Base {
  data?: string
  area?: string
  pergunta?: string
  resposta?: string
}

export interface PagamentoLancamento {
  data: string
  valor: number
  tipo: 'baixa' | 'estorno'
  conta_id?: string
  observacao?: string
}

export interface ProcedimentoInsumo {
  id: string
  procedimento_id: string
  item_id: string
  quantidade: number
  created: string
  updated: string
  expand?: { item_id?: EstoqueItem; procedimento_id?: Procedimento }
}
