import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  CalendarCheck,
  CalendarX,
  DollarSign,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Atendimento, ContaLancamento, Fatura, Paciente } from '@/types/crm'
import {
  brl,
  carregarTudo,
  dateStr,
  diasAtrasStr,
  filtroPeriodo,
  hojeStr,
  soData,
} from '@/lib/financeiro'

// apenas as colunas necessárias são trazidas do servidor
type PacienteLeve = Pick<Paciente, 'id' | 'sexo' | 'conheceu_por' | 'created'>
type AtendimentoLeve = Pick<Atendimento, 'data_hora' | 'status'>
type FaturaLeve = Pick<Fatura, 'data' | 'valor'>
type VencidoLeve = Pick<ContaLancamento, 'valor' | 'pago'>

const CORES = [
  '#166A5A',
  '#C9A227',
  '#2E7FA3',
  '#7C3AED',
  '#C0392B',
  '#9AA8A5',
  '#16A34A',
  '#E67E22',
]
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const N_MESES = 6

type Preset = '30' | '60' | 'custom'

interface Kpi {
  titulo: string
  valor: string
  icone: React.ReactNode
  destaque?: boolean
}

function KpiCard({ titulo, valor, icone, destaque }: Kpi) {
  return (
    <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
      <CardContent className="p-4 flex items-center gap-3">
        <span
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${destaque ? 'bg-red-50 text-[#C0392B]' : 'bg-[#E2F0EB] text-[#166A5A]'}`}
        >
          {icone}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-[#667C78]">{titulo}</p>
          <p className="text-lg font-bold text-[#1C2B29] truncate">{valor}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/** Últimos N meses (chave yyyy-mm e rótulo), terminando no mês atual. */
function ultimosMeses(n: number) {
  const hoje = new Date()
  const out: { chave: string; rotulo: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    out.push({
      chave: dateStr(d).slice(0, 7),
      rotulo: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
    })
  }
  return out
}

function contar<T>(itens: T[], chave: (i: T) => string) {
  const m = new Map<string, number>()
  for (const i of itens) {
    const k = chave(i)
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export default function DashboardGestao() {
  const { toast } = useToast()
  const [preset, setPreset] = useState<Preset>('30')
  const [de, setDe] = useState(diasAtrasStr(30))
  const [ate, setAte] = useState(hojeStr())
  const [loading, setLoading] = useState(true)

  const [pacientes, setPacientes] = useState<PacienteLeve[]>([])
  const [atendimentos, setAtendimentos] = useState<AtendimentoLeve[]>([])
  const [faturas, setFaturas] = useState<FaturaLeve[]>([])
  const [vencidos, setVencidos] = useState<VencidoLeve[]>([])

  const aplicarPreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') {
      setDe(diasAtrasStr(Number(p)))
      setAte(hojeStr())
    }
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const meses = ultimosMeses(N_MESES)
      const inicioSerie = `${meses[0].chave}-01`
      const desde = de && de < inicioSerie ? de : inicioSerie
      const fim = ate && ate > hojeStr() ? ate : hojeStr()
      const [pacs, ats, fats, lancs] = await Promise.all([
        carregarTudo<PacienteLeve>('pacientes', { fields: 'id,sexo,conheceu_por,created' }),
        carregarTudo<AtendimentoLeve>('atendimentos', {
          filter: filtroPeriodo('data_hora', desde, fim),
          fields: 'data_hora,status',
        }),
        carregarTudo<FaturaLeve>('faturas', {
          filter: `${filtroPeriodo('data', desde, fim)} && status != "Cancelada"`,
          fields: 'data,valor',
        }),
        carregarTudo<VencidoLeve>('contas_lancamentos', {
          filter: `natureza = "Receber" && vencimento < "${hojeStr()} 00:00:00"`,
          fields: 'valor,pago',
        }),
      ])
      setPacientes(pacs)
      setAtendimentos(ats)
      setFaturas(fats)
      setVencidos(lancs.filter((l) => (l.valor || 0) - (l.pago || 0) > 0))
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [de, ate, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const dados = useMemo(() => {
    const noPeriodo = (d?: string) => {
      const s = soData(d)
      return !!s && (!de || s >= de) && (!ate || s <= ate)
    }

    // Contatos
    const novos = pacientes.filter((p) => noPeriodo(p.created))
    const porSexo = contar(pacientes, (p) => p.sexo || 'Não informado')
    const origem = contar(
      pacientes.filter((p) => p.conheceu_por?.trim()),
      (p) => p.conheceu_por!.trim(),
    )
    const origemTop = origem.slice(0, 7)
    const outras = origem.slice(7).reduce((s, o) => s + o.value, 0)
    if (outras > 0) origemTop.push({ name: 'Outras', value: outras })
    const semOrigem = pacientes.length - origem.reduce((s, o) => s + o.value, 0)

    // Agenda
    const atsPeriodo = atendimentos.filter((a) => noPeriodo(a.data_hora))
    const atendidos = atsPeriodo.filter((a) => a.status === 'Realizado').length
    const desmarcados = atsPeriodo.filter(
      (a) => a.status === 'Cancelado' || a.status === 'No_show',
    ).length

    // Financeiro
    const fatsPeriodo = faturas.filter((f) => noPeriodo(f.data))
    const faturamento = fatsPeriodo.reduce((s, f) => s + (f.valor || 0), 0)
    const ticket = fatsPeriodo.length > 0 ? faturamento / fatsPeriodo.length : 0
    const aReceberVencido = vencidos.reduce((s, l) => s + ((l.valor || 0) - (l.pago || 0)), 0)

    // Séries mensais
    const meses = ultimosMeses(N_MESES)
    const serieAgenda = meses.map((m) => {
      const doMes = atendimentos.filter((a) => soData(a.data_hora).startsWith(m.chave))
      return {
        mes: m.rotulo,
        agendamentos: doMes.length,
        atendidos: doMes.filter((a) => a.status === 'Realizado').length,
        desmarcados: doMes.filter((a) => a.status === 'Cancelado' || a.status === 'No_show').length,
      }
    })
    const serieFin = meses.map((m) => ({
      mes: m.rotulo,
      faturamento: Number(
        faturas
          .filter((f) => soData(f.data).startsWith(m.chave))
          .reduce((s, f) => s + (f.valor || 0), 0)
          .toFixed(2),
      ),
    }))

    return {
      novos: novos.length,
      porSexo,
      origemTop,
      semOrigem,
      totalAgenda: atsPeriodo.length,
      atendidos,
      desmarcados,
      faturamento,
      ticket,
      qtdFaturas: fatsPeriodo.length,
      aReceberVencido,
      serieAgenda,
      serieFin,
    }
  }, [pacientes, atendimentos, faturas, vencidos, de, ate])

  const cfgAgenda = {
    agendamentos: { label: 'Agendamentos', color: '#2E7FA3' },
    atendidos: { label: 'Atendidos', color: '#166A5A' },
    desmarcados: { label: 'Desmarcados', color: '#C0392B' },
  } satisfies ChartConfig
  const cfgFin = { faturamento: { label: 'Faturamento', color: '#166A5A' } } satisfies ChartConfig
  const cfgPie: ChartConfig = { value: { label: 'Pacientes' } }

  const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <div className="py-10 text-center text-xs text-[#667C78]">{children}</div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Dashboard de Gestão
          </h1>
          <p className="text-sm text-[#667C78]">
            Contatos, agenda e financeiro da clínica em um só lugar.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Período</Label>
            <Select value={preset} onValueChange={(v: Preset) => aplicarPreset(v)}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">De</Label>
            <Input
              type="date"
              value={de}
              disabled={preset !== 'custom'}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-xl border-[#E3E7E5] bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Até</Label>
            <Input
              type="date"
              value={ate}
              disabled={preset !== 'custom'}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-xl border-[#E3E7E5] bg-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-[#667C78]">Carregando indicadores...</div>
      ) : (
        <>
          {/* Contatos */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#1C2B29]">Contatos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                titulo="Total de pacientes"
                valor={String(pacientes.length)}
                icone={<Users className="h-5 w-5" />}
              />
              <KpiCard
                titulo="Novos no período"
                valor={String(dados.novos)}
                icone={<UserPlus className="h-5 w-5" />}
              />
              {dados.porSexo.slice(0, 2).map((s) => (
                <KpiCard
                  key={s.name}
                  titulo={`Sexo: ${s.name}`}
                  valor={`${s.value} (${pacientes.length ? Math.round((s.value / pacientes.length) * 100) : 0}%)`}
                  icone={<Users className="h-5 w-5" />}
                />
              ))}
            </div>
            <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
              <CardHeader className="p-5 pb-0">
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Como conheceu a clínica
                </CardTitle>
                <CardDescription className="text-xs">
                  Origem informada no cadastro
                  {dados.semOrigem > 0 ? ` (${dados.semOrigem} sem informação)` : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {dados.origemTop.length === 0 ? (
                  <Placeholder>Nenhum paciente com origem de conhecimento informada.</Placeholder>
                ) : (
                  <ChartContainer config={cfgPie} className="h-[280px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                      <Pie
                        data={dados.origemTop}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={2}
                      >
                        {dados.origemTop.map((o, i) => (
                          <Cell key={o.name} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Agenda */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#1C2B29]">Agenda</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                titulo="Agendamentos no período"
                valor={String(dados.totalAgenda)}
                icone={<CalendarCheck className="h-5 w-5" />}
              />
              <KpiCard
                titulo="Atendidos"
                valor={String(dados.atendidos)}
                icone={<CalendarCheck className="h-5 w-5" />}
              />
              <KpiCard
                titulo="Desmarcados / faltas"
                valor={String(dados.desmarcados)}
                icone={<CalendarX className="h-5 w-5" />}
                destaque
              />
            </div>
            <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
              <CardHeader className="p-5 pb-0">
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Comparação mês a mês
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimos {N_MESES} meses. Desmarcados incluem cancelados e não comparecimentos.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ChartContainer config={cfgAgenda} className="h-[280px] w-full">
                  <BarChart data={dados.serieAgenda}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={32}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      dataKey="agendamentos"
                      fill="var(--color-agendamentos)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="atendidos" fill="var(--color-atendidos)" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="desmarcados"
                      fill="var(--color-desmarcados)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>

          {/* Financeiro */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#1C2B29]">Financeiro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                titulo={`Faturamento (${dados.qtdFaturas} ${dados.qtdFaturas === 1 ? 'fatura' : 'faturas'})`}
                valor={brl(dados.faturamento)}
                icone={<DollarSign className="h-5 w-5" />}
              />
              <KpiCard
                titulo="Ticket médio"
                valor={brl(dados.ticket)}
                icone={<TrendingUp className="h-5 w-5" />}
              />
              <KpiCard
                titulo={`A receber vencido (${vencidos.length})`}
                valor={brl(dados.aReceberVencido)}
                icone={<Receipt className="h-5 w-5" />}
                destaque
              />
            </div>
            <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
              <CardHeader className="p-5 pb-0">
                <CardTitle className="text-base font-bold text-[#1C2B29]">
                  Faturamento mês a mês
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimos {N_MESES} meses, faturas não canceladas (competência).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ChartContainer config={cfgFin} className="h-[260px] w-full">
                  <BarChart data={dados.serieFin}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <span className="font-semibold">{brl(Number(value))}</span>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="faturamento"
                      fill="var(--color-faturamento)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
