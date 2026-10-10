import React, { useEffect, useState, useMemo } from 'react'
import {
  pacientesService,
  atendimentosService,
  lancamentosService,
  prospeccoesService,
} from '@/services/crm'
import { Paciente, Atendimento, Lancamento, Prospeccao } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  UserCheck,
  UserX,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  Clock,
  Filter,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'

type PeriodoDias = 7 | 30 | 90

const CORES_PIE = ['#166A5A', '#2E7FA3', '#C9A227', '#E67E22', '#9B59B6', '#1ABC9C']

export default function Indicadores() {
  const [periodo, setPeriodo] = useState<PeriodoDias>(30)
  const [loading, setLoading] = useState(true)

  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [prospeccoes, setProspeccoes] = useState<Prospeccao[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pacRes, atRes, lancRes, prospRes] = await Promise.all([
        pacientesService.list(1, 200),
        atendimentosService.list('', '-data_hora'),
        lancamentosService.list('', '-data'),
        prospeccoesService.list('', '-created'),
      ])
      setPacientes(pacRes.items)
      setAtendimentos(atRes)
      setLancamentos(lancRes)
      setProspeccoes(prospRes)
    } catch (err) {
      console.error('Erro ao carregar dados de indicadores:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Data de corte com base no período selecionado (7, 30 ou 90 dias)
  const dataCorte = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - periodo)
    return d
  }, [periodo])

  // 1. Filtrar atendimentos no período
  const atendimentosNoPeriodo = useMemo(() => {
    return atendimentos.filter((a) => new Date(a.data_hora) >= dataCorte)
  }, [atendimentos, dataCorte])

  // Relação Marcado vs Compareceu vs Desmarcou / No-show (Referência MedX)
  const statsAgenda = useMemo(() => {
    const total = atendimentosNoPeriodo.length
    const compareceu = atendimentosNoPeriodo.filter((a) => a.status === 'Realizado').length
    const noShow = atendimentosNoPeriodo.filter((a) => a.status === 'No_show').length
    const cancelado = atendimentosNoPeriodo.filter((a) => a.status === 'Cancelado').length
    const agendadosOuConfirmados = atendimentosNoPeriodo.filter(
      (a) =>
        a.status === 'Agendado' ||
        a.status === 'Confirmado' ||
        a.status === 'Chegou' ||
        a.status === 'Em_atendimento',
    ).length

    const taxaComparecimento =
      compareceu + noShow + cancelado > 0
        ? Math.round((compareceu / (compareceu + noShow + cancelado)) * 100)
        : 100

    return {
      total,
      compareceu,
      noShow,
      cancelado,
      agendadosOuConfirmados,
      taxaComparecimento,
    }
  }, [atendimentosNoPeriodo])

  // Dados para Gráfico de Pizza: Marcado vs Desmarcado / No-show
  const pieStatusAgendaData = useMemo(() => {
    return [
      { name: 'Compareceu', value: statsAgenda.compareceu, color: '#166A5A' },
      { name: 'No-Show (Faltou)', value: statsAgenda.noShow, color: '#C0392B' },
      { name: 'Desmarcado / Cancelado', value: statsAgenda.cancelado, color: '#E67E22' },
      {
        name: 'Em Aberto / Confirmado',
        value: statsAgenda.agendadosOuConfirmados,
        color: '#2E7FA3',
      },
    ].filter((item) => item.value > 0)
  }, [statsAgenda])

  // 2. Novos Pacientes vs Recorrentes (Referência MedX: GetInsigthsContatos)
  const statsPacientes = useMemo(() => {
    const pacientesNovos = pacientes.filter((p) => new Date(p.created) >= dataCorte).length
    const totalPacientes = pacientes.length
    const pacientesRecorrentes = Math.max(totalPacientes - pacientesNovos, 0)
    const taxaNovos = totalPacientes > 0 ? Math.round((pacientesNovos / totalPacientes) * 100) : 0

    return {
      pacientesNovos,
      pacientesRecorrentes,
      totalPacientes,
      taxaNovos,
    }
  }, [pacientes, dataCorte])

  const pieNovosVsRecorrentes = useMemo(() => {
    return [
      { name: 'Novos Pacientes', value: statsPacientes.pacientesNovos, color: '#166A5A' },
      {
        name: 'Pacientes Recorrentes',
        value: statsPacientes.pacientesRecorrentes,
        color: '#C9A227',
      },
    ].filter((i) => i.value > 0)
  }, [statsPacientes])

  // 3. Como Conheceu / Origem da Prospecção (Referência MedX: relacaoComoConheceu)
  const comoConheceuData = useMemo(() => {
    const mapOrigens: Record<string, number> = {}

    // Da anamnese dos pacientes
    pacientes.forEach((p) => {
      const origem = p.anamnese?.como_chegou || 'Não informado'
      mapOrigens[origem] = (mapOrigens[origem] || 0) + 1
    })

    // Dos canais de prospecção
    prospeccoes.forEach((pr) => {
      if (pr.canal) {
        const c = pr.canal === 'WhatsApp' ? 'WhatsApp (Lead)' : pr.canal
        mapOrigens[c] = (mapOrigens[c] || 0) + 1
      }
    })

    return Object.entries(mapOrigens)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
  }, [pacientes, prospeccoes])

  // 4. Financeiro: Receitas vs Despesas (Estimado / Realizado) e distribuição por tipo de lançamento (Referência MedX: GetInsigthsFinanceiro)
  const lancamentosNoPeriodo = useMemo(() => {
    return lancamentos.filter((l) => new Date(l.data) >= dataCorte)
  }, [lancamentos, dataCorte])

  const statsFinanceiro = useMemo(() => {
    const totalReceitas = lancamentosNoPeriodo
      .filter((l) => l.status === 'Pago')
      .reduce((acc, curr) => acc + curr.valor, 0)

    const totalPendente = lancamentosNoPeriodo
      .filter((l) => l.status === 'Pendente')
      .reduce((acc, curr) => acc + curr.valor, 0)

    // Despesas operacionais estimadas da clínica (32% de custo operacional + insumos)
    const despesasEstimadas = Math.round(totalReceitas * 0.34)
    const saldoLiquido = totalReceitas - despesasEstimadas

    return {
      totalReceitas,
      totalPendente,
      despesasEstimadas,
      saldoLiquido,
    }
  }, [lancamentosNoPeriodo])

  // Dados para gráfico de barras por Categoria de Serviço
  const financeiroPorTipoData = useMemo(() => {
    const mapTipos: Record<string, number> = {}
    lancamentosNoPeriodo.forEach((l) => {
      const tipo = l.tipo.replace('_', ' ')
      mapTipos[tipo] = (mapTipos[tipo] || 0) + l.valor
    })

    return Object.entries(mapTipos)
      .map(([tipo, valor]) => ({ tipo, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [lancamentosNoPeriodo])

  // Evolução temporal (agrupada por semanas ou dias)
  const evolucaoTemporal = useMemo(() => {
    const buckets: Record<
      string,
      { label: string; agendados: number; realizados: number; receitas: number }
    > = {}

    const intervals = periodo === 7 ? 7 : periodo === 30 ? 6 : 8
    const stepDays = Math.max(Math.floor(periodo / intervals), 1)

    for (let i = intervals - 1; i >= 0; i--) {
      const start = new Date()
      start.setDate(start.getDate() - (i + 1) * stepDays)
      const end = new Date()
      end.setDate(end.getDate() - i * stepDays)

      const key = `${start.getDate()}/${start.getMonth() + 1}`
      buckets[key] = {
        label: key,
        agendados: 0,
        realizados: 0,
        receitas: 0,
      }

      atendimentos.forEach((a) => {
        const d = new Date(a.data_hora)
        if (d >= start && d < end) {
          buckets[key].agendados += 1
          if (a.status === 'Realizado') {
            buckets[key].realizados += 1
          }
        }
      })

      lancamentos.forEach((l) => {
        const d = new Date(l.data)
        if (d >= start && d < end && l.status === 'Pago') {
          buckets[key].receitas += l.valor
        }
      })
    }

    return Object.values(buckets)
  }, [periodo, atendimentos, lancamentos])

  return (
    <div className="space-y-6">
      {/* Header com Filtros de Período 7/30/90 dias */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
              Indicadores & Marketing Insights
            </h1>
          </div>
          <p className="text-sm text-[#667C78] mt-1">
            Análise de comparecimento, retenção, canais de atração e performance financeira (baseado
            nas métricas clínicas do MedX).
          </p>
        </div>

        {/* Botões de Filtro de Período */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E3E7E5] rounded-2xl shadow-xs w-full sm:w-auto justify-around sm:justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriodo(7)}
            className={`flex-1 sm:flex-initial rounded-xl text-xs font-semibold px-3 h-8 ${
              periodo === 7
                ? 'bg-[#166A5A] text-white hover:bg-[#166A5A] hover:text-white'
                : 'text-[#667C78] hover:text-[#1C2B29]'
            }`}
          >
            7 dias
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriodo(30)}
            className={`flex-1 sm:flex-initial rounded-xl text-xs font-semibold px-3 h-8 ${
              periodo === 30
                ? 'bg-[#166A5A] text-white hover:bg-[#166A5A] hover:text-white'
                : 'text-[#667C78] hover:text-[#1C2B29]'
            }`}
          >
            30 dias
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPeriodo(90)}
            className={`flex-1 sm:flex-initial rounded-xl text-xs font-semibold px-3 h-8 ${
              periodo === 90
                ? 'bg-[#166A5A] text-white hover:bg-[#166A5A] hover:text-white'
                : 'text-[#667C78] hover:text-[#1C2B29]'
            }`}
          >
            90 dias
          </Button>
        </div>
      </div>

      {/* 4 Cards de Métricas Principais do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Relação Marcado vs Compareceu */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Taxa de Comparecimento
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#166A5A]">
                {statsAgenda.taxaComparecimento}%
              </span>
              <span className="text-xs text-[#667C78]">compareceram</span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">
              {statsAgenda.compareceu} atendidos de {statsAgenda.total} marcados no período
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Desmarques e No-Shows */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Perdas de Agenda
              </span>
              <div className="h-8 w-8 rounded-xl bg-red-50 text-[#C0392B] flex items-center justify-center">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#C0392B]">
                {statsAgenda.noShow + statsAgenda.cancelado}
              </span>
              <span className="text-xs text-[#667C78]">desmarques / faltas</span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">
              {statsAgenda.noShow} no-show(s) • {statsAgenda.cancelado} cancelamento(s)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Novos Pacientes vs Recorrentes */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Novos Pacientes
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#FBF3D9] text-[#A5831D] flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1C2B29]">
                {statsPacientes.pacientesNovos}
              </span>
              <span className="text-xs text-[#166A5A] font-semibold">
                ({statsPacientes.taxaNovos}%)
              </span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">
              {statsPacientes.pacientesRecorrentes} pacientes em acompanhamento
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Faturamento Líquido no Período */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667C78]">
                Receitas Recebidas
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#E2F0EB] text-[#2E8B57] flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-[#2E8B57]">
                {statsFinanceiro.totalReceitas.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
            <p className="text-xs text-[#667C78] mt-1">
              Pendente a receber:{' '}
              {statsFinanceiro.totalPendente.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid Gráficos: Status da Agenda & Novos vs Recorrentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Relação Marcado × Desmarcado / No-show */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Relação: Comparecimento × Desmarques × No-Show
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Distribuição de status dos agendamentos nos últimos {periodo} dias
                </CardDescription>
              </div>
              <PieChartIcon className="h-4 w-4 text-[#166A5A]" />
            </div>
          </CardHeader>
          <CardContent>
            {pieStatusAgendaData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#667C78]">
                Nenhum agendamento registrado no período selecionado.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieStatusAgendaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieStatusAgendaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => [`${val} agendamentos`, 'Quantidade']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-xs text-[#1C2B29]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Novos Pacientes vs Recorrentes */}
        <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Novos Pacientes × Recorrentes
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Captação recente comparada à base ativa de longevidade
                </CardDescription>
              </div>
              <Users className="h-4 w-4 text-[#C9A227]" />
            </div>
          </CardHeader>
          <CardContent>
            {pieNovosVsRecorrentes.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#667C78]">
                Nenhum paciente cadastrado.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieNovosVsRecorrentes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieNovosVsRecorrentes.map((entry, index) => (
                        <Cell key={`cell-novos-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => [`${val} pacientes`, 'Total']} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-xs text-[#1C2B29]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Gráfico de Evolução Temporal + Como Conheceu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 3: Evolução dos Atendimentos e Faturamento ao longo do tempo (7 colunas) */}
        <Card className="lg:col-span-7 rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Evolução de Agendamentos e Faturamento
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Volume de consultas marcadas, realizadas e receita nos intervalos
                </CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-[#166A5A]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={evolucaoTemporal}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E7E5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#667C78' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#667C78' }} />
                  <RechartsTooltip
                    formatter={(val: number, name: string) => {
                      if (name === 'Receitas (R$)') {
                        return [
                          val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                          name,
                        ]
                      }
                      return [val, name]
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-xs text-[#1C2B29]">{value}</span>}
                  />
                  <Bar dataKey="agendados" name="Agendados" fill="#2E7FA3" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="realizados"
                    name="Compareceu"
                    fill="#166A5A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 4: "Como Conheceu" (Origem da Prospecção / Canais de Entrada) (5 colunas) */}
        <Card className="lg:col-span-5 rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Origem: Como Conheceu a Clínica
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Canais e indicações registradas na anamnese e funil
                </CardDescription>
              </div>
              <Sparkles className="h-4 w-4 text-[#C9A227]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {comoConheceuData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#667C78]">
                Nenhuma origem de prospecção mapeada ainda.
              </div>
            ) : (
              comoConheceuData.map((item, idx) => {
                const totalGeral = comoConheceuData.reduce((acc, c) => acc + c.total, 0) || 1
                const perc = Math.round((item.total / totalGeral) * 100)

                return (
                  <div key={item.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1C2B29] truncate max-w-[200px]">
                        {item.nome}
                      </span>
                      <span className="text-[#667C78] font-medium">
                        {item.total} {item.total === 1 ? 'paciente' : 'pacientes'} ({perc}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F7F6F3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(perc, 10)}%`,
                          backgroundColor: CORES_PIE[idx % CORES_PIE.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 5: Despesas Estimadas × Receitas Realizadas (Referência MedX GetInsigthsFinanceiro) */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Relação Financeira: Receitas Realizadas × Despesas Operacionais Estimadas
              </CardTitle>
              <CardDescription className="text-xs text-[#667C78]">
                Balanço estimado de margem operacional e faturamento por categoria de procedimento
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#2E8B57] font-semibold">Margem Líquida Estimada: ~66%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800">Receitas Recebidas</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {statsFinanceiro.totalReceitas.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-semibold text-amber-800">
                Despesas e Insumos (~34%)
              </span>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {statsFinanceiro.despesasEstimadas.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#E2F0EB] border border-[#166A5A]/30">
              <span className="text-xs font-semibold text-[#166A5A]">
                Resultado Operacional Líquido
              </span>
              <p className="text-xl font-bold text-[#166A5A] mt-1">
                {statsFinanceiro.saldoLiquido.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </div>

          {/* Barras de faturamento por tipo */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#667C78]">
              Faturamento por Tipo de Lançamento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {financeiroPorTipoData.map((tipoInfo) => (
                <div
                  key={tipoInfo.tipo}
                  className="p-3 bg-[#F7F6F3] rounded-xl flex items-center justify-between border border-[#E3E7E5]/70"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#1C2B29]">{tipoInfo.tipo}</p>
                    <span className="text-[11px] text-[#667C78]">Procedimento clínico</span>
                  </div>
                  <span className="text-xs font-bold text-[#166A5A]">
                    {tipoInfo.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
