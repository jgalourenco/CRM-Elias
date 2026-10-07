import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  pacientesService,
  prospeccoesService,
  atendimentosService,
  lancamentosService,
  notasService,
  usuariosService,
} from '@/services/crm'
import { Paciente, Prospeccao, Atendimento, Lancamento, Nota, Usuario } from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import UltimosAtendidosCard from '@/components/dashboard/UltimosAtendidosCard'
import NotasLembretesCard from '@/components/notas/NotasLembretesCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react'
import AgendaHojeView from '@/components/agendas/AgendaHojeView'
import { StatusAtendimento } from '@/types/crm'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const { toast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [prospeccoes, setProspeccoes] = useState<Prospeccao[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])

  const loadData = async () => {
    try {
      const [pacRes, prospRes, atRes, lancRes, notasRes, userRes] = await Promise.all([
        pacientesService.list(1, 100),
        prospeccoesService.list(),
        atendimentosService.list('', 'data_hora'),
        lancamentosService.list(),
        notasService.list(),
        usuariosService.list(),
      ])
      setPacientes(pacRes.items)
      setProspeccoes(prospRes)
      setAtendimentos(atRes)
      setLancamentos(lancRes)
      setNotas(notasRes)
      setUsuarios(userRes)
    } catch (err) {
      console.error('Erro ao carregar métricas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleMudarStatusHoje = async (atId: string, status: StatusAtendimento) => {
    try {
      const updateData: Partial<Atendimento> = { status }
      if (status === 'Chegou') {
        updateData.hora_chegada = new Date().toISOString()
      } else if (status === 'Em_atendimento') {
        updateData.hora_inicio_atendimento = new Date().toISOString()
      } else if (status === 'Realizado') {
        updateData.hora_fim_atendimento = new Date().toISOString()
      }
      await atendimentosService.update(atId, updateData)
      toast({
        title: 'Status atualizado',
        description: `Atendimento marcado como ${status.replace('_', ' ')}.`,
      })
      loadData()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o atendimento.',
        variant: 'destructive',
      })
    }
  }

  // CRUD de Notas/Lembretes
  const handleCriarNota = async (novaNota: { memo: string; data: string; usuario_id?: string }) => {
    try {
      await notasService.create({
        ...novaNota,
        concluido: false,
        usuario_id: novaNota.usuario_id || user?.id,
      })
      toast({ title: 'Nota criada', description: 'Lembrete adicionado com sucesso.' })
      const atualizadas = await notasService.list()
      setNotas(atualizadas)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar nota.', variant: 'destructive' })
    }
  }

  const handleAtualizarNota = async (id: string, data: Partial<Nota>) => {
    try {
      await notasService.update(id, data)
      toast({ title: 'Nota atualizada' })
      const atualizadas = await notasService.list()
      setNotas(atualizadas)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar nota.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluirNota = async (id: string) => {
    try {
      await notasService.delete(id)
      toast({ title: 'Nota excluída' })
      const atualizadas = await notasService.list()
      setNotas(atualizadas)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir nota.',
        variant: 'destructive',
      })
    }
  }

  // Iniciar consulta a partir do card Hoje
  const handleIniciarConsulta = async (at: Atendimento) => {
    try {
      await atendimentosService.update(at.id, {
        status: 'Em_atendimento',
        hora_inicio_atendimento: new Date().toISOString(),
      })
      if (at.paciente_id) {
        navigate(`/pacientes/${at.paciente_id}?modo=atendimento&atendimentoId=${at.id}`)
      }
    } catch {
      toast({
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar a consulta.',
        variant: 'destructive',
      })
    }
  }

  // 1. Pacientes Ativos
  const pacientesAtivos = pacientes.filter(
    (p) => p.fase === 'Ativo' || p.fase === 'Em_acompanhamento',
  ).length

  // 2. Prospeccoes Abertas
  const prospeccoesAbertas = prospeccoes.filter((p) => p.etapa !== 'fechamento').length

  // 3. Consultas na Semana (next 7 days)
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const consultasSemana = atendimentos.filter((a) => {
    const d = new Date(a.data_hora)
    return d >= now && d <= in7Days
  }).length

  // 4. Receita Realizada (30d)
  const in30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const receitaRealizada = lancamentos
    .filter((l) => l.status === 'Pago' && new Date(l.data) >= in30DaysAgo)
    .reduce((acc, curr) => acc + curr.valor, 0)

  // Funnel breakdown
  const etapasFunil = [
    {
      key: 'primeiro_contato',
      label: '1º Contato',
      count: prospeccoes.filter((p) => p.etapa === 'primeiro_contato').length,
      color: 'bg-emerald-500',
    },
    {
      key: 'proposta',
      label: 'Proposta / Agendada',
      count: prospeccoes.filter((p) => p.etapa === 'proposta').length,
      color: 'bg-teal-500',
    },
    {
      key: 'comparacao',
      label: 'Comparação',
      count: prospeccoes.filter((p) => p.etapa === 'comparacao').length,
      color: 'bg-cyan-500',
    },
    {
      key: 'recomendacao',
      label: 'Recomendação',
      count: prospeccoes.filter((p) => p.etapa === 'recomendacao').length,
      color: 'bg-amber-500',
    },
    {
      key: 'fechamento',
      label: 'Fechamento',
      count: prospeccoes.filter((p) => p.etapa === 'fechamento').length,
      color: 'bg-[#C9A227]',
    },
  ]
  const totalFunil = Math.max(prospeccoes.length, 1)

  // Weekly Revenue Mock data calculation
  const weeklyData = [
    { sem: 'Sem 1', consultas: 1000, aplicacoes: 2560, manipulados: 350 },
    { sem: 'Sem 2', consultas: 1500, aplicacoes: 1280, manipulados: 700 },
    { sem: 'Sem 3', consultas: 500, aplicacoes: 3360, manipulados: 520 },
    { sem: 'Sem 4', consultas: 2000, aplicacoes: 2560, manipulados: 850 },
    { sem: 'Sem 5', consultas: 1500, aplicacoes: 3840, manipulados: 400 },
    { sem: 'Sem 6', consultas: 1000, aplicacoes: 2960, manipulados: 650 },
    { sem: 'Sem 7', consultas: 2500, aplicacoes: 4200, manipulados: 900 },
    { sem: 'Sem 8', consultas: 2000, aplicacoes: 3800, manipulados: 1050 },
  ]

  const maxWeekly = Math.max(...weeklyData.map((d) => d.consultas + d.aplicacoes + d.manipulados))

  // Próximos Atendimentos (top 5)
  const proximosAtendimentos = [...atendimentos]
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .slice(0, 5)

  // Últimos Lançamentos (top 5)
  const ultimosLancamentos = [...lancamentos]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Dashboard Executivo
          </h1>
          <p className="text-sm text-[#667C78]">
            Visão unificada de atendimentos, faturamento e fluxo de pacientes da Clínica Seleta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/indicadores')}
            className="rounded-xl border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB] text-xs font-semibold gap-1.5 bg-[#E2F0EB]/30"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Indicadores & Insights
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/automacao/regua')}
            className="rounded-xl border-[#E3E7E5] text-xs font-semibold gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#C9A227]" />
            Régua de Automações
          </Button>
          <Button
            onClick={() => navigate('/agendas')}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Calendar className="h-3.5 w-3.5" />
            Ver Agenda Completa
          </Button>
        </div>
      </div>

      {/* PAINEL HOJE EM PRIMEIRO PLANO COM NOTAS/LEMBRETES LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <AgendaHojeView
            atendimentos={atendimentos}
            onNovoAtendimento={() => navigate('/agendas')}
            onMudarStatus={handleMudarStatusHoje}
            onIniciarConsulta={handleIniciarConsulta}
            showNovoButton={true}
          />
        </div>

        {/* Bloco Lateral: Notas e Lembretes Rápidos por Usuário (como na coluna esquerda do MedX) */}
        <div className="lg:col-span-4">
          <NotasLembretesCard
            notas={notas}
            usuarios={usuarios}
            currentUserId={user?.id}
            onCriarNota={handleCriarNota}
            onAtualizarNota={handleAtualizarNota}
            onExcluirNota={handleExcluirNota}
          />
        </div>
      </div>

      {/* BLOCO ÚLTIMOS ATENDIDOS (Estilo MedX: aba "Ver pacientes atendidos" trazida para destaque) */}
      <div className="space-y-2">
        <UltimosAtendidosCard atendimentos={atendimentos} maxItems={5} />
      </div>

      {/* 4 Cards Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pacientes Ativos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Pacientes Ativos
              </span>
              <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-[#1C2B29]">{pacientesAtivos}</span>
              <span className="text-xs text-[#2E8B57] font-medium ml-2">em tratamento</span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">Total cadastrados: {pacientes.length}</p>
          </CardContent>
        </Card>

        {/* Card 2: Prospecções Abertas */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Prospecções Abertas
              </span>
              <div className="h-9 w-9 rounded-xl bg-[#FBF3D9] text-[#C9A227] flex items-center justify-center">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-[#1C2B29]">{prospeccoesAbertas}</span>
              <span className="text-xs text-[#667C78] font-medium ml-2">no funil</span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">Taxa de fechamento: ~28%</p>
          </CardContent>
        </Card>

        {/* Card 3: Consultas na Semana */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Consultas na Semana
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#2E7FA3] flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-[#1C2B29]">{consultasSemana}</span>
              <span className="text-xs text-[#2E7FA3] font-medium ml-2">próx. 7 dias</span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">APP e Consultas integrativas</p>
          </CardContent>
        </Card>

        {/* Card 4: Receita Realizada */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Receita Realizada (30d)
              </span>
              <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#2E8B57] flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-[#1C2B29]">
                {receitaRealizada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <p className="text-xs text-[#2E8B57] font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Lançamentos pagos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Gráfico de Faturamento + Funil */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras Empilhado (2 colunas) */}
        <Card className="lg:col-span-2 rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold text-[#1C2B29]">
                  Faturamento por Semana
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Histórico das últimas 8 semanas com distribuição por tipo de serviço
                </CardDescription>
              </div>
              {/* Legenda */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#166A5A]" />
                  <span className="text-[#667C78]">Consultas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2E7FA3]" />
                  <span className="text-[#667C78]">Aplicações</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D68910]" />
                  <span className="text-[#667C78]">Manipulados</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Visual Bar Chart */}
            <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-[#E3E7E5]">
              {weeklyData.map((d, i) => {
                const total = d.consultas + d.aplicacoes + d.manipulados
                const hConsultas = (d.consultas / maxWeekly) * 100
                const hAplicacoes = (d.aplicacoes / maxWeekly) * 100
                const hManipulados = (d.manipulados / maxWeekly) * 100

                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <span className="text-[10px] font-semibold text-[#667C78] opacity-0 group-hover:opacity-100 transition-opacity">
                      {(total / 1000).toFixed(1)}k
                    </span>
                    <div className="w-full max-w-[32px] flex flex-col-reverse rounded-t-lg overflow-hidden transition-all group-hover:scale-105">
                      <div
                        style={{ height: `${hConsultas}%` }}
                        className="bg-[#166A5A] w-full"
                        title={`Consultas: R$ ${d.consultas}`}
                      />
                      <div
                        style={{ height: `${hAplicacoes}%` }}
                        className="bg-[#2E7FA3] w-full"
                        title={`Aplicações: R$ ${d.aplicacoes}`}
                      />
                      <div
                        style={{ height: `${hManipulados}%` }}
                        className="bg-[#D68910] w-full"
                        title={`Manipulados: R$ ${d.manipulados}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#667C78]">{d.sem}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Funil Horizontal por Etapa (1 coluna) */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#1C2B29]">Fase do Funil</CardTitle>
            <CardDescription className="text-xs text-[#667C78]">
              Distribuição percentual de leads no pipeline de conversão
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {etapasFunil.map((etapa) => {
              const perc = Math.round((etapa.count / totalFunil) * 100)
              return (
                <div key={etapa.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1C2B29]">{etapa.label}</span>
                    <span className="font-medium text-[#667C78]">
                      {etapa.count} leads ({perc}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F7F6F3] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${etapa.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(perc, 12)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/funil')}
                className="w-full text-[#166A5A] hover:bg-[#E2F0EB] text-xs font-semibold justify-between rounded-xl"
              >
                <span>Ver Kanban Completo</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Próximos Atendimentos & Últimos Lançamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Atendimentos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#1C2B29]">
                Próximos Atendimentos
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Agendamentos confirmados para os próximos dias
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/agendas')}
              className="text-[#166A5A] text-xs font-semibold gap-1"
            >
              Agenda
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E3E7E5]/70">
              {proximosAtendimentos.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#667C78]">
                  Nenhum atendimento agendado para os próximos dias.
                </div>
              ) : (
                proximosAtendimentos.map((at) => (
                  <div
                    key={at.id}
                    onClick={() => navigate(`/pacientes/${at.paciente_id}`)}
                    className="p-4 hover:bg-[#F7F6F3] cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#1C2B29] group-hover:text-[#166A5A]">
                        {at.expand?.paciente_id?.nome || 'Paciente'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#667C78]">
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {at.tipo.replace('_', ' ')}
                        </Badge>
                        <span>•</span>
                        <span>{at.profissional || 'Equipe Médica'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#1C2B29]">
                        {new Date(at.data_hora).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-[#667C78]">
                        {new Date(at.data_hora).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Últimos Lançamentos */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#1C2B29]">
                Últimos Lançamentos
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Entradas financeiras recentes de consultas e pacotes
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/pacientes')}
              className="text-[#166A5A] text-xs font-semibold gap-1"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E3E7E5]/70">
              {ultimosLancamentos.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#667C78]">
                  Nenhum lançamento recente registrado.
                </div>
              ) : (
                ultimosLancamentos.map((lanc) => (
                  <div
                    key={lanc.id}
                    onClick={() => navigate(`/pacientes/${lanc.paciente_id}`)}
                    className="p-4 hover:bg-[#F7F6F3] cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#1C2B29] group-hover:text-[#166A5A]">
                        {lanc.descricao}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#667C78]">
                        <span>{lanc.expand?.paciente_id?.nome || 'Paciente'}</span>
                        <span>•</span>
                        <Badge
                          className={`text-[10px] ${
                            lanc.status === 'Pago'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lanc.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#166A5A]">
                        {lanc.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className="text-xs text-[#667C78]">
                        {new Date(lanc.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
