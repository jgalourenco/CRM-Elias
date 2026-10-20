import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Package,
  Stethoscope,
  FileText,
  FlaskConical,
  Apple,
  Handshake,
  Wallet,
  ListTree,
  CreditCard,
  Building2,
  Phone,
  CalendarClock,
  Pill,
  PanelTop,
} from 'lucide-react'
import {
  procedimentosService,
  tabelasConveniosService,
  contasCorrentesService,
  planoContasService,
  formasPagamentoService,
  unidadesService,
  setoresAgendaService,
  tiposAgendamentoService,
  farmaciasService,
  catalogoExamesService,
  alimentosService,
  modelosDocumentosService,
  cabecalhosRodapesService,
} from '@/services/crm'
import InsumosProcedimentoDialog from './InsumosProcedimentoDialog'

export type Registro = { id: string } & Record<string, unknown>

/** Contrato mínimo dos serviços criados por `crudService`. */
export interface CadastroService {
  list(filter?: string, sort?: string): Promise<Registro[]>
  create(data: Record<string, unknown>): Promise<Registro>
  update(id: string, data: Record<string, unknown>): Promise<Registro>
  delete(id: string): Promise<unknown>
}

export type TipoCampo =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'percent'
  | 'bool'
  | 'select'
  | 'date'
  | 'color'

export interface CampoDef {
  name: string
  label: string
  type: TipoCampo
  required?: boolean
  options?: string[]
  hint?: string
  placeholder?: string
  /** Ocupa as duas colunas do formulário. */
  full?: boolean
  rows?: number
}

export type FormatoColuna = 'text' | 'money' | 'percent' | 'bool' | 'number' | 'color'

export interface ColunaDef {
  name: string
  label: string
  format?: FormatoColuna
}

/** Propriedades do diálogo aberto por uma ação extra de linha. */
export interface AcaoExtraProps {
  registro: Registro
  onClose: () => void
}

/** Botão adicional por linha que abre um diálogo próprio do cadastro. */
export interface AcaoExtraDef {
  id: string
  label: string
  icone?: LucideIcon
  Componente: ComponentType<AcaoExtraProps>
}

export interface CadastroDef {
  slug: string
  titulo: string
  descricao: string
  singular: string
  icone: LucideIcon
  servico: CadastroService
  colunas: ColunaDef[]
  campos: CampoDef[]
  /** Campos considerados na busca. */
  busca: string[]
  /** Campo usado como nome do registro (toasts e auditoria). */
  nomeCampo: string
  sort: string
  /** Ação extra "Calcular margem" (preço − custo). */
  margem?: boolean
  /** Ao marcar este campo booleano, desmarca os demais registros. */
  unicoBool?: string
  /** Ações extras por linha (ex.: insumos do procedimento). */
  acoesExtras?: AcaoExtraDef[]
}

const svc = (s: unknown) => s as CadastroService

export const CADASTROS: CadastroDef[] = [
  {
    slug: 'procedimentos',
    titulo: 'Cadastro de Procedimentos',
    descricao: 'Procedimentos oferecidos, com preço, custo, número de sessões e comissão.',
    singular: 'procedimento',
    icone: Stethoscope,
    servico: svc(procedimentosService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'categoria'],
    margem: true,
    acoesExtras: [
      { id: 'insumos', label: 'Insumos', icone: Package, Componente: InsumosProcedimentoDialog },
    ],
    colunas: [
      { name: 'nome', label: 'Procedimento' },
      { name: 'categoria', label: 'Categoria' },
      { name: 'preco', label: 'Preço', format: 'money' },
      { name: 'custo', label: 'Custo', format: 'money' },
      { name: 'nr_sessoes', label: 'Sessões', format: 'number' },
      { name: 'comissao_pct', label: 'Comissão', format: 'percent' },
      { name: 'ativo', label: 'Ativo', format: 'bool' },
    ],
    campos: [
      { name: 'nome', label: 'Procedimento', type: 'text', required: true, full: true },
      { name: 'categoria', label: 'Categoria', type: 'text' },
      { name: 'nr_sessoes', label: 'Nº de sessões', type: 'number' },
      { name: 'preco', label: 'Preço (R$)', type: 'money' },
      { name: 'custo', label: 'Custo (R$)', type: 'money' },
      { name: 'comissao_pct', label: 'Comissão (%)', type: 'percent' },
      { name: 'ativo', label: 'Procedimento ativo', type: 'bool' },
    ],
  },
  {
    slug: 'tabelas-convenios',
    titulo: 'Tabelas, Convênios e Seguradoras',
    descricao: 'Tabelas de preço, convênios e seguradoras atendidos pela clínica.',
    singular: 'tabela/convênio',
    icone: Handshake,
    servico: svc(tabelasConveniosService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'observacoes'],
    colunas: [
      { name: 'nome', label: 'Tabela / Convênio' },
      { name: 'observacoes', label: 'Observações' },
    ],
    campos: [
      { name: 'nome', label: 'Tabela / Convênio', type: 'text', required: true, full: true },
      { name: 'observacoes', label: 'Observações', type: 'textarea', full: true },
    ],
  },
  {
    slug: 'contas-correntes',
    titulo: 'Contas Correntes',
    descricao: 'Caixas, contas bancárias e cartões usados nos lançamentos financeiros.',
    singular: 'conta',
    icone: Wallet,
    servico: svc(contasCorrentesService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'tipo'],
    colunas: [
      { name: 'nome', label: 'Conta' },
      { name: 'tipo', label: 'Tipo' },
      { name: 'encargos_pct', label: 'Encargos', format: 'percent' },
    ],
    campos: [
      { name: 'nome', label: 'Conta', type: 'text', required: true, full: true },
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['Caixa', 'Banco', 'Cartão'] },
      { name: 'encargos_pct', label: 'Encargos (%)', type: 'percent' },
    ],
  },
  {
    slug: 'plano-contas',
    titulo: 'Plano de Contas',
    descricao: 'Classificação das receitas e despesas da clínica.',
    singular: 'conta do plano',
    icone: ListTree,
    servico: svc(planoContasService),
    nomeCampo: 'classificacao',
    sort: 'classificacao',
    busca: ['classificacao', 'nome', 'tipo'],
    colunas: [
      { name: 'classificacao', label: 'Classificação' },
      { name: 'nome', label: 'Nome' },
      { name: 'tipo', label: 'Tipo' },
    ],
    campos: [
      { name: 'classificacao', label: 'Classificação', type: 'text', required: true, placeholder: 'Ex.: 1.01' },
      { name: 'tipo', label: 'Tipo', type: 'select', options: ['Receita', 'Despesa'] },
      { name: 'nome', label: 'Nome', type: 'text', full: true },
    ],
  },
  {
    slug: 'formas-pagamento',
    titulo: 'Formas de Pagamento',
    descricao: 'Formas de pagamento aceitas, parcelamento máximo e taxas administrativas.',
    singular: 'forma de pagamento',
    icone: CreditCard,
    servico: svc(formasPagamentoService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome'],
    colunas: [
      { name: 'nome', label: 'Forma' },
      { name: 'max_parcelas', label: 'Máx. parcelas', format: 'number' },
      { name: 'taxa_adm_pct', label: 'Taxa adm.', format: 'percent' },
      { name: 'exige_documento', label: 'Exige documento', format: 'bool' },
      { name: 'prazo_primeira_parcela', label: '1ª parcela (dias)', format: 'number' },
    ],
    campos: [
      { name: 'nome', label: 'Forma de pagamento', type: 'text', required: true, full: true },
      { name: 'max_parcelas', label: 'Máx. de parcelas', type: 'number' },
      { name: 'taxa_adm_pct', label: 'Taxa administrativa (%)', type: 'percent' },
      { name: 'prazo_primeira_parcela', label: 'Prazo da 1ª parcela (dias)', type: 'number' },
      { name: 'exige_documento', label: 'Exige documento (cheque, boleto...)', type: 'bool' },
    ],
  },
  {
    slug: 'unidades',
    titulo: 'Unidades / Filiais',
    descricao: 'Unidades e filiais da clínica com dados cadastrais.',
    singular: 'unidade',
    icone: Building2,
    servico: svc(unidadesService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'razao_social', 'cpf_cnpj', 'cidade'],
    colunas: [
      { name: 'nome', label: 'Unidade' },
      { name: 'razao_social', label: 'Razão social' },
      { name: 'cpf_cnpj', label: 'CPF/CNPJ' },
      { name: 'cidade', label: 'Cidade' },
      { name: 'ativo', label: 'Ativa', format: 'bool' },
    ],
    campos: [
      { name: 'nome', label: 'Unidade', type: 'text', required: true },
      { name: 'razao_social', label: 'Razão social', type: 'text' },
      { name: 'cpf_cnpj', label: 'CPF/CNPJ', type: 'text' },
      { name: 'cnaes', label: 'CNAEs', type: 'text' },
      { name: 'logradouro', label: 'Logradouro', type: 'text', full: true },
      { name: 'cidade', label: 'Cidade', type: 'text' },
      { name: 'uf', label: 'UF', type: 'text' },
      { name: 'ativo', label: 'Unidade ativa', type: 'bool' },
    ],
  },
  {
    slug: 'setores-agenda',
    titulo: 'Setores da Agenda',
    descricao: 'Setores com número próprio para envio de SMS e organização da agenda.',
    singular: 'setor',
    icone: Phone,
    servico: svc(setoresAgendaService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'telefone'],
    colunas: [
      { name: 'nome', label: 'Setor' },
      { name: 'ddd', label: 'DDD' },
      { name: 'telefone', label: 'Telefone' },
    ],
    campos: [
      { name: 'nome', label: 'Setor', type: 'text', required: true, full: true },
      { name: 'ddd', label: 'DDD', type: 'text' },
      { name: 'telefone', label: 'Telefone', type: 'text' },
    ],
  },
  {
    slug: 'tipos-agendamento',
    titulo: 'Tipos de Agendamento',
    descricao: 'Tipos de atendimento com duração padrão e cor na agenda.',
    singular: 'tipo de agendamento',
    icone: CalendarClock,
    servico: svc(tiposAgendamentoService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome'],
    colunas: [
      { name: 'nome', label: 'Tipo' },
      { name: 'duracao_min', label: 'Duração (min)', format: 'number' },
      { name: 'cor', label: 'Cor', format: 'color' },
    ],
    campos: [
      { name: 'nome', label: 'Tipo de agendamento', type: 'text', required: true, full: true },
      { name: 'duracao_min', label: 'Duração (minutos)', type: 'number' },
      { name: 'cor', label: 'Cor', type: 'color' },
    ],
  },
  {
    slug: 'farmacias',
    titulo: 'Cadastro de Farmácias',
    descricao: 'Farmácias parceiras e de manipulação com contatos.',
    singular: 'farmácia',
    icone: Pill,
    servico: svc(farmaciasService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'email', 'telefone', 'celular'],
    colunas: [
      { name: 'nome', label: 'Farmácia' },
      { name: 'email', label: 'E-mail' },
      { name: 'telefone', label: 'Telefone' },
      { name: 'celular', label: 'Celular' },
    ],
    campos: [
      { name: 'nome', label: 'Farmácia', type: 'text', required: true, full: true },
      { name: 'email', label: 'E-mail', type: 'text', full: true },
      { name: 'telefone', label: 'Telefone', type: 'text' },
      { name: 'telefone2', label: 'Telefone 2', type: 'text' },
      { name: 'celular', label: 'Celular', type: 'text' },
    ],
  },
  {
    slug: 'catalogo-exames',
    titulo: 'Planilha de Exames',
    descricao: 'Catálogo de exames com grupo, peso, volume e faixas de referência por sexo.',
    singular: 'exame',
    icone: FlaskConical,
    servico: svc(catalogoExamesService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'grupo'],
    colunas: [
      { name: 'nome', label: 'Exame' },
      { name: 'grupo', label: 'Grupo' },
      { name: 'peso', label: 'Peso', format: 'number' },
      { name: 'volume', label: 'Volume', format: 'number' },
      { name: 'min_m', label: 'Mín. M', format: 'number' },
      { name: 'max_m', label: 'Máx. M', format: 'number' },
      { name: 'min_f', label: 'Mín. F', format: 'number' },
      { name: 'max_f', label: 'Máx. F', format: 'number' },
    ],
    campos: [
      { name: 'nome', label: 'Exame', type: 'text', required: true },
      { name: 'grupo', label: 'Grupo', type: 'text' },
      { name: 'peso', label: 'Peso', type: 'number' },
      { name: 'volume', label: 'Volume', type: 'number' },
      { name: 'min_m', label: 'Mínimo masculino', type: 'number' },
      { name: 'max_m', label: 'Máximo masculino', type: 'number' },
      { name: 'min_f', label: 'Mínimo feminino', type: 'number' },
      { name: 'max_f', label: 'Máximo feminino', type: 'number' },
    ],
  },
  {
    slug: 'alimentos',
    titulo: 'Cadastro de Alimentos',
    descricao: 'Tabela de alimentos com valores nutricionais por porção.',
    singular: 'alimento',
    icone: Apple,
    servico: svc(alimentosService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome', 'apresentacao'],
    colunas: [
      { name: 'nome', label: 'Alimento' },
      { name: 'apresentacao', label: 'Apresentação' },
      { name: 'kcal', label: 'Kcal', format: 'number' },
      { name: 'gramas', label: 'Gramas', format: 'number' },
      { name: 'carboidratos', label: 'Carb.', format: 'number' },
      { name: 'proteinas', label: 'Prot.', format: 'number' },
      { name: 'gorduras', label: 'Gord.', format: 'number' },
      { name: 'fibras', label: 'Fibras', format: 'number' },
    ],
    campos: [
      { name: 'nome', label: 'Alimento', type: 'text', required: true },
      { name: 'apresentacao', label: 'Apresentação', type: 'text', placeholder: 'Ex.: 1 fatia' },
      { name: 'kcal', label: 'Kcal', type: 'number' },
      { name: 'gramas', label: 'Gramas', type: 'number' },
      { name: 'carboidratos', label: 'Carboidratos (g)', type: 'number' },
      { name: 'proteinas', label: 'Proteínas (g)', type: 'number' },
      { name: 'gorduras', label: 'Gorduras (g)', type: 'number' },
      { name: 'fibras', label: 'Fibras (g)', type: 'number' },
    ],
  },
  {
    slug: 'modelos-documentos',
    titulo: 'Documentos para Receituário',
    descricao: 'Modelos de receitas, pedidos de exames e atestados organizados em pastas.',
    singular: 'modelo de documento',
    icone: FileText,
    servico: svc(modelosDocumentosService),
    nomeCampo: 'titulo',
    sort: 'titulo',
    busca: ['titulo', 'pasta', 'tipo'],
    colunas: [
      { name: 'titulo', label: 'Título' },
      { name: 'pasta', label: 'Pasta' },
      { name: 'tipo', label: 'Tipo' },
    ],
    campos: [
      { name: 'titulo', label: 'Título', type: 'text', required: true, full: true },
      { name: 'pasta', label: 'Pasta', type: 'text' },
      {
        name: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: ['Receita', 'Exame', 'Atestado', 'Outro'],
      },
      {
        name: 'conteudo',
        label: 'Conteúdo',
        type: 'textarea',
        full: true,
        rows: 12,
        hint: 'Variáveis disponíveis: {nome} {data} {cpf} {nascimento}',
      },
    ],
  },
  {
    slug: 'cabecalhos-rodapes',
    titulo: 'Cabeçalho e Rodapé',
    descricao: 'Modelos de impressão com cabeçalho, rodapé e margens. Apenas um modelo é o padrão.',
    singular: 'modelo de impressão',
    icone: PanelTop,
    servico: svc(cabecalhosRodapesService),
    nomeCampo: 'nome',
    sort: 'nome',
    busca: ['nome'],
    unicoBool: 'padrao',
    colunas: [
      { name: 'nome', label: 'Modelo' },
      { name: 'margem_topo', label: 'Margem topo', format: 'number' },
      { name: 'margem_base', label: 'Margem base', format: 'number' },
      { name: 'padrao', label: 'Padrão', format: 'bool' },
    ],
    campos: [
      { name: 'nome', label: 'Nome do modelo', type: 'text', required: true, full: true },
      { name: 'cabecalho', label: 'Cabeçalho', type: 'textarea', full: true, rows: 4 },
      { name: 'rodape', label: 'Rodapé', type: 'textarea', full: true, rows: 4 },
      { name: 'margem_topo', label: 'Margem do topo (mm)', type: 'number' },
      { name: 'margem_base', label: 'Margem da base (mm)', type: 'number' },
      { name: 'padrao', label: 'Modelo padrão', type: 'bool' },
    ],
  },
]

export function getCadastro(slug?: string): CadastroDef | undefined {
  return CADASTROS.find((c) => c.slug === slug)
}
