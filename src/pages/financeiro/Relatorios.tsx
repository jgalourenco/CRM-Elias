import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Download, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formasPagamentoService } from '@/services/crm'
import type { Fatura } from '@/types/crm'
import {
  baixarCsv,
  brl,
  carregarTudo,
  diasAtrasStr,
  filtroPeriodo,
  fmtData,
  hojeStr,
  juntarFiltros,
  nomesPacientes,
  soData,
} from '@/lib/financeiro'

type TipoRelatorio = 'periodo' | 'forma' | 'tabela' | 'procedimento' | 'paciente'
type Regime = 'competencia' | 'caixa'
type Agrupamento = 'dia' | 'mes'

interface LinhaRel {
  chave: string
  rotulo: string
  qtd: number
  valor: number
}

const TITULOS: Record<TipoRelatorio, string> = {
  periodo: 'Faturamento por período',
  forma: 'Faturamento por forma de pagamento',
  tabela: 'Faturamento por tabela/convênio',
  procedimento: 'Faturamento por procedimento',
  paciente: 'Faturamento por paciente',
}

const QTD_LABEL: Record<TipoRelatorio, string> = {
  periodo: 'Faturas',
  forma: 'Faturas',
  tabela: 'Faturas',
  procedimento: 'Itens vendidos',
  paciente: 'Faturas',
}

const chartConfig = { valor: { label: 'Faturamento', color: '#166A5A' } } satisfies ChartConfig

// somente as colunas usadas pelo relatório são trazidas do servidor
type FaturaRel = Pick<
  Fatura,
  'data' | 'valor' | 'status' | 'forma_pagamento_id' | 'tabela' | 'paciente_id' | 'itens'
>

interface Nomes {
  formas: Record<string, string>
  pacientes: Record<string, string>
}

const COLUNAS: Record<TipoRelatorio, string> = {
  periodo: 'data,valor,status',
  forma: 'data,valor,status,forma_pagamento_id',
  tabela: 'data,valor,status,tabela',
  procedimento: 'data,valor,status,itens',
  paciente: 'data,valor,status,paciente_id',
}

function agrupar(
  faturas: FaturaRel[],
  tipo: TipoRelatorio,
  agrup: Agrupamento,
  nomes: Nomes,
): LinhaRel[] {
  const mapa = new Map<string, LinhaRel>()
  const somar = (chave: string, rotulo: string, qtd: number, valor: number) => {
    const atual = mapa.get(chave)
    if (atual) {
      atual.qtd += qtd
      atual.valor += valor
    } else {
      mapa.set(chave, { chave, rotulo, qtd, valor })
    }
  }

  for (const f of faturas) {
    const valor = f.valor || 0
    switch (tipo) {
      case 'periodo': {
        const d = soData(f.data)
        const chave = agrup === 'mes' ? d.slice(0, 7) : d
        const rotulo = agrup === 'mes' ? `${chave.slice(5, 7)}/${chave.slice(0, 4)}` : fmtData(d)
        somar(chave, rotulo, 1, valor)
        break
      }
      case 'forma': {
        const n = (f.forma_pagamento_id && nomes.formas[f.forma_pagamento_id]) || 'Não informada'
        somar(n, n, 1, valor)
        break
      }
      case 'tabela': {
        const n = f.tabela?.trim() || 'Não informada'
        somar(n, n, 1, valor)
        break
      }
      case 'paciente': {
        const n = nomes.pacientes[f.paciente_id] || 'Paciente não encontrado'
        somar(f.paciente_id || n, n, 1, valor)
        break
      }
      case 'procedimento': {
        const itens = Array.isArray(f.itens) ? f.itens : []
        if (itens.length === 0) {
          somar('__sem', 'Sem itens detalhados', 1, valor)
        } else {
          for (const it of itens) {
            const n = it.descricao?.trim() || 'Sem descrição'
            somar(n, n, it.quantidade || 0, (it.quantidade || 0) * (it.valor_unitario || 0))
          }
        }
        break
      }
    }
  }

  const linhas = [...mapa.values()]
  return tipo === 'periodo'
    ? linhas.sort((a, b) => a.chave.localeCompare(b.chave))
    : linhas.sort((a, b) => b.valor - a.valor)
}

export default function Relatorios() {
  const { toast } = useToast()
  const [tipo, setTipo] = useState<TipoRelatorio>('periodo')
  const [regime, setRegime] = useState<Regime>('competencia')
  const [agrup, setAgrup] = useState<Agrupamento>('dia')
  const [de, setDe] = useState(diasAtrasStr(30))
  const [ate, setAte] = useState(hojeStr())
  const [faturas, setFaturas] = useState<FaturaRel[]>([])
  const [formas, setFormas] = useState<Record<string, string>>({})
  const [pacientes, setPacientes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const reqRef = useRef(0)

  useEffect(() => {
    formasPagamentoService
      .list()
      .then((fs) => setFormas(Object.fromEntries(fs.map((f) => [f.id, f.nome]))))
      .catch(() => setFormas({}))
  }, [])

  const carregar = useCallback(async () => {
    const req = ++reqRef.current
    setLoading(true)
    try {
      const filtro = juntarFiltros(
        filtroPeriodo('data', de, ate),
        regime === 'caixa' ? 'status = "Paga"' : 'status != "Cancelada"',
      )
      const fats = await carregarTudo<FaturaRel>('faturas', {
        filter: filtro,
        fields: COLUNAS[tipo],
      })
      const nomesPac =
        tipo === 'paciente' ? await nomesPacientes(fats.map((f) => f.paciente_id)) : {}
      if (req !== reqRef.current) return
      setFaturas(fats)
      setPacientes(nomesPac)
    } catch {
      if (req !== reqRef.current) return
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as faturas do período.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }, [de, ate, regime, tipo, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const linhas = useMemo(
    () => agrupar(faturas, tipo, agrup, { formas, pacientes }),
    [faturas, tipo, agrup, formas, pacientes],
  )
  const totalValor = linhas.reduce((s, l) => s + l.valor, 0)
  const totalQtd = linhas.reduce((s, l) => s + l.qtd, 0)
  const dadosGrafico = useMemo(
    () =>
      (tipo === 'periodo' ? linhas : linhas.slice(0, 12)).map((l) => ({
        nome: l.rotulo,
        valor: Number(l.valor.toFixed(2)),
      })),
    [linhas, tipo],
  )

  const rotuloRegime =
    regime === 'caixa' ? 'Regime de caixa (faturas pagas)' : 'Regime de competência'

  const exportar = () => {
    baixarCsv(`relatorio-${tipo}.csv`, [
      [TITULOS[tipo], rotuloRegime, `${fmtData(de)} a ${fmtData(ate)}`],
      [],
      ['Grupo', QTD_LABEL[tipo], 'Valor', '% do total'],
      ...linhas.map((l) => [
        l.rotulo,
        l.qtd,
        l.valor.toFixed(2).replace('.', ','),
        totalValor > 0 ? ((l.valor / totalValor) * 100).toFixed(1).replace('.', ',') + '%' : '0%',
      ]),
      ['Total', totalQtd, totalValor.toFixed(2).replace('.', ','), '100%'],
    ])
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #relatorio-print, #relatorio-print * { visibility: visible !important; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
          Relatórios financeiros
        </h1>
        <p className="text-sm text-[#667C78]">
          Faturamento por período, forma de pagamento, tabela, procedimento e paciente.
        </p>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs no-print">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-xs font-semibold text-[#1C2B29]">Relatório</Label>
            <Select value={tipo} onValueChange={(v: TipoRelatorio) => setTipo(v)}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TITULOS) as TipoRelatorio[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TITULOS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">De</Label>
            <Input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Até</Label>
            <Input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Regime</Label>
            <Select value={regime} onValueChange={(v: Regime) => setRegime(v)}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competencia">Competência</SelectItem>
                <SelectItem value="caixa">Caixa (somente pagas)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tipo === 'periodo' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Agrupar por</Label>
              <Select value={agrup} onValueChange={(v: Agrupamento) => setAgrup(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div id="relatorio-print" className="space-y-4">
        <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
          <CardHeader className="p-5 pb-2 flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-[#1C2B29]">{TITULOS[tipo]}</CardTitle>
              <p className="text-xs text-[#667C78] mt-1">
                {fmtData(de)} a {fmtData(ate)} · {rotuloRegime} · faturas canceladas ignoradas
              </p>
            </div>
            <div className="flex gap-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={exportar}
                disabled={linhas.length === 0}
                className="rounded-xl text-xs gap-1.5"
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                disabled={linhas.length === 0}
                className="rounded-xl text-xs gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#667C78]">
                Carregando relatório...
              </div>
            ) : linhas.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667C78]">
                Nenhuma fatura no período e regime selecionados.
              </div>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                  <BarChart data={dadosGrafico} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tick={{ fontSize: 10 }}
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
                    <Bar dataKey="valor" fill="var(--color-valor)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {tipo === 'periodo'
                          ? agrup === 'mes'
                            ? 'Mês'
                            : 'Dia'
                          : tipo === 'forma'
                            ? 'Forma de pagamento'
                            : tipo === 'tabela'
                              ? 'Tabela/Convênio'
                              : tipo === 'procedimento'
                                ? 'Procedimento'
                                : 'Paciente'}
                      </TableHead>
                      <TableHead className="text-right">{QTD_LABEL[tipo]}</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">% do total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((l) => (
                      <TableRow key={l.chave}>
                        <TableCell className="text-xs font-medium text-[#1C2B29]">
                          {l.rotulo}
                        </TableCell>
                        <TableCell className="text-right text-xs">{l.qtd}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {brl(l.valor)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {totalValor > 0 ? ((l.valor / totalValor) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="text-xs font-semibold">Total</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{totalQtd}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-[#166A5A]">
                        {brl(totalValor)}
                      </TableCell>
                      <TableCell className="text-right text-xs">100%</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
