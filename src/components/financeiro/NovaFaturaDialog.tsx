import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Lock, Plus, Trash2, Receipt } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  faturasService,
  formasPagamentoService,
  procedimentosService,
  unidadesService,
  registrarAuditoria,
} from '@/services/crm'
import type {
  Fatura,
  FormaPagamento,
  ItemFatura,
  Paciente,
  Procedimento,
  StatusFatura,
  Unidade,
} from '@/types/crm'
import { brl, hojeStr, listarTodosPacientes, soData, toPbDate } from '@/lib/financeiro'
import {
  procedimentoElegivel,
  sessoesDaFatura,
  sessoesDesejadas,
  sincronizarSessoesDaFatura,
} from '@/lib/faturaSessoes'
import PacienteSelect from './PacienteSelect'

interface NovaFaturaDialogProps {
  open: boolean
  onClose: () => void
  onSaved?: (fatura: Fatura) => void
  pacienteId?: string
  pacienteFixo?: boolean
  observacoesIniciais?: string
  /** Quando informada, o diálogo abre em modo edição (fatura não fechada). */
  fatura?: Fatura
}

const LIVRE = '__livre'
const NENHUM = '__nenhum'

interface LinhaItem {
  key: number
  procedimento_id: string
  descricao: string
  quantidade: number
  valor_unitario: number
  gerarSessoes: boolean
}

let seq = 0
const novaLinha = (): LinhaItem => ({
  key: ++seq,
  procedimento_id: '',
  descricao: '',
  quantidade: 1,
  valor_unitario: 0,
  gerarSessoes: true,
})

const linhasDaFatura = (f: Fatura): LinhaItem[] => {
  const itens = Array.isArray(f.itens) ? f.itens : []
  if (itens.length === 0) return [novaLinha()]
  return itens.map((i) => ({
    key: ++seq,
    procedimento_id: i.procedimento_id || '',
    descricao: i.descricao || '',
    quantidade: i.quantidade || 1,
    valor_unitario: i.valor_unitario || 0,
    gerarSessoes: false,
  }))
}

export default function NovaFaturaDialog({
  open,
  onClose,
  onSaved,
  pacienteId,
  pacienteFixo,
  observacoesIniciais,
  fatura,
}: NovaFaturaDialogProps) {
  const { toast } = useToast()
  const editando = !!fatura
  const bloqueada = !!fatura?.fechado
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [formas, setFormas] = useState<FormaPagamento[]>([])
  const [procs, setProcs] = useState<Procedimento[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [paciente, setPaciente] = useState('')
  const [data, setData] = useState(hojeStr())
  const [formaId, setFormaId] = useState('')
  const [tabela, setTabela] = useState('')
  const [unidade, setUnidade] = useState('')
  const [guia, setGuia] = useState('')
  const [nf, setNf] = useState('')
  const [recibo, setRecibo] = useState('')
  const [status, setStatus] = useState<StatusFatura>('Fatura')
  const [obs, setObs] = useState('')
  const [linhas, setLinhas] = useState<LinhaItem[]>([novaLinha()])

  useEffect(() => {
    if (!open) return
    if (fatura) {
      setPaciente(fatura.paciente_id)
      setData(soData(fatura.data) || hojeStr())
      setFormaId(fatura.forma_pagamento_id || '')
      setTabela(fatura.tabela || '')
      setUnidade(fatura.unidade || '')
      setGuia(fatura.guia_nr || '')
      setNf(fatura.nf || '')
      setRecibo(fatura.recibo || '')
      setStatus(fatura.status || 'Fatura')
      setObs(fatura.observacoes || '')
      setLinhas(linhasDaFatura(fatura))
    } else {
      setPaciente(pacienteId || '')
      setData(hojeStr())
      setFormaId('')
      setTabela('')
      setUnidade('')
      setGuia('')
      setNf('')
      setRecibo('')
      setStatus('Fatura')
      setObs(observacoesIniciais || '')
      setLinhas([novaLinha()])
    }

    let ativo = true
    setLoading(true)
    Promise.all([
      listarTodosPacientes(),
      formasPagamentoService.list(),
      procedimentosService.list(),
      unidadesService.list(),
      fatura ? sessoesDaFatura(fatura.id) : Promise.resolve([]),
    ])
      .then(([p, f, pr, u, sessoes]) => {
        if (!ativo) return
        setPacientes(p)
        setFormas(f)
        setProcs(pr)
        setUnidades(u)
        if (fatura) {
          // itens que já têm controle de sessões gerado continuam marcados
          const comSessao = new Set(sessoes.map((s) => s.procedimento_id).filter(Boolean))
          setLinhas((ls) =>
            ls.map((l) => ({ ...l, gerarSessoes: comSessao.has(l.procedimento_id) })),
          )
        }
      })
      .catch(() => {
        if (ativo)
          toast({
            title: 'Erro ao carregar dados',
            description: 'Não foi possível carregar pacientes e cadastros de apoio.',
            variant: 'destructive',
          })
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fatura?.id])

  const total = useMemo(
    () => linhas.reduce((s, l) => s + (l.quantidade || 0) * (l.valor_unitario || 0), 0),
    [linhas],
  )

  const procsSelecionaveis = useMemo(
    () =>
      procs.filter((p) => p.ativo !== false || linhas.some((l) => l.procedimento_id === p.id)),
    [procs, linhas],
  )

  const atualizar = (key: number, patch: Partial<LinhaItem>) =>
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const escolherProc = (key: number, v: string) => {
    if (v === LIVRE) {
      atualizar(key, { procedimento_id: '' })
      return
    }
    const p = procs.find((x) => x.id === v)
    atualizar(key, {
      procedimento_id: v,
      descricao: p?.nome || '',
      valor_unitario: p?.preco ?? 0,
      gerarSessoes: true,
    })
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bloqueada) return
    if (!paciente) {
      toast({
        title: 'Paciente obrigatório',
        description: 'Selecione o paciente.',
        variant: 'destructive',
      })
      return
    }
    const validas = linhas.filter(
      (l) => l.descricao.trim() && l.quantidade > 0 && l.valor_unitario > 0,
    )
    const itens: ItemFatura[] = validas.map((l) => ({
      ...(l.procedimento_id ? { procedimento_id: l.procedimento_id } : {}),
      descricao: l.descricao.trim(),
      quantidade: Number(l.quantidade),
      valor_unitario: Number(l.valor_unitario),
    }))
    if (itens.length === 0) {
      toast({
        title: 'Itens inválidos',
        description: 'Informe ao menos um item com descrição, quantidade e valor maiores que zero.',
        variant: 'destructive',
      })
      return
    }
    const valor = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0)
    const dataFatura = data || hojeStr()
    setSaving(true)
    try {
      if (fatura) {
        // garante que ninguém fechou a fatura enquanto o diálogo estava aberto
        const atual = await faturasService.getById(fatura.id, '')
        if (atual.fechado) {
          toast({
            title: 'Fatura fechada',
            description: 'Reabra a fatura na listagem para alterar os dados.',
            variant: 'destructive',
          })
          return
        }
      }
      const payload: Partial<Fatura> = {
        paciente_id: paciente,
        data: toPbDate(dataFatura),
        valor,
        forma_pagamento_id: fatura ? formaId : formaId || undefined,
        tabela: tabela.trim(),
        unidade,
        guia_nr: guia.trim(),
        nf: nf.trim(),
        recibo: recibo.trim(),
        status,
        observacoes: obs.trim(),
        itens,
        ...(fatura ? {} : { fechado: false }),
      }
      const salva = fatura
        ? await faturasService.update(fatura.id, payload)
        : await faturasService.create(payload)
      const nome = pacientes.find((p) => p.id === paciente)?.nome || paciente
      if (fatura) {
        const statusAntes = fatura.status || 'Fatura'
        await registrarAuditoria(
          'Faturamento',
          'Editar',
          `Fatura de ${nome}: valor ${brl(fatura.valor)} → ${brl(valor)}; status ${statusAntes} → ${status}`,
        )
      } else {
        await registrarAuditoria(
          'Faturamento',
          'Criar',
          `Fatura de ${nome} no valor de ${brl(valor)}`,
        )
      }

      // Controle de sessões gerado a partir dos itens
      try {
        const cancelada = status === 'Cancelada'
        const desejadas = sessoesDesejadas(
          validas.map((l) => ({
            ...(l.procedimento_id ? { procedimento_id: l.procedimento_id } : {}),
            descricao: l.descricao,
            quantidade: Number(l.quantidade),
            valor_unitario: Number(l.valor_unitario),
            gerarSessoes: l.gerarSessoes,
          })),
          procs,
        )
        if (fatura || (!cancelada && desejadas.length > 0)) {
          const avisos = await sincronizarSessoesDaFatura({
            fatura: { id: salva.id, paciente_id: paciente, data: dataFatura },
            desejadas,
            encerrar: cancelada,
            motivo: `Fatura de ${nome}`,
          })
          if (avisos.length > 0) {
            toast({
              title: 'Atenção ao controle de sessões',
              description: avisos.join(' '),
              variant: 'destructive',
            })
          }
        }
      } catch {
        toast({
          title: 'Sessões não sincronizadas',
          description:
            'A fatura foi salva, mas não foi possível atualizar o controle de sessões. Ajuste-o em Controle de Sessões.',
          variant: 'destructive',
        })
      }

      toast({
        title: fatura ? 'Fatura atualizada' : 'Fatura criada',
        description: `${brl(valor)} registrados para ${nome}.`,
      })
      onSaved?.(salva)
      onClose()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: fatura
          ? 'Não foi possível atualizar a fatura.'
          : 'Não foi possível criar a fatura.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#1C2B29]">
                {editando ? 'Editar fatura' : 'Nova fatura'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667C78]">
                {editando
                  ? 'Altere os dados, os itens e as condições de pagamento da fatura.'
                  : 'Registre a venda com os itens e as condições de pagamento.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {bloqueada && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Lock className="h-4 w-4 shrink-0" />
            Fatura fechada: reabra-a na listagem para alterar os dados.
          </div>
        )}

        <form onSubmit={salvar} className="space-y-4 pt-2">
          <fieldset disabled={bloqueada} className="space-y-4 min-w-0 border-0 p-0 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#1C2B29]">Paciente *</Label>
                <PacienteSelect
                  pacientes={pacientes}
                  value={paciente}
                  onChange={setPaciente}
                  disabled={!!pacienteFixo || loading || bloqueada}
                  placeholder={loading ? 'Carregando...' : 'Selecione o paciente'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Data *</Label>
                <Input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Forma de pagamento</Label>
                <Select
                  value={formaId || NENHUM}
                  onValueChange={(v) => setFormaId(v === NENHUM ? '' : v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>Não informada</SelectItem>
                    {formas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Tabela / Convênio</Label>
                <Input
                  value={tabela}
                  onChange={(e) => setTabela(e.target.value)}
                  placeholder="Ex.: Particular"
                  className="rounded-xl border-[#E3E7E5]"
                />
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
                    <SelectItem value={NENHUM}>Não informada</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.nome}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1C2B29]">Itens *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLinhas((ls) => [...ls, novaLinha()])}
                  className="rounded-xl text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-2">
                {linhas.map((l) => {
                  const elegivel = procedimentoElegivel(procs, l.procedimento_id)
                  return (
                    <div
                      key={l.key}
                      className="grid grid-cols-12 gap-2 items-end p-2.5 rounded-xl border border-[#E3E7E5] bg-[#F7F6F3]/60"
                    >
                      <div className="col-span-12 sm:col-span-3 space-y-1">
                        <Label className="text-[10px] text-[#667C78]">Procedimento</Label>
                        <Select
                          value={l.procedimento_id || LIVRE}
                          onValueChange={(v) => escolherProc(l.key, v)}
                        >
                          <SelectTrigger className="rounded-lg border-[#E3E7E5] h-9 text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={LIVRE}>Descrição livre</SelectItem>
                            {procsSelecionaveis.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}
                                {p.ativo === false ? ' (inativo)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <Label className="text-[10px] text-[#667C78]">Descrição</Label>
                        <Input
                          value={l.descricao}
                          onChange={(e) => atualizar(l.key, { descricao: e.target.value })}
                          className="rounded-lg border-[#E3E7E5] h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 space-y-1">
                        <Label className="text-[10px] text-[#667C78]">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantidade}
                          onChange={(e) => atualizar(l.key, { quantidade: Number(e.target.value) })}
                          className="rounded-lg border-[#E3E7E5] h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-2 space-y-1">
                        <Label className="text-[10px] text-[#667C78]">Valor unit. (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.valor_unitario}
                          onChange={(e) =>
                            atualizar(l.key, { valor_unitario: Number(e.target.value) })
                          }
                          className="rounded-lg border-[#E3E7E5] h-9 text-xs bg-white"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 text-right text-xs font-semibold text-[#1C2B29] pb-2">
                        {brl((l.quantidade || 0) * (l.valor_unitario || 0))}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          disabled={linhas.length === 1}
                          onClick={() => setLinhas((ls) => ls.filter((x) => x.key !== l.key))}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {elegivel && (
                        <div className="col-span-12 flex items-center gap-2 pt-1">
                          <Checkbox
                            id={`sessoes-${l.key}`}
                            checked={l.gerarSessoes}
                            onCheckedChange={(v) => atualizar(l.key, { gerarSessoes: v === true })}
                          />
                          <Label
                            htmlFor={`sessoes-${l.key}`}
                            className="text-[11px] text-[#1C2B29] font-normal"
                          >
                            Gerar controle de sessões ({(l.quantidade || 0) * (elegivel.nr_sessoes || 0)}{' '}
                            {(l.quantidade || 0) * (elegivel.nr_sessoes || 0) === 1
                              ? 'sessão'
                              : 'sessões'}
                            )
                          </Label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end items-center gap-2 text-sm">
                <span className="text-[#667C78]">Valor total:</span>
                <strong className="text-lg text-[#166A5A]">{brl(total)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Nº da guia</Label>
                <Input
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">NF</Label>
                <Input
                  value={nf}
                  onChange={(e) => setNf(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Recibo</Label>
                <Input
                  value={recibo}
                  onChange={(e) => setRecibo(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Status</Label>
                <Select value={status} onValueChange={(v: StatusFatura) => setStatus(v)}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fatura">Fatura</SelectItem>
                    <SelectItem value="Paga">Paga</SelectItem>
                    <SelectItem value="Pendência">Pendência</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {status === 'Cancelada' && editando && (
              <p className="text-[11px] text-amber-700">
                Ao salvar como cancelada, as sessões geradas por esta fatura sem nenhuma realizada
                serão removidas; as demais serão mantidas.
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Observações</Label>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>
          </fieldset>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || loading || bloqueada}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
            >
              {saving ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar fatura'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
