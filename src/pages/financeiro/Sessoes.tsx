import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { CheckCircle2, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  desfazerSessaoRealizada,
  procedimentosService,
  registrarAuditoria,
  registrarSessaoRealizada,
  sessoesVendaService,
} from '@/services/crm'
import type { Paciente, Procedimento, SessaoVenda } from '@/types/crm'
import {
  POR_PAGINA,
  escAspas,
  filtroPorIds,
  fmtData,
  hojeStr,
  idsPacientesPorNome,
  juntarFiltros,
  listarTodosPacientes,
  toPbDate,
} from '@/lib/financeiro'
import PacienteSelect from '@/components/financeiro/PacienteSelect'
import Paginacao from '@/components/financeiro/Paginacao'

const LIVRE = '__livre'

const nomeProc = (s: SessaoVenda) => s.procedimento_nome || s.expand?.procedimento_id?.nome || '—'

export default function Sessoes() {
  const { toast } = useToast()
  const [sessoes, setSessoes] = useState<SessaoVenda[]>([])
  const [procs, setProcs] = useState<Procedimento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const buscaDeb = useDebouncedValue(busca)
  const [verConcluidas, setVerConcluidas] = useState(false)
  const [registrandoId, setRegistrandoId] = useState<string | null>(null)

  const [filtro, setFiltro] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [tick, setTick] = useState(0)
  const reqRef = useRef(0)

  const [formAberto, setFormAberto] = useState(false)
  const [paciente, setPaciente] = useState('')
  const [procId, setProcId] = useState('')
  const [procTexto, setProcTexto] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [dataVenda, setDataVenda] = useState(hojeStr())
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState<SessaoVenda | null>(null)
  const [desfazer, setDesfazer] = useState<SessaoVenda | null>(null)

  useEffect(() => {
    let ativo = true
    const montar = async () => {
      const q = buscaDeb.trim()
      let buscaF = ''
      if (q) {
        const e = escAspas(q)
        const ids = await idsPacientesPorNome(q)
        buscaF = `(${[
          ids.length > 0 ? filtroPorIds('paciente_id', ids) : '',
          `procedimento_nome ~ "${e}"`,
          `procedimento_id.nome ~ "${e}"`,
        ]
          .filter(Boolean)
          .join(' || ')})`
      }
      return juntarFiltros(verConcluidas ? '' : 'concluida != true', buscaF)
    }
    montar()
      .then((f) => {
        if (!ativo) return
        setFiltro(f)
        setPage(1)
      })
      .catch(() => {
        if (!ativo) return
        setFiltro(verConcluidas ? '' : 'concluida != true')
        toast({
          title: 'Erro na busca',
          description: 'Não foi possível aplicar a busca por paciente.',
          variant: 'destructive',
        })
      })
    return () => {
      ativo = false
    }
  }, [buscaDeb, verConcluidas, toast])

  const carregar = useCallback(async () => {
    if (filtro === null) return
    const req = ++reqRef.current
    setLoading(true)
    try {
      const res = await sessoesVendaService.listPage(page, POR_PAGINA, filtro)
      if (req !== reqRef.current) return
      setSessoes(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch {
      if (req !== reqRef.current) return
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as sessões.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }, [filtro, page, toast])

  useEffect(() => {
    carregar()
  }, [carregar, tick])

  const recarregar = () => setTick((t) => t + 1)

  // cadastros só são necessários para a venda; carrega ao abrir o formulário
  useEffect(() => {
    if (!formAberto) return
    let ativo = true
    Promise.all([listarTodosPacientes(), procedimentosService.list('ativo != false')])
      .then(([p, pr]) => {
        if (!ativo) return
        setPacientes(p)
        setProcs(pr)
      })
      .catch(() =>
        toast({
          title: 'Erro ao carregar cadastros',
          description: 'Não foi possível carregar pacientes e procedimentos.',
          variant: 'destructive',
        }),
      )
    return () => {
      ativo = false
    }
  }, [formAberto, toast])

  const abrirNova = () => {
    setPaciente('')
    setProcId('')
    setProcTexto('')
    setQuantidade(1)
    setDataVenda(hojeStr())
    setFormAberto(true)
  }

  const escolherProc = (v: string) => {
    if (v === LIVRE) {
      setProcId('')
      return
    }
    setProcId(v)
    const p = procs.find((x) => x.id === v)
    if (p?.nr_sessoes && p.nr_sessoes > 0) setQuantidade(p.nr_sessoes)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeProcedimento = procId
      ? procs.find((p) => p.id === procId)?.nome || ''
      : procTexto.trim()
    if (!paciente || !nomeProcedimento || quantidade < 1) {
      toast({
        title: 'Campos inválidos',
        description: 'Informe paciente, procedimento e quantidade de sessões.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await sessoesVendaService.create({
        paciente_id: paciente,
        procedimento_id: procId || undefined,
        procedimento_nome: nomeProcedimento,
        data_venda: toPbDate(dataVenda || hojeStr()),
        quantidade: Math.floor(quantidade),
        realizadas: 0,
        concluida: false,
      })
      const nomePac = pacientes.find((p) => p.id === paciente)?.nome || paciente
      await registrarAuditoria(
        'Sessões',
        'Nova venda',
        `${nomePac}: ${quantidade}x ${nomeProcedimento}`,
      )
      toast({ title: 'Venda de sessões registrada' })
      setFormAberto(false)
      recarregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a venda.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const aplicarNaLista = (id: string, atualizada: SessaoVenda) =>
    setSessoes((ls) =>
      ls.map((x) =>
        x.id === id ? { ...x, realizadas: atualizada.realizadas, concluida: atualizada.concluida } : x,
      ),
    )

  const realizar = async (s: SessaoVenda) => {
    setRegistrandoId(s.id)
    try {
      const { sessao: atualizada, avisos } = await registrarSessaoRealizada(s)
      aplicarNaLista(s.id, atualizada)
      await registrarAuditoria(
        'Sessões',
        'Sessão realizada',
        `${s.expand?.paciente_id?.nome || s.paciente_id}: ${nomeProc(s)} (${atualizada.realizadas}/${s.quantidade})`,
      )
      toast({
        title: 'Sessão registrada',
        description: atualizada.concluida
          ? 'Todas as sessões foram realizadas.'
          : `${atualizada.realizadas} de ${s.quantidade} realizadas.`,
      })
      if (avisos.length > 0) {
        toast({
          title: 'Atenção ao estoque',
          description: avisos.join(' '),
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao registrar sessão',
        description: 'Não foi possível atualizar a venda.',
        variant: 'destructive',
      })
    } finally {
      setRegistrandoId(null)
    }
  }

  const confirmarDesfazer = async () => {
    if (!desfazer) return
    const s = desfazer
    setDesfazer(null)
    setRegistrandoId(s.id)
    try {
      const { sessao: atualizada, avisos } = await desfazerSessaoRealizada(s)
      aplicarNaLista(s.id, atualizada)
      await registrarAuditoria(
        'Sessões',
        'Sessão desfeita',
        `${s.expand?.paciente_id?.nome || s.paciente_id}: ${nomeProc(s)} (${atualizada.realizadas}/${s.quantidade})`,
      )
      toast({
        title: 'Sessão desfeita',
        description: `${atualizada.realizadas} de ${s.quantidade} realizadas. Insumos devolvidos ao estoque.`,
      })
      if (avisos.length > 0) {
        toast({
          title: 'Atenção ao estoque',
          description: avisos.join(' '),
          variant: 'destructive',
        })
      }
      // a venda reaberta pode sair/entrar do filtro de concluídas
      recarregar()
    } catch {
      toast({
        title: 'Erro ao desfazer sessão',
        description: 'Não foi possível atualizar a venda.',
        variant: 'destructive',
      })
    } finally {
      setRegistrandoId(null)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    try {
      await sessoesVendaService.delete(excluir.id)
      await registrarAuditoria('Sessões', 'Excluir venda', `${nomeProc(excluir)}`)
      toast({ title: 'Venda excluída' })
      setExcluir(null)
      if (sessoes.length === 1 && page > 1) setPage(page - 1)
      else recarregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a venda.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Controle de Sessões
          </h1>
          <p className="text-sm text-[#667C78]">
            Acompanhe as sessões vendidas, realizadas e restantes por paciente.
          </p>
        </div>
        <Button
          onClick={abrirNova}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Nova venda de sessões
        </Button>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Busca</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#667C78]" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Paciente ou procedimento"
                className="pl-9 rounded-xl border-[#E3E7E5]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="concl" checked={verConcluidas} onCheckedChange={setVerConcluidas} />
            <Label htmlFor="concl" className="text-xs text-[#1C2B29]">
              Ver sessões concluídas
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da venda</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead className="text-right">Qtd/Sessões</TableHead>
                <TableHead className="text-right">Realizadas</TableHead>
                <TableHead className="text-right">Restam</TableHead>
                <TableHead className="min-w-[140px]">Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-[#667C78]">
                    Carregando sessões...
                  </TableCell>
                </TableRow>
              ) : sessoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-[#667C78]">
                    Nenhuma venda de sessões {verConcluidas ? '' : 'em andamento '}encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sessoes.map((s) => {
                  const total = s.quantidade || 0
                  const feitas = Math.min(s.realizadas || 0, total)
                  const restam = Math.max(total - feitas, 0)
                  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0
                  const concluida = restam === 0
                  const ocupada = registrandoId === s.id
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {fmtData(s.data_venda)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#1C2B29]">
                        {s.expand?.paciente_id?.nome || '—'}
                      </TableCell>
                      <TableCell className="text-xs">{nomeProc(s)}</TableCell>
                      <TableCell className="text-right text-xs">{total}</TableCell>
                      <TableCell className="text-right text-xs">{feitas}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {concluida ? (
                          <Badge
                            className="bg-green-100 text-green-700 border-green-200 text-[10px]"
                            variant="outline"
                          >
                            Concluída
                          </Badge>
                        ) : (
                          restam
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className="h-2 w-full bg-[#E2F0EB] rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${pct}% das sessões realizadas`}
                        >
                          <div
                            className="h-full bg-[#166A5A] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#667C78]">{pct}%</span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={concluida || ocupada}
                          onClick={() => realizar(s)}
                          className="rounded-xl text-xs gap-1 mr-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {ocupada ? 'Processando...' : 'Registrar sessão realizada'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={feitas === 0 || ocupada}
                          onClick={() => setDesfazer(s)}
                          className="rounded-xl text-xs gap-1 mr-1 text-[#667C78] hover:text-[#C0392B]"
                          title="Desfaz a última sessão e devolve os insumos ao estoque"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Desfazer última sessão
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExcluir(s)}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                          aria-label="Excluir venda"
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
            rotulo="vendas de sessões"
          />
        </CardContent>
      </Card>

      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent className="max-w-md rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              Nova venda de sessões
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Registre o pacote de sessões vendido ao paciente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Paciente *</Label>
              <PacienteSelect pacientes={pacientes} value={paciente} onChange={setPaciente} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Procedimento *</Label>
              <Select value={procId || LIVRE} onValueChange={escolherProc}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LIVRE}>Texto livre</SelectItem>
                  {procs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!procId && (
                <Input
                  value={procTexto}
                  onChange={(e) => setProcTexto(e.target.value)}
                  placeholder="Descreva o procedimento"
                  className="rounded-xl border-[#E3E7E5]"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Quantidade de sessões *
                </Label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Data da venda</Label>
                <Input
                  type="date"
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
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
                {salvando ? 'Salvando...' : 'Salvar venda'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!desfazer} onOpenChange={(v) => !v && setDesfazer(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Desfazer última sessão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Desfazer a última sessão de <strong>{desfazer ? nomeProc(desfazer) : ''}</strong> de{' '}
              <strong>{desfazer?.expand?.paciente_id?.nome}</strong>? A contagem de realizadas
              diminui em 1 e os insumos baixados do estoque por ela são devolvidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDesfazer}
              className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl"
            >
              Desfazer sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir venda de sessões
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Excluir <strong>{excluir ? nomeProc(excluir) : ''}</strong> de{' '}
              <strong>{excluir?.expand?.paciente_id?.nome}</strong>? Esta ação não pode ser
              desfeita.
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
