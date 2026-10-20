import { useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { MessageSquare, Plus, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { pesquisasQualidadeService, registrarAuditoria } from '@/services/crm'
import type { Paciente, PesquisaQualidade as PesquisaQualidadeT } from '@/types/crm'
import {
  POR_PAGINA,
  carregarTudo,
  diasAtrasStr,
  filtroPeriodo,
  fmtData,
  hojeStr,
  listarTodosPacientes,
  toPbDate,
} from '@/lib/financeiro'
import PacienteSelect from '@/components/financeiro/PacienteSelect'
import Paginacao from '@/components/financeiro/Paginacao'

const CATEGORIAS = [
  'Localização',
  'Infraestrutura',
  'Atendimento geral',
  'Atendimento médico',
  'Pontualidade',
  'Informações sobre o tratamento',
  'Custo x benefício',
] as const

const chartConfig = { media: { label: 'Nota média', color: '#166A5A' } } satisfies ChartConfig

const notasIniciais = (): Record<string, number> =>
  Object.fromEntries(CATEGORIAS.map((c) => [c, 0]))

function Estrelas({
  valor,
  onChange,
  rotulo,
}: {
  valor: number
  onChange: (n: number) => void
  rotulo: string
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label={rotulo}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} de 5`}
          onClick={() => onChange(n)}
          className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#166A5A]"
        >
          <Star
            className={`h-5 w-5 ${n <= valor ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[#C9D2CF]'}`}
          />
        </button>
      ))}
    </div>
  )
}

const mediaResposta = (r: PesquisaQualidadeT) => {
  const v = Object.values(r.notas || {}).filter((n) => typeof n === 'number' && n > 0)
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : 0
}

export default function PesquisaQualidade() {
  const { toast } = useToast()
  // notas de todas as respostas do período (consulta leve) para médias e total
  const [respostas, setRespostas] = useState<Pick<PesquisaQualidadeT, 'id' | 'notas'>[]>([])
  // lista paginada no servidor
  const [recentes, setRecentes] = useState<PesquisaQualidadeT[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingLista, setLoadingLista] = useState(true)
  const [tick, setTick] = useState(0)
  const reqRef = useRef(0)
  const [de, setDe] = useState(diasAtrasStr(90))
  const [ate, setAte] = useState(hojeStr())

  const [formAberto, setFormAberto] = useState(false)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [paciente, setPaciente] = useState('')
  const [notas, setNotas] = useState<Record<string, number>>(notasIniciais())
  const [comentario, setComentario] = useState('')
  const [salvando, setSalvando] = useState(false)

  const filtro = useMemo(() => filtroPeriodo('data', de, ate), [de, ate])

  useEffect(() => {
    setPage(1)
  }, [filtro])

  // médias e total: todas as respostas do filtro, só com a coluna de notas
  useEffect(() => {
    let ativo = true
    setLoading(true)
    carregarTudo<Pick<PesquisaQualidadeT, 'id' | 'notas'>>('pesquisas_qualidade', {
      filter: filtro,
      fields: 'id,notas',
    })
      .then((rs) => {
        if (ativo) setRespostas(rs)
      })
      .catch(() => {
        if (ativo)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível carregar as respostas da pesquisa.',
            variant: 'destructive',
          })
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [filtro, tick, toast])

  // lista de respostas: 25 por página
  useEffect(() => {
    const req = ++reqRef.current
    setLoadingLista(true)
    pesquisasQualidadeService
      .listPage(page, POR_PAGINA, filtro)
      .then((res) => {
        if (req !== reqRef.current) return
        setRecentes(res.items)
        setTotalPages(res.totalPages)
        setTotalItems(res.totalItems)
      })
      .catch(() => {
        if (req === reqRef.current)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível carregar a lista de respostas.',
            variant: 'destructive',
          })
      })
      .finally(() => {
        if (req === reqRef.current) setLoadingLista(false)
      })
  }, [page, filtro, tick, toast])

  const carregar = () => setTick((t) => t + 1)

  useEffect(() => {
    if (!formAberto) return
    let ativo = true
    listarTodosPacientes()
      .then((p) => ativo && setPacientes(p))
      .catch(() =>
        toast({
          title: 'Erro ao carregar pacientes',
          description: 'A resposta ainda pode ser registrada sem paciente.',
          variant: 'destructive',
        }),
      )
    return () => {
      ativo = false
    }
  }, [formAberto, toast])

  const medias = useMemo(
    () =>
      CATEGORIAS.map((c) => {
        const v = respostas
          .map((r) => r.notas?.[c])
          .filter((n): n is number => typeof n === 'number' && n > 0)
        return {
          categoria: c,
          media: v.length ? Number((v.reduce((s, n) => s + n, 0) / v.length).toFixed(2)) : 0,
          total: v.length,
        }
      }),
    [respostas],
  )

  const mediaGeral = useMemo(() => {
    const v = medias.filter((m) => m.total > 0)
    return v.length ? v.reduce((s, m) => s + m.media, 0) / v.length : 0
  }, [medias])

  const abrirForm = () => {
    setPaciente('')
    setNotas(notasIniciais())
    setComentario('')
    setFormAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const preenchidas = Object.fromEntries(Object.entries(notas).filter(([, n]) => n > 0))
    if (Object.keys(preenchidas).length === 0) {
      toast({
        title: 'Nenhuma nota informada',
        description: 'Atribua nota de 1 a 5 a pelo menos uma categoria.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await pesquisasQualidadeService.create({
        paciente_id: paciente || undefined,
        data: toPbDate(hojeStr()),
        notas: preenchidas,
        comentario: comentario.trim(),
      })
      await registrarAuditoria(
        'Pesquisa de Qualidade',
        'Registrar resposta',
        paciente
          ? `Resposta de ${pacientes.find((p) => p.id === paciente)?.nome || 'paciente'}`
          : 'Resposta anônima',
      )
      toast({ title: 'Resposta registrada', description: 'Obrigado pelo feedback.' })
      setFormAberto(false)
      carregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a resposta.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Pesquisa de Qualidade
          </h1>
          <p className="text-sm text-[#667C78]">
            Satisfação dos pacientes por categoria, com notas de 1 a 5.
          </p>
        </div>
        <Button
          onClick={abrirForm}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Registrar resposta
        </Button>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
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
          <div className="sm:col-span-2 flex gap-6 justify-end text-right">
            <div>
              <p className="text-xs text-[#667C78]">Total de respostas</p>
              <p className="text-2xl font-bold text-[#1C2B29]">{respostas.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#667C78]">Média geral</p>
              <p className="text-2xl font-bold text-[#166A5A]">
                {mediaGeral ? mediaGeral.toFixed(2).replace('.', ',') : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#667C78]">Carregando respostas...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Média por categoria
              </CardTitle>
              <CardDescription className="text-xs">Escala de 1 a 5.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {respostas.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#667C78]">
                  Nenhuma resposta no período selecionado.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[340px] w-full">
                  <BarChart data={medias} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="categoria"
                      width={150}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="media" fill="var(--color-media)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
            <CardHeader className="p-5 pb-0">
              <CardTitle className="text-base font-bold text-[#1C2B29]">
                Respostas recentes
              </CardTitle>
              <CardDescription className="text-xs">
                Respostas do período, da mais recente para a mais antiga.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
              {loadingLista ? (
                <div className="py-10 text-center text-xs text-[#667C78]">
                  Carregando respostas...
                </div>
              ) : recentes.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#667C78]">
                  Nenhuma resposta no período selecionado.
                </div>
              ) : (
                recentes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-[#E3E7E5] bg-[#F7F6F3]/60 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1C2B29]">
                        {r.expand?.paciente_id?.nome || 'Anônimo'}
                      </span>
                      <span className="text-[#667C78] whitespace-nowrap">
                        {fmtData(r.data || r.created)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#A5831D] font-semibold">
                      <Star className="h-3.5 w-3.5 fill-[#C9A227] text-[#C9A227]" />
                      {mediaResposta(r).toFixed(1).replace('.', ',')}
                      <span className="text-[#667C78] font-normal">
                        ({Object.keys(r.notas || {}).length} categorias avaliadas)
                      </span>
                    </div>
                    {r.comentario && (
                      <p className="text-xs text-[#1C2B29] flex gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#667C78]" />
                        {r.comentario}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
            <Paginacao
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              onChange={setPage}
              loading={loadingLista}
              rotulo="respostas"
            />
          </Card>
        </div>
      )}

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Registrar resposta
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Avalie de 1 a 5 cada categoria. O paciente é opcional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Paciente (opcional)</Label>
              <PacienteSelect
                pacientes={pacientes}
                value={paciente}
                onChange={setPaciente}
                placeholder="Resposta anônima"
              />
              {paciente && (
                <button
                  type="button"
                  onClick={() => setPaciente('')}
                  className="text-[11px] text-[#667C78] underline"
                >
                  Remover paciente (resposta anônima)
                </button>
              )}
            </div>
            <div className="space-y-2">
              {CATEGORIAS.map((c) => (
                <div key={c} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#1C2B29]">{c}</span>
                  <Estrelas
                    rotulo={c}
                    valor={notas[c] || 0}
                    onChange={(n) => setNotas((ns) => ({ ...ns, [c]: n }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Comentário</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormAberto(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {salvando ? 'Salvando...' : 'Salvar resposta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
