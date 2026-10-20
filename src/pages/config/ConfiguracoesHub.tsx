import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Apple,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Handshake,
  History,
  ListTree,
  Package,
  Palette,
  PanelTop,
  Phone,
  Pill,
  Plug,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Upload,
  UserCog,
  UserRound,
  Users,
  Wallet,
  FileQuestion,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { getPermissions, type RolePermissions } from '@/lib/permissions'

interface CardDef {
  titulo: string
  descricao: string
  rota: string
  icone: LucideIcon
  permitido: (p: RolePermissions) => boolean
}

interface GrupoDef {
  titulo: string
  cards: CardDef[]
}

const config = (p: RolePermissions) => p.canAccessConfigClinica

const GRUPOS: GrupoDef[] = [
  {
    titulo: 'Área médica',
    cards: [
      {
        titulo: 'Documentos para Receituário',
        descricao: 'Modelos de receitas, exames e atestados em pastas.',
        rota: '/config/cadastros/modelos-documentos',
        icone: FileText,
        permitido: config,
      },
      {
        titulo: 'Planilha de Exames',
        descricao: 'Catálogo de exames com faixas de referência por sexo.',
        rota: '/config/cadastros/catalogo-exames',
        icone: FlaskConical,
        permitido: config,
      },
      {
        titulo: 'Cadastro de Alimentos',
        descricao: 'Tabela nutricional de alimentos e porções.',
        rota: '/config/cadastros/alimentos',
        icone: Apple,
        permitido: config,
      },
      {
        titulo: 'Formulários de Anamnese',
        descricao: 'Monte os formulários de anamnese usados no prontuário.',
        rota: '/config/formularios-anamnese',
        icone: ClipboardList,
        permitido: config,
      },
      {
        titulo: 'Questionários de Apoio',
        descricao: 'Questionários com perguntas, aplicação e peso.',
        rota: '/config/questionarios-apoio',
        icone: FileQuestion,
        permitido: config,
      },
    ],
  },
  {
    titulo: 'Gestão e finanças',
    cards: [
      {
        titulo: 'Tabelas, Convênios e Seguradoras',
        descricao: 'Tabelas de preço, convênios e seguradoras atendidos.',
        rota: '/config/cadastros/tabelas-convenios',
        icone: Handshake,
        permitido: config,
      },
      {
        titulo: 'Cadastro de Procedimentos',
        descricao: 'Preço, custo, sessões e comissão de cada procedimento.',
        rota: '/config/cadastros/procedimentos',
        icone: Stethoscope,
        permitido: config,
      },
      {
        titulo: 'Contas Correntes',
        descricao: 'Caixas, bancos e cartões dos lançamentos financeiros.',
        rota: '/config/cadastros/contas-correntes',
        icone: Wallet,
        permitido: config,
      },
      {
        titulo: 'Plano de Contas',
        descricao: 'Classificação de receitas e despesas.',
        rota: '/config/cadastros/plano-contas',
        icone: ListTree,
        permitido: config,
      },
      {
        titulo: 'Formas de Pagamento',
        descricao: 'Parcelamento, taxas e prazos por forma de pagamento.',
        rota: '/config/cadastros/formas-pagamento',
        icone: CreditCard,
        permitido: config,
      },
      {
        titulo: 'Unidades/Filiais',
        descricao: 'Unidades da clínica e seus dados cadastrais.',
        rota: '/config/cadastros/unidades',
        icone: Building2,
        permitido: config,
      },
      {
        titulo: 'Pacotes',
        descricao: 'Pacotes de aplicações com desconto por quantidade.',
        rota: '/config/pacotes',
        icone: Package,
        permitido: (p) => p.canAccessPacotesConfig,
      },
    ],
  },
  {
    titulo: 'Gerais',
    cards: [
      {
        titulo: 'Setores da Agenda',
        descricao: 'Setores com número próprio para SMS.',
        rota: '/config/cadastros/setores-agenda',
        icone: Phone,
        permitido: config,
      },
      {
        titulo: 'Cores da Agenda',
        descricao: 'Nome e cor de cada status de atendimento.',
        rota: '/config/cores-agenda',
        icone: Palette,
        permitido: config,
      },
      {
        titulo: 'Tipos de Agendamento',
        descricao: 'Tipos de atendimento, duração padrão e cor.',
        rota: '/config/cadastros/tipos-agendamento',
        icone: CalendarClock,
        permitido: config,
      },
      {
        titulo: 'Usuários do Sistema',
        descricao: 'Equipe, perfis de acesso e status dos usuários.',
        rota: '/config/equipe',
        icone: Users,
        permitido: (p) => p.canAccessEquipe,
      },
      {
        titulo: 'Cabeçalho e Rodapé',
        descricao: 'Modelos de impressão com margens e modelo padrão.',
        rota: '/config/cadastros/cabecalhos-rodapes',
        icone: PanelTop,
        permitido: config,
      },
      {
        titulo: 'Parâmetros do Sistema',
        descricao: 'Horário de funcionamento, dados da clínica e favoritos.',
        rota: '/config/parametros',
        icone: SlidersHorizontal,
        permitido: config,
      },
      {
        titulo: 'Cadastro de Farmácias',
        descricao: 'Farmácias parceiras e de manipulação.',
        rota: '/config/cadastros/farmacias',
        icone: Pill,
        permitido: config,
      },
      {
        titulo: 'Importação MedX',
        descricao: 'Importe pacientes e dados exportados do MedX.',
        rota: '/config/importacao-medx',
        icone: Upload,
        permitido: (p) => p.canAccessImportacoes,
      },
      {
        titulo: 'Minha Conta',
        descricao: 'Seus dados de acesso e segurança.',
        rota: '/config/conta',
        icone: UserRound,
        permitido: () => true,
      },
    ],
  },
  {
    titulo: 'Auditoria e integrações',
    cards: [
      {
        titulo: 'Auditoria de Eventos',
        descricao: 'Histórico de ações realizadas no sistema.',
        rota: '/config/auditoria',
        icone: History,
        permitido: (p) => p.canManageUsers,
      },
      {
        titulo: 'Integrações e Mensagens',
        descricao: 'Intenção de uso de integrações e extrato de uso da IA.',
        rota: '/config/integracoes',
        icone: Plug,
        permitido: (p) => p.canManageUsers,
      },
    ],
  },
]

export default function ConfiguracoesHub() {
  const { user } = useAuth()
  const perms = getPermissions(user?.papel)
  const [busca, setBusca] = useState('')

  const q = busca.trim().toLowerCase()
  const grupos = GRUPOS.map((g) => ({
      ...g,
      cards: g.cards.filter(
        (c) =>
          c.permitido(perms) &&
          (!q || c.titulo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)),
      ),
  })).filter((g) => g.cards.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight flex items-center gap-2">
            <UserCog className="h-7 w-7 text-[#166A5A]" />
            Configurações
          </h1>
          <p className="text-sm text-[#667C78]">
            Cadastros de apoio, parâmetros e preferências da clínica.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar configuração..."
            aria-label="Buscar configuração"
            className="pl-9 rounded-xl border-[#E3E7E5]"
          />
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#667C78]">
          Nenhuma configuração encontrada para a busca.
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.titulo} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#667C78]">{g.titulo}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {g.cards.map((c) => {
                const Icone = c.icone
                return (
                  <Card
                    key={c.rota}
                    className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-5 flex flex-col gap-4 h-full">
                      <div className="flex items-start gap-3">
                        <span className="h-9 w-9 shrink-0 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                          <Icone className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#1C2B29]">{c.titulo}</h3>
                          <p className="text-xs text-[#667C78] mt-0.5">{c.descricao}</p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs border-[#E3E7E5] text-[#166A5A] hover:bg-[#E2F0EB]"
                        >
                          <Link to={c.rota} aria-label={`Abrir ${c.titulo}`}>
                            Abrir
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
