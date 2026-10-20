import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  estoqueItensService,
  procedimentoInsumosService,
  registrarAuditoria,
} from '@/services/crm'
import type { EstoqueItem, ProcedimentoInsumo } from '@/types/crm'
import { escAspas } from '@/lib/financeiro'
import type { AcaoExtraProps } from './cadastrosConfig'

/** Insumos de estoque consumidos por sessão de um procedimento. */
export default function InsumosProcedimentoDialog({ registro, onClose }: AcaoExtraProps) {
  const { toast } = useToast()
  const nomeProcedimento = String(registro.nome ?? registro.id)
  const [insumos, setInsumos] = useState<ProcedimentoInsumo[]>([])
  const [itens, setItens] = useState<EstoqueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [itemId, setItemId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [edicoes, setEdicoes] = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [ins, its] = await Promise.all([
        procedimentoInsumosService.list(`procedimento_id = "${escAspas(registro.id)}"`),
        estoqueItensService.list('oculto != true'),
      ])
      setInsumos(ins)
      setItens(its)
      setEdicoes({})
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os insumos do procedimento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [registro.id, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const disponiveis = useMemo(() => {
    const usados = new Set(insumos.map((i) => i.item_id))
    return itens.filter((i) => !usados.has(i.id))
  }, [insumos, itens])

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemId || !(quantidade > 0)) {
      toast({
        title: 'Dados inválidos',
        description: 'Selecione o item de estoque e informe uma quantidade maior que zero.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await procedimentoInsumosService.create({
        procedimento_id: registro.id,
        item_id: itemId,
        quantidade: Number(quantidade),
      })
      const nomeItem = itens.find((i) => i.id === itemId)?.nome || itemId
      await registrarAuditoria(
        'Cadastro de Procedimentos',
        'Insumo adicionado',
        `${nomeProcedimento}: ${nomeItem} (${quantidade} por sessão)`,
      )
      setItemId('')
      setQuantidade(1)
      await carregar()
    } catch {
      toast({
        title: 'Erro ao adicionar',
        description: 'Não foi possível adicionar o insumo.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const salvarQuantidade = async (ins: ProcedimentoInsumo) => {
    const nova = Number(String(edicoes[ins.id] ?? '').replace(',', '.'))
    if (!(nova > 0)) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe uma quantidade maior que zero.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await procedimentoInsumosService.update(ins.id, { quantidade: nova })
      await registrarAuditoria(
        'Cadastro de Procedimentos',
        'Insumo alterado',
        `${nomeProcedimento}: ${ins.expand?.item_id?.nome || ins.item_id} (${ins.quantidade} → ${nova} por sessão)`,
      )
      await carregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a quantidade.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const remover = async (ins: ProcedimentoInsumo) => {
    setSalvando(true)
    try {
      await procedimentoInsumosService.delete(ins.id)
      await registrarAuditoria(
        'Cadastro de Procedimentos',
        'Insumo removido',
        `${nomeProcedimento}: ${ins.expand?.item_id?.nome || ins.item_id}`,
      )
      await carregar()
    } catch {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o insumo.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#1C2B29]">
            Insumos — {nomeProcedimento}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#667C78]">
            Itens de estoque consumidos a cada sessão realizada deste procedimento. A baixa é
            feita automaticamente em Controle de Sessões.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={adicionar} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-7 space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Item de estoque</Label>
            <Select value={itemId || undefined} onValueChange={setItemId}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                <SelectValue
                  placeholder={disponiveis.length === 0 ? 'Nenhum item disponível' : 'Selecione'}
                />
              </SelectTrigger>
              <SelectContent>
                {disponiveis.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nome}
                    {i.apresentacao ? ` — ${i.apresentacao}` : ''} (saldo {i.saldo || 0}
                    {i.unidade ? ` ${i.unidade}` : ''})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-7 sm:col-span-3 space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Qtd. por sessão</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="rounded-xl border-[#E3E7E5]"
            />
          </div>
          <div className="col-span-5 sm:col-span-2">
            <Button
              type="submit"
              disabled={salvando || !itemId}
              className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs gap-1"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Saldo atual</TableHead>
              <TableHead className="w-32">Qtd. por sessão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-[#667C78]">
                  Carregando insumos...
                </TableCell>
              </TableRow>
            ) : insumos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-[#667C78]">
                  Nenhum insumo vinculado a este procedimento.
                </TableCell>
              </TableRow>
            ) : (
              insumos.map((ins) => {
                const item = ins.expand?.item_id
                const saldo = item?.saldo || 0
                const sujo =
                  edicoes[ins.id] !== undefined && Number(edicoes[ins.id]) !== ins.quantidade
                return (
                  <TableRow key={ins.id}>
                    <TableCell className="text-xs font-medium text-[#1C2B29]">
                      {item?.nome || ins.item_id}
                      {item?.apresentacao && (
                        <span className="block text-[10px] font-normal text-[#667C78]">
                          {item.apresentacao}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right text-xs font-semibold ${saldo < ins.quantidade ? 'text-[#C0392B]' : ''}`}
                    >
                      {saldo} {item?.unidade || ''}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        aria-label={`Quantidade por sessão de ${item?.nome || 'insumo'}`}
                        value={edicoes[ins.id] ?? String(ins.quantidade)}
                        onChange={(e) => setEdicoes((m) => ({ ...m, [ins.id]: e.target.value }))}
                        className="h-8 rounded-lg border-[#E3E7E5] text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={!sujo || salvando}
                        onClick={() => salvarQuantidade(ins)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                        aria-label="Salvar quantidade"
                        title="Salvar quantidade"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={salvando}
                        onClick={() => remover(ins)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                        aria-label="Remover insumo"
                        title="Remover"
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
