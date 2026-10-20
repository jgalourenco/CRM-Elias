import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Edit,
  History,
  Plus,
  Search,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  contasCorrentesService,
  contasLancamentosService,
  planoContasService,
  registrarAuditoria,
  unidadesService,
} from '@/services/crm'
import type {
  ContaCorrente,
  ContaLancamento,
  PagamentoLancamento,
  PlanoConta,
  Unidade,
} from '@/types/crm'
import {
  POR_PAGINA,
  brl,
  carregarTudo,
  escAspas,
  filtroPeriodo,
  fmtData,
  hojeStr,
  historicoPagamentos,
  juntarFiltros,
  soData,
  toPbDate,
  totalPago,
} from '@/lib/financeiro'
import Paginacao from '@/components/financeiro/Paginacao'

const TODOS = '__todos'
const NENHUM = '__nenhum'

const saldoDe = (l: ContaLancamento) => Math.max((l.valor || 0) - (l.pago || 0), 0)
const vencido = (l: ContaLancamento) => saldoDe(l) > 0 && soData(l.vencimento) < hojeStr()

type LinhaResumo = Pick<ContaLancamento, 'natureza' | 'valor' | 'pago' | 'vencimento'>

export default function Lancamentos() {
  const { toast } = useToast()
  const [itens, setItens] = useState<ContaLancamento[]>([])
  const [contas, setContas] = useState<ContaCorrente[]>([])
  const [classes, setClasses] = useState<PlanoConta[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(true)

  const [fUnidade, setFUnidade] = useState(TODOS)
  const [fConta, setFConta] = useState(TODOS)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [busca, setBusca] = useState('')
  const buscaDeb = useDebouncedValue(busca)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [resumoLinhas, setResumoLinhas] = useState<LinhaResumo[]>([])
  const [tick, setTick] = useState(0)
  const reqRef = useRef(0)

  // formulário
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<ContaLancamento | null>(null)
  const [natureza, setNatureza] = useState<'Receber' | 'Pagar'>('Receber')
  const [descricao, setDescricao] = useState('')
  const [vencimento, setVencimento] = useState(hojeStr())
  const [valor, setValor] = useState(0)
  const [contaId, setContaId] = useState('')
  const [classeId, setClasseId] = useState('')
  const [unidade, setUnidade] = useState('')
  const [nrControle, setNrControle] = useState('')
  const [salvando, setSalvando] = useState(false)

  // baixa, estorno e histórico
  const [baixa, setBaixa] = useState<ContaLancamento | null>(null)
  const [valorBaixa, setValorBaixa] = useState(0)
  const [contaBaixa, setContaBaixa] = useState('')
  const [estorno, setEstorno] = useState<ContaLancamento | null>(null)
  const [valorEstorno, setValorEstorno] = useState(0)
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [historico, setHistorico] = useState<ContaLancamento | null>(null)
  const [excluir, setExcluir] = useState<ContaLancamento | null>(null)

  useEffect(() => {
    Promise.all([contasCorrentesService.list(), planoContasService.list(), unidadesService.list()])
      .then(([c, p, u]) => {
        setContas(c)
        setClasses(p)
        setUnidades(u)
      })
      .catch(() =>
        toast({
          title: 'Erro ao carregar cadastros',
          description: 'Não foi possível carregar contas, classificações e unidades.',
          variant: 'destructive',
        }),
      )
  }, [toast])

  const filtro = useMemo(() => {
    const q = buscaDeb.trim()
    let buscaF = ''
    if (q) {
      const e = escAspas(q)
      const partes = [`descricao ~ "${e}"`, `nr_controle ~ "${e}"`]
      if (/^[\d.,]+$/.test(q)) {
        const n = Number(q.replace(/\./g, '').replace(',', '.'))
        if (Number.isFinite(n)) partes.push(`valor = ${n}`)
      }
      buscaF = `(${partes.join(' || ')})`
    }
    return juntarFiltros(
      filtroPeriodo('vencimento', de, ate),
      fUnidade !== TODOS ? `unidade = "${escAspas(fUnidade)}"` : '',
      fConta !== TODOS ? `conta_id = "${escAspas(fConta)}"` : '',
      buscaF,
    )
  }, [buscaDeb, de, ate, fUnidade, fConta])

  useEffect(() => {
    setPage(1)
  }, [filtro])

  const carregar = useCallback(async () => {
    const req = ++reqRef.current
    setLoading(true)
    try {
      const res = await contasLancamentosService.listPage(page, POR_PAGINA, filtro)
      if (req !== reqRef.current) return
      setItens(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch {
      if (req !== reqRef.current) return
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os lançamentos.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }, [page, filtro, toast])

  useEffect(() => {
    carregar()
  }, [carregar, tick])

  // totais do filtro inteiro (consulta leve, sem expand)
  useEffect(() => {
    let ativo = true
    carregarTudo<LinhaResumo>('contas_lancamentos', {
      filter: filtro,
      fields: 'natureza,valor,pago,vencimento',
    })
      .then((rs) => {
        if (ativo) setResumoLinhas(rs)
      })
      .catch(() => {
        if (ativo) setResumoLinhas([])
      })
    return () => {
      ativo = false
    }
  }, [filtro, tick])

  const recarregar = () => setTick((t) => t + 1)

  const resumo = useMemo(() => {
    let receber = 0
    let pagar = 0
    let vencidos = 0
    let qtdVencidos = 0
    for (const l of resumoLinhas) {
      const s = Math.max((l.valor || 0) - (l.pago || 0), 0)
      if (l.natureza === 'Receber') receber += s
      else pagar += s
      if (s > 0 && soData(l.vencimento) < hojeStr()) {
        vencidos += s
        qtdVencidos += 1
      }
    }
    return { receber, pagar, vencidos, qtdVencidos }
  }, [resumoLinhas])

  const abrirNovo = () => {
    setEditando(null)
    setNatureza('Receber')
    setDescricao('')
    setVencimento(hojeStr())
    setValor(0)
    setContaId('')
    setClasseId('')
    setUnidade('')
    setNrControle('')
    setFormAberto(true)
  }

  const abrirEditar = (l: ContaLancamento) => {
    setEditando(l)
    setNatureza(l.natureza)
    setDescricao(l.descricao)
    setVencimento(soData(l.vencimento) || hojeStr())
    setValor(l.valor || 0)
    setContaId(l.conta_id || '')
    setClasseId(l.classificacao_id || '')
    setUnidade(l.unidade || '')
    setNrControle(l.nr_controle || '')
    setFormAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao.trim() || valor <= 0 || !vencimento) {
      toast({
        title: 'Campos inválidos',
        description: 'Informe descrição, vencimento e um valor maior que zero.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const payload: Partial<ContaLancamento> = {
        natureza,
        descricao: descricao.trim(),
        vencimento: toPbDate(vencimento),
        valor: Number(valor),
        conta_id: contaId || undefined,
        classificacao_id: classeId || undefined,
        unidade,
        nr_controle: nrControle.trim(),
      }
      if (editando) {
        await contasLancamentosService.update(editando.id, {
          ...payload,
          // limpa relações vazias explicitamente na edição
          conta_id: contaId || ('' as string),
          classificacao_id: classeId || ('' as string),
          // o pago nunca pode ultrapassar o valor
          ...((editando.pago || 0) > Number(valor) ? { pago: Number(valor) } : {}),
        })
        await registrarAuditoria('Contas', 'Editar', `${natureza}: ${descricao.trim()}`)
        toast({ title: 'Lançamento atualizado' })
      } else {
        await contasLancamentosService.create({ ...payload, pago: 0, pagamentos: [] })
        await registrarAuditoria(
          'Contas',
          'Criar',
          `${natureza}: ${descricao.trim()} (${brl(Number(valor))})`,
        )
        toast({ title: 'Lançamento criado' })
      }
      setFormAberto(false)
      recarregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const abrirBaixa = (l: ContaLancamento) => {
    setBaixa(l)
    setValorBaixa(saldoDe(l))
    setContaBaixa(l.conta_id || '')
  }

  const registrarBaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baixa) return
    const saldo = saldoDe(baixa)
    if (valorBaixa <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero.',
        variant: 'destructive',
      })
      return
    }
    const aplicar = Math.min(valorBaixa, saldo)
    setSalvando(true)
    try {
      const nova: PagamentoLancamento = {
        data: new Date().toISOString(),
        valor: aplicar,
        tipo: 'baixa',
        ...(contaBaixa ? { conta_id: contaBaixa } : {}),
      }
      const pagamentos = [...historicoPagamentos(baixa), nova]
      await contasLancamentosService.update(baixa.id, {
        pagamentos,
        pago: totalPago(pagamentos, baixa.valor || 0),
      })
      await registrarAuditoria(
        'Contas',
        'Baixa',
        `${baixa.descricao}: ${brl(aplicar)} (${baixa.natureza})`,
      )
      toast({
        title: 'Pagamento registrado',
        description:
          valorBaixa > saldo
            ? `Valor limitado ao saldo: ${brl(aplicar)}.`
            : `${brl(aplicar)} baixados.`,
      })
      setBaixa(null)
      recarregar()
    } catch {
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Não foi possível salvar a baixa.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const abrirEstorno = (l: ContaLancamento) => {
    setEstorno(l)
    setValorEstorno(l.pago || 0)
    setMotivoEstorno('')
  }

  const registrarEstorno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!estorno) return
    const pago = estorno.pago || 0
    if (valorEstorno <= 0 || valorEstorno > pago) {
      toast({
        title: 'Valor inválido',
        description: `Informe um valor entre R$ 0,01 e o total pago (${brl(pago)}).`,
        variant: 'destructive',
      })
      return
    }
    if (!motivoEstorno.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo do estorno.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const novo: PagamentoLancamento = {
        data: new Date().toISOString(),
        valor: Number(valorEstorno),
        tipo: 'estorno',
        observacao: motivoEstorno.trim(),
      }
      const pagamentos = [...historicoPagamentos(estorno), novo]
      await contasLancamentosService.update(estorno.id, {
        pagamentos,
        pago: totalPago(pagamentos, estorno.valor || 0),
      })
      await registrarAuditoria(
        'Contas',
        'Estorno',
        `${estorno.descricao}: ${brl(Number(valorEstorno))} (${estorno.natureza}) — ${motivoEstorno.trim()}`,
      )
      toast({ title: 'Estorno registrado', description: `${brl(Number(valorEstorno))} estornados.` })
      setEstorno(null)
      setHistorico(null)
      recarregar()
    } catch {
      toast({
        title: 'Erro ao estornar',
        description: 'Não foi possível salvar o estorno.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    try {
      await contasLancamentosService.delete(excluir.id)
      await registrarAuditoria('Contas', 'Excluir', excluir.descricao)
      toast({ title: 'Lançamento excluído' })
      setExcluir(null)
      if (itens.length === 1 && page > 1) setPage(page - 1)
      else recarregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      })
    }
  }

  const pagamentosDoHistorico = historico ? historicoPagamentos(historico) : []
  const nomeConta = (id?: string) => contas.find((c) => c.id === id)?.nome || '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Contas a pagar/receber
          </h1>
          <p className="text-sm text-[#667C78]">
            Lançamentos por vencimento, com baixa parcial, estorno e controle de vencidos.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-[#667C78]">A receber (em aberto)</p>
              <p className="text-lg font-bold text-[#166A5A]">{brl(resumo.receber)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-[#667C78]">A pagar (em aberto)</p>
              <p className="text-lg font-bold text-[#1C2B29]">{brl(resumo.pagar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-red-50 text-[#C0392B] flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-[#667C78]">
                Vencidos ({resumo.qtdVencidos}{' '}
                {resumo.qtdVencidos === 1 ? 'lançamento' : 'lançamentos'})
              </p>
              <p className="text-lg font-bold text-[#C0392B]">{brl(resumo.vencidos)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Busca</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#667C78]" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Descrição, nº controle, valor"
                className="pl-9 rounded-xl border-[#E3E7E5]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Unidade</Label>
            <Select value={fUnidade} onValueChange={setFUnidade}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.nome}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Conta corrente</Label>
            <Select value={fConta} onValueChange={setFConta}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas</SelectItem>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Vencimento de</Label>
            <Input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Vencimento até</Label>
            <Input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Natureza</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Nº Controle</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-xs text-[#667C78]">
                    Carregando lançamentos...
                  </TableCell>
                </TableRow>
              ) : itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-xs text-[#667C78]">
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                itens.map((l) => {
                  const saldo = saldoDe(l)
                  const venc = vencido(l)
                  return (
                    <TableRow key={l.id} className={venc ? 'bg-red-50/60' : ''}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            l.natureza === 'Receber'
                              ? 'bg-[#E2F0EB] text-[#166A5A] border-[#166A5A]/20 text-[10px]'
                              : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          {l.natureza}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-xs whitespace-nowrap ${venc ? 'text-[#C0392B] font-semibold' : ''}`}
                      >
                        {fmtData(l.vencimento)}
                        {venc && <span className="ml-1 text-[10px] uppercase">vencido</span>}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#1C2B29]">
                        {l.descricao}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {brl(l.valor)}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {brl(l.pago)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-xs font-semibold whitespace-nowrap ${saldo === 0 ? 'text-[#166A5A]' : ''}`}
                      >
                        {saldo === 0 ? 'Quitado' : brl(saldo)}
                      </TableCell>
                      <TableCell className="text-xs">{l.nr_controle || '—'}</TableCell>
                      <TableCell className="text-xs">{l.expand?.conta_id?.nome || '—'}</TableCell>
                      <TableCell className="text-xs">
                        {l.expand?.classificacao_id
                          ? `${l.expand.classificacao_id.classificacao}${l.expand.classificacao_id.nome ? ' - ' + l.expand.classificacao_id.nome : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{l.unidade || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={saldo === 0}
                          onClick={() => abrirBaixa(l)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                          aria-label="Registrar pagamento"
                          title="Registrar pagamento/baixa"
                        >
                          <Banknote className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={(l.pago || 0) <= 0}
                          onClick={() => abrirEstorno(l)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                          aria-label="Estornar pagamento"
                          title="Estornar"
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setHistorico(l)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                          aria-label="Histórico de pagamentos"
                          title="Histórico de pagamentos"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => abrirEditar(l)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                          aria-label="Editar lançamento"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExcluir(l)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <Paginacao
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onChange={setPage}
            loading={loading}
            rotulo="lançamentos"
          />
        </CardContent>
      </Card>

      {/* Formulário */}
      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              {editando ? 'Editar lançamento' : 'Novo lançamento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Conta a receber ou a pagar com vencimento e classificação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Natureza *</Label>
                <Select value={natureza} onValueChange={(v: 'Receber' | 'Pagar') => setNatureza(v)}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receber">Receber</SelectItem>
                    <SelectItem value="Pagar">Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Vencimento *</Label>
                <Input
                  type="date"
                  required
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Descrição *</Label>
              <Input
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value))}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Nº de controle</Label>
                <Input
                  value={nrControle}
                  onChange={(e) => setNrControle(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Conta corrente</Label>
                <Select
                  value={contaId || NENHUM}
                  onValueChange={(v) => setContaId(v === NENHUM ? '' : v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhuma</SelectItem>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Classificação</Label>
                <Select
                  value={classeId || NENHUM}
                  onValueChange={(v) => setClasseId(v === NENHUM ? '' : v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhuma</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.classificacao}
                        {c.nome ? ` - ${c.nome}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Unidade</Label>
                <Select
                  value={unidade || NENHUM}
                  onValueChange={(v) => setUnidade(v === NENHUM ? '' : v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Nenhuma</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.nome}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Baixa */}
      <Dialog open={!!baixa} onOpenChange={(v) => !v && setBaixa(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Registrar pagamento
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              {baixa?.descricao} — saldo em aberto {baixa ? brl(saldoDe(baixa)) : ''}. O valor é
              limitado ao saldo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={registrarBaixa} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Valor da baixa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                required
                value={valorBaixa}
                onChange={(e) => setValorBaixa(Number(e.target.value))}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Conta corrente</Label>
              <Select
                value={contaBaixa || NENHUM}
                onValueChange={(v) => setContaBaixa(v === NENHUM ? '' : v)}
              >
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Não informada</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBaixa(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {salvando ? 'Salvando...' : 'Confirmar baixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Estorno */}
      <Dialog open={!!estorno} onOpenChange={(v) => !v && setEstorno(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">Estornar pagamento</DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              {estorno?.descricao} — total pago {estorno ? brl(estorno.pago) : ''}. O estorno
              reduz o valor pago e reabre o saldo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={registrarEstorno} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Valor do estorno (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={estorno?.pago || undefined}
                required
                value={valorEstorno}
                onChange={(e) => setValorEstorno(Number(e.target.value))}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Motivo *</Label>
              <Input
                required
                value={motivoEstorno}
                onChange={(e) => setMotivoEstorno(e.target.value)}
                placeholder="Ex.: pagamento lançado em duplicidade"
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEstorno(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl"
              >
                {salvando ? 'Salvando...' : 'Confirmar estorno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Histórico de pagamentos */}
      <Dialog open={!!historico} onOpenChange={(v) => !v && setHistorico(null)}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Histórico de pagamentos
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              {historico?.descricao} — valor {brl(historico?.valor)}, pago {brl(historico?.pago)},
              saldo {historico ? brl(saldoDe(historico)) : ''}.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagamentosDoHistorico.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-xs text-[#667C78]">
                    Nenhum pagamento registrado.
                  </TableCell>
                </TableRow>
              ) : (
                pagamentosDoHistorico.map((p, i) => (
                  <TableRow key={`${p.data}-${i}`}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtData(p.data)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          p.tipo === 'baixa'
                            ? 'bg-green-100 text-green-700 border-green-200 text-[10px]'
                            : 'bg-red-50 text-[#C0392B] border-red-200 text-[10px]'
                        }
                      >
                        {p.tipo === 'baixa' ? 'Baixa' : 'Estorno'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {p.tipo === 'estorno' ? '− ' : ''}
                      {brl(p.valor)}
                    </TableCell>
                    <TableCell className="text-xs">{nomeConta(p.conta_id)}</TableCell>
                    <TableCell className="text-xs">{p.observacao || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!historico || (historico.pago || 0) <= 0}
              onClick={() => {
                if (!historico) return
                const alvo = historico
                setHistorico(null)
                abrirEstorno(alvo)
              }}
              className="rounded-xl gap-1.5"
            >
              <Undo2 className="h-4 w-4" /> Estornar
            </Button>
            <Button
              type="button"
              onClick={() => setHistorico(null)}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir lançamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja excluir <strong>{excluir?.descricao}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
