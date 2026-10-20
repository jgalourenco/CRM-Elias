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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Download, Edit, Lock, Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { faturasService, registrarAuditoria } from '@/services/crm'
import type { Fatura, StatusFatura } from '@/types/crm'
import {
  POR_PAGINA,
  baixarCsv,
  brl,
  carregarTudo,
  diasAtrasStr,
  escAspas,
  filtroPeriodo,
  filtroPorIds,
  fmtData,
  hojeStr,
  idsPacientesPorNome,
  juntarFiltros,
} from '@/lib/financeiro'
import { sincronizarSessoesDaFatura } from '@/lib/faturaSessoes'
import NovaFaturaDialog from '@/components/financeiro/NovaFaturaDialog'
import Paginacao from '@/components/financeiro/Paginacao'

const STATUS: StatusFatura[] = ['Fatura', 'Paga', 'Pendência', 'Cancelada']

const statusClasse: Record<StatusFatura, string> = {
  Fatura: 'bg-[#E2F0EB] text-[#166A5A] border-[#166A5A]/20',
  Paga: 'bg-green-100 text-green-700 border-green-200',
  Pendência: 'bg-amber-100 text-amber-700 border-amber-200',
  Cancelada: 'bg-red-50 text-[#C0392B] border-red-200',
}

export default function Faturamento() {
  const { toast } = useToast()
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const buscaDeb = useDebouncedValue(busca)
  const [de, setDe] = useState(diasAtrasStr(30))
  const [ate, setAte] = useState(hojeStr())
  const [status, setStatus] = useState<string>('todos')

  // filtro PocketBase calculado (a busca por cliente precisa consultar os pacientes)
  const [filtro, setFiltro] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalValor, setTotalValor] = useState(0)
  const [tick, setTick] = useState(0)
  const reqRef = useRef(0)

  const [novaAberta, setNovaAberta] = useState(false)
  const [editando, setEditando] = useState<Fatura | null>(null)
  const [excluir, setExcluir] = useState<Fatura | null>(null)

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
          `guia_nr ~ "${e}"`,
          `nf ~ "${e}"`,
          `recibo ~ "${e}"`,
          `tabela ~ "${e}"`,
        ]
          .filter(Boolean)
          .join(' || ')})`
      }
      return juntarFiltros(
        filtroPeriodo('data', de, ate),
        status !== 'todos' ? `status = "${escAspas(status)}"` : '',
        buscaF,
      )
    }
    montar()
      .then((f) => {
        if (!ativo) return
        setFiltro(f)
        setPage(1)
      })
      .catch(() => {
        if (!ativo) return
        setFiltro('')
        toast({
          title: 'Erro na busca',
          description: 'Não foi possível aplicar a busca por cliente.',
          variant: 'destructive',
        })
      })
    return () => {
      ativo = false
    }
  }, [buscaDeb, de, ate, status, toast])

  const carregar = useCallback(async () => {
    if (filtro === null) return
    const req = ++reqRef.current
    setLoading(true)
    try {
      const res = await faturasService.listPage(page, POR_PAGINA, filtro)
      if (req !== reqRef.current) return
      setFaturas(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch {
      if (req !== reqRef.current) return
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as faturas.',
        variant: 'destructive',
      })
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }, [filtro, page, toast])

  useEffect(() => {
    carregar()
  }, [carregar, tick])

  // soma de valores de todo o filtro (consulta leve, sem expand)
  useEffect(() => {
    if (filtro === null) return
    let ativo = true
    carregarTudo<{ valor?: number }>('faturas', { filter: filtro, fields: 'valor' })
      .then((rs) => {
        if (ativo) setTotalValor(rs.reduce((s, f) => s + (f.valor || 0), 0))
      })
      .catch(() => {
        if (ativo) setTotalValor(0)
      })
    return () => {
      ativo = false
    }
  }, [filtro, tick])

  const recarregar = () => setTick((t) => t + 1)

  const alternarFechado = async (f: Fatura, fechado: boolean) => {
    try {
      const atualizada = await faturasService.update(f.id, { fechado })
      setFaturas((fs) => fs.map((x) => (x.id === f.id ? { ...x, fechado: atualizada.fechado } : x)))
      await registrarAuditoria(
        'Faturamento',
        fechado ? 'Fechar' : 'Reabrir',
        `Fatura de ${f.expand?.paciente_id?.nome || f.paciente_id} (${brl(f.valor)})`,
      )
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o fechamento da fatura.',
        variant: 'destructive',
      })
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    const alvo = excluir
    const nome = alvo.expand?.paciente_id?.nome || alvo.paciente_id
    try {
      // sessões geradas pela fatura: remove as sem realizadas e avisa sobre as demais
      const avisos = await sincronizarSessoesDaFatura({
        fatura: { id: alvo.id, paciente_id: alvo.paciente_id, data: alvo.data },
        desejadas: [],
        encerrar: true,
        motivo: `Exclusão da fatura de ${nome}`,
      })
      await faturasService.delete(alvo.id)
      await registrarAuditoria('Faturamento', 'Excluir', `Fatura de ${nome} (${brl(alvo.valor)})`)
      toast({ title: 'Fatura excluída' })
      if (avisos.length > 0) {
        toast({
          title: 'Atenção ao controle de sessões',
          description: avisos.join(' '),
          variant: 'destructive',
        })
      }
      setExcluir(null)
      if (faturas.length === 1 && page > 1) setPage(page - 1)
      else recarregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a fatura.',
        variant: 'destructive',
      })
    }
  }

  const exportar = async () => {
    if (filtro === null) return
    try {
      const todas = await carregarTudo<Fatura>('faturas', {
        filter: filtro,
        sort: '-data',
        expand: 'paciente_id,forma_pagamento_id',
      })
      baixarCsv('faturamento.csv', [
        [
          'Data',
          'Cliente',
          'Guia Nr.',
          'NF',
          'Recibo',
          'Valor',
          'Forma de pagamento',
          'Tabela',
          'Unidade',
          'Fechado',
          'Status',
          'Observações',
        ],
        ...todas.map((f) => [
          fmtData(f.data),
          f.expand?.paciente_id?.nome || '',
          f.guia_nr,
          f.nf,
          f.recibo,
          (f.valor || 0).toFixed(2).replace('.', ','),
          f.expand?.forma_pagamento_id?.nome || '',
          f.tabela,
          f.unidade,
          f.fechado ? 'Sim' : 'Não',
          f.status,
          f.observacoes,
        ]),
      ])
    } catch {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível carregar as faturas para exportação.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Vendas & Faturamento
          </h1>
          <p className="text-sm text-[#667C78]">
            Faturas emitidas, guias, notas fiscais e recibos por período.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportar}
            disabled={totalItems === 0}
            className="rounded-xl text-xs gap-1.5"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            onClick={() => setNovaAberta(true)}
            className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Nova fatura
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs font-semibold text-[#1C2B29]">Busca</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-[#667C78]" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cliente, guia, NF, recibo, tabela"
                className="pl-9 rounded-xl border-[#E3E7E5]"
              />
            </div>
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
            <Label className="text-xs font-semibold text-[#1C2B29]">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#E3E7E5] shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Guia Nr.</TableHead>
                <TableHead>NF</TableHead>
                <TableHead>Recibo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Forma de pagamento</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Fechado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-xs text-[#667C78]">
                    Carregando faturas...
                  </TableCell>
                </TableRow>
              ) : faturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-xs text-[#667C78]">
                    Nenhuma fatura encontrada para os filtros informados.
                  </TableCell>
                </TableRow>
              ) : (
                faturas.map((f) => (
                  <TableRow key={f.id} className={f.status === 'Cancelada' ? 'opacity-60' : ''}>
                    <TableCell className="whitespace-nowrap text-xs">{fmtData(f.data)}</TableCell>
                    <TableCell className="text-xs font-medium text-[#1C2B29]">
                      {f.expand?.paciente_id?.nome || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{f.guia_nr || '—'}</TableCell>
                    <TableCell className="text-xs">{f.nf || '—'}</TableCell>
                    <TableCell className="text-xs">{f.recibo || '—'}</TableCell>
                    <TableCell className="text-right text-xs font-semibold whitespace-nowrap">
                      {brl(f.valor)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.expand?.forma_pagamento_id?.nome || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{f.tabela || '—'}</TableCell>
                    <TableCell className="text-xs">{f.unidade || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={!!f.fechado}
                          onCheckedChange={(v) => alternarFechado(f, v)}
                          aria-label="Fatura fechada"
                        />
                        {f.fechado && <Lock className="h-3.5 w-3.5 text-[#667C78]" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${statusClasse[f.status || 'Fatura']}`}
                      >
                        {f.status || 'Fatura'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate" title={f.observacoes}>
                      {f.observacoes || '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditando(f)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                        aria-label="Editar fatura"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={!!f.fechado}
                        onClick={() => setExcluir(f)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                        aria-label="Excluir fatura"
                        title={f.fechado ? 'Fatura fechada não pode ser excluída' : 'Excluir'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {!loading && totalItems > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-xs font-semibold text-[#1C2B29]">
                    {totalItems} {totalItems === 1 ? 'fatura' : 'faturas'} no filtro
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-[#166A5A] whitespace-nowrap">
                    {brl(totalValor)}
                  </TableCell>
                  <TableCell colSpan={7} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
          <Paginacao
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onChange={setPage}
            loading={loading}
            rotulo="faturas"
          />
        </CardContent>
      </Card>

      <NovaFaturaDialog
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        onSaved={() => recarregar()}
      />

      <NovaFaturaDialog
        open={!!editando}
        fatura={editando ?? undefined}
        onClose={() => setEditando(null)}
        onSaved={() => recarregar()}
      />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir fatura
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja excluir a fatura de{' '}
              <strong>{excluir?.expand?.paciente_id?.nome}</strong> no valor de{' '}
              <strong>{brl(excluir?.valor)}</strong>? As sessões geradas por ela sem nenhuma
              realizada serão removidas; as demais serão mantidas. Esta ação não pode ser desfeita.
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
