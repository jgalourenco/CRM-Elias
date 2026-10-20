import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AlertTriangle, ArrowLeftRight, Edit, Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  estoqueItensService,
  estoqueMovimentosService,
  movimentarEstoque,
  registrarAuditoria,
} from '@/services/crm'
import type { EstoqueItem, EstoqueMovimento } from '@/types/crm'
import {
  POR_PAGINA,
  carregarTudo,
  escAspas,
  filtroPeriodo,
  juntarFiltros,
  msgErro,
} from '@/lib/financeiro'
import Paginacao from '@/components/financeiro/Paginacao'

type TipoMov = EstoqueMovimento['tipo']

const TODOS = '__todos'

const fmtDataHora = (s?: string) => {
  if (!s) return '—'
  const d = new Date(s.replace(' ', 'T'))
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const baixo = (i: EstoqueItem) => (i.saldo || 0) <= (i.minimo || 0)

export default function Estoque() {
  const { toast } = useToast()
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [movs, setMovs] = useState<EstoqueMovimento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMovs, setLoadingMovs] = useState(true)
  const [busca, setBusca] = useState('')
  const buscaDeb = useDebouncedValue(busca)
  const [verOcultos, setVerOcultos] = useState(false)

  // itens: paginação no servidor
  const [pageItens, setPageItens] = useState(1)
  const [totalPagesItens, setTotalPagesItens] = useState(1)
  const [totalItens, setTotalItens] = useState(0)
  const [qtdBaixo, setQtdBaixo] = useState(0)
  const reqItens = useRef(0)

  // histórico: filtros e paginação no servidor
  const [todosItens, setTodosItens] = useState<Pick<EstoqueItem, 'id' | 'nome'>[]>([])
  const [fItem, setFItem] = useState(TODOS)
  const [deMov, setDeMov] = useState('')
  const [ateMov, setAteMov] = useState('')
  const [pageMovs, setPageMovs] = useState(1)
  const [totalPagesMovs, setTotalPagesMovs] = useState(1)
  const [totalMovs, setTotalMovs] = useState(0)
  const reqMovs = useRef(0)

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<EstoqueItem | null>(null)
  const [nome, setNome] = useState('')
  const [apresentacao, setApresentacao] = useState('')
  const [unidade, setUnidade] = useState('')
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [minimo, setMinimo] = useState(0)
  const [oculto, setOculto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [movItem, setMovItem] = useState<EstoqueItem | null>(null)
  const [movTipo, setMovTipo] = useState<TipoMov>('Entrada')
  const [movQtd, setMovQtd] = useState(1)
  const [movMotivo, setMovMotivo] = useState('')
  const [excluir, setExcluir] = useState<EstoqueItem | null>(null)

  const filtroItens = useMemo(() => {
    const q = buscaDeb.trim()
    const e = escAspas(q)
    return juntarFiltros(
      verOcultos ? '' : 'oculto != true',
      q ? `(nome ~ "${e}" || apresentacao ~ "${e}")` : '',
    )
  }, [buscaDeb, verOcultos])

  const filtroMovs = useMemo(
    () =>
      juntarFiltros(
        fItem !== TODOS ? `item_id = "${escAspas(fItem)}"` : '',
        filtroPeriodo('data', deMov, ateMov),
      ),
    [fItem, deMov, ateMov],
  )

  useEffect(() => {
    setPageItens(1)
  }, [filtroItens])

  useEffect(() => {
    setPageMovs(1)
  }, [filtroMovs])

  const carregarMovs = useCallback(async () => {
    const req = ++reqMovs.current
    setLoadingMovs(true)
    try {
      const res = await estoqueMovimentosService.listPage(pageMovs, POR_PAGINA, filtroMovs)
      if (req !== reqMovs.current) return
      setMovs(res.items)
      setTotalPagesMovs(res.totalPages)
      setTotalMovs(res.totalItems)
    } catch {
      if (req !== reqMovs.current) return
      toast({
        title: 'Erro ao carregar histórico',
        description: 'Não foi possível carregar as movimentações.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqMovs.current) setLoadingMovs(false)
    }
  }, [pageMovs, filtroMovs, toast])

  const carregar = useCallback(async () => {
    const req = ++reqItens.current
    setLoading(true)
    try {
      const res = await estoqueItensService.listPage(pageItens, POR_PAGINA, filtroItens)
      if (req !== reqItens.current) return
      setItens(res.items)
      setTotalPagesItens(res.totalPages)
      setTotalItens(res.totalItems)
    } catch {
      if (req !== reqItens.current) return
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o estoque.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqItens.current) setLoading(false)
    }
  }, [pageItens, filtroItens, toast])

  // itens abaixo do mínimo no filtro inteiro (consulta leve)
  const carregarBaixo = useCallback(async () => {
    try {
      const rs = await carregarTudo<Pick<EstoqueItem, 'saldo' | 'minimo'>>('estoque_itens', {
        filter: filtroItens,
        fields: 'saldo,minimo',
      })
      setQtdBaixo(rs.filter((i) => (i.saldo || 0) <= (i.minimo || 0)).length)
    } catch {
      setQtdBaixo(0)
    }
  }, [filtroItens])

  // lista completa (só id e nome) para o filtro do histórico
  const carregarTodosItens = useCallback(async () => {
    try {
      setTodosItens(
        await carregarTudo<Pick<EstoqueItem, 'id' | 'nome'>>('estoque_itens', {
          sort: 'nome',
          fields: 'id,nome',
        }),
      )
    } catch {
      setTodosItens([])
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    carregarMovs()
  }, [carregarMovs])

  useEffect(() => {
    carregarBaixo()
  }, [carregarBaixo])

  useEffect(() => {
    carregarTodosItens()
  }, [carregarTodosItens])

  const recarregarTudo = () => {
    carregar()
    carregarMovs()
    carregarBaixo()
    carregarTodosItens()
  }

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setApresentacao('')
    setUnidade('')
    setSaldoInicial(0)
    setMinimo(0)
    setOculto(false)
    setFormAberto(true)
  }

  const abrirEditar = (i: EstoqueItem) => {
    setEditando(i)
    setNome(i.nome)
    setApresentacao(i.apresentacao || '')
    setUnidade(i.unidade || '')
    setMinimo(i.minimo || 0)
    setOculto(!!i.oculto)
    setFormAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const base: Partial<EstoqueItem> = {
        nome: nome.trim(),
        apresentacao: apresentacao.trim(),
        unidade: unidade.trim(),
        minimo: Number(minimo),
        oculto,
      }
      if (editando) {
        await estoqueItensService.update(editando.id, base)
        await registrarAuditoria('Estoque', 'Editar item', nome.trim())
        toast({ title: 'Item atualizado' })
      } else {
        const criado = await estoqueItensService.create({ ...base, saldo: 0 })
        if (saldoInicial > 0) {
          await movimentarEstoque(criado, 'Entrada', Number(saldoInicial), 'Saldo inicial')
        }
        await registrarAuditoria('Estoque', 'Criar item', nome.trim())
        toast({ title: 'Item criado' })
      }
      setFormAberto(false)
      recarregarTudo()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o item.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const abrirMov = (i: EstoqueItem) => {
    setMovItem(i)
    setMovTipo('Entrada')
    setMovQtd(1)
    setMovMotivo('')
  }

  const registrarMov = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movItem) return
    if (movQtd < 0 || (movTipo !== 'Ajuste' && movQtd <= 0)) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe uma quantidade maior que zero.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await movimentarEstoque(movItem, movTipo, Number(movQtd), movMotivo.trim())
      toast({ title: 'Movimentação registrada', description: `${movTipo} em ${movItem.nome}.` })
      setMovItem(null)
      recarregarTudo()
    } catch (err) {
      const m = msgErro(err, 'Não foi possível registrar a movimentação.')
      toast({
        title: m.includes('Saldo insuficiente') ? 'Saldo insuficiente' : 'Erro na movimentação',
        description: m,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    try {
      await estoqueItensService.delete(excluir.id)
      await registrarAuditoria('Estoque', 'Excluir item', excluir.nome)
      toast({ title: 'Item excluído', description: 'O histórico do item também foi removido.' })
      setExcluir(null)
      recarregarTudo()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o item.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Controle de Estoque
          </h1>
          <p className="text-sm text-[#667C78]">
            Saldo por item, estoque mínimo e histórico de movimentações.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo item
        </Button>
      </div>

      <Tabs defaultValue="itens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="historico">Histórico de movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="itens" className="space-y-4">
          <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold text-[#1C2B29]">Busca</Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#667C78]" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Item ou apresentação"
                    className="pl-9 rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="ocultos" checked={verOcultos} onCheckedChange={setVerOcultos} />
                <Label htmlFor="ocultos" className="text-xs text-[#1C2B29]">
                  Ver itens ocultos
                </Label>
              </div>
              {qtdBaixo > 0 && (
                <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold text-[#C0392B]">
                  <AlertTriangle className="h-4 w-4" />
                  {qtdBaixo} {qtdBaixo === 1 ? 'item abaixo' : 'itens abaixo'} do mínimo
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Apresentação</TableHead>
                    <TableHead className="text-right">Saldo Total</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                        Carregando estoque...
                      </TableCell>
                    </TableRow>
                  ) : itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                        Nenhum item de estoque encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((i) => {
                      const b = baixo(i)
                      return (
                        <TableRow key={i.id} className={b ? 'bg-red-50/60' : ''}>
                          <TableCell className="text-xs font-medium text-[#1C2B29]">
                            {i.nome}
                            {i.oculto && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                Oculto
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{i.apresentacao || '—'}</TableCell>
                          <TableCell
                            className={`text-right text-xs font-semibold ${b ? 'text-[#C0392B]' : ''}`}
                          >
                            <span className="inline-flex items-center gap-1">
                              {b && <AlertTriangle className="h-3.5 w-3.5" />}
                              {i.saldo || 0} {i.unidade || ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs">{i.minimo || 0}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirMov(i)}
                              className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                              aria-label="Movimentar estoque"
                              title="Movimentar"
                            >
                              <ArrowLeftRight className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => abrirEditar(i)}
                              className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                              aria-label="Editar item"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setExcluir(i)}
                              className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                              aria-label="Excluir item"
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
                page={pageItens}
                totalPages={totalPagesItens}
                totalItems={totalItens}
                onChange={setPageItens}
                loading={loading}
                rotulo="itens"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Item</Label>
                <Select value={fItem} onValueChange={setFItem}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os itens</SelectItem>
                    {todosItens.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">De</Label>
                <Input
                  type="date"
                  value={deMov}
                  onChange={(e) => setDeMov(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Até</Label>
                <Input
                  type="date"
                  value={ateMov}
                  onChange={(e) => setAteMov(e.target.value)}
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
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMovs ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                        Carregando histórico...
                      </TableCell>
                    </TableRow>
                  ) : movs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-[#667C78]">
                        Nenhuma movimentação registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movs.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {fmtDataHora(m.data || m.created)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-[#1C2B29]">
                          {m.expand?.item_id?.nome || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              m.tipo === 'Entrada'
                                ? 'bg-green-100 text-green-700 border-green-200 text-[10px]'
                                : m.tipo === 'Saída'
                                  ? 'bg-red-50 text-[#C0392B] border-red-200 text-[10px]'
                                  : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px]'
                            }
                          >
                            {m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {m.quantidade}
                        </TableCell>
                        <TableCell className="text-xs">{m.motivo || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Paginacao
                page={pageMovs}
                totalPages={totalPagesMovs}
                totalItems={totalMovs}
                onChange={setPageMovs}
                loading={loadingMovs}
                rotulo="movimentações"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Item */}
      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              {editando ? 'Editar item' : 'Novo item de estoque'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              {editando
                ? 'O saldo só é alterado por movimentações.'
                : 'Informe o saldo inicial para gerar a primeira entrada.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Item *</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Apresentação</Label>
                <Input
                  value={apresentacao}
                  onChange={(e) => setApresentacao(e.target.value)}
                  placeholder="Ex.: Ampola 2 ml"
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Unidade</Label>
                <Input
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value)}
                  placeholder="Ex.: un"
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!editando && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">Saldo inicial</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(Number(e.target.value))}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Estoque mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={minimo}
                  onChange={(e) => setMinimo(Number(e.target.value))}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="oculto" checked={oculto} onCheckedChange={setOculto} />
              <Label htmlFor="oculto" className="text-xs text-[#1C2B29]">
                Ocultar item da listagem
              </Label>
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

      {/* Movimentação */}
      <Dialog open={!!movItem} onOpenChange={(v) => !v && setMovItem(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Movimentar estoque
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              {movItem?.nome} — saldo atual {movItem?.saldo || 0} {movItem?.unidade || ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={registrarMov} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Tipo</Label>
              <Select value={movTipo} onValueChange={(v: TipoMov) => setMovTipo(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada">Entrada</SelectItem>
                  <SelectItem value="Saída">Saída</SelectItem>
                  <SelectItem value="Ajuste">Ajuste (define o saldo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                {movTipo === 'Ajuste' ? 'Novo saldo' : 'Quantidade'}
              </Label>
              <Input
                type="number"
                min={0}
                step="any"
                required
                value={movQtd}
                onChange={(e) => setMovQtd(Number(e.target.value))}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Motivo</Label>
              <Input
                value={movMotivo}
                onChange={(e) => setMovMotivo(e.target.value)}
                placeholder="Ex.: compra, uso em sessão, inventário"
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMovItem(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {salvando ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir item
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Excluir <strong>{excluir?.nome}</strong> também remove todo o seu histórico de
              movimentações. Para apenas esconder o item, use a opção &quot;Ocultar&quot; na edição.
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
