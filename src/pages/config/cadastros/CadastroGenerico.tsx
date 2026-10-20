import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { registrarAuditoria } from '@/services/crm'
import {
  getCadastro,
  type AcaoExtraDef,
  type CadastroDef,
  type ColunaDef,
  type Registro,
} from './cadastrosConfig'

type ValorForm = string | boolean
type FormState = Record<string, ValorForm>

const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarCelula(col: ColunaDef, valor: unknown): React.ReactNode {
  if (col.format === 'bool') {
    return valor ? (
      <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB]">Sim</Badge>
    ) : (
      <Badge variant="outline" className="text-[#667C78]">
        Não
      </Badge>
    )
  }
  if (valor === undefined || valor === null || valor === '') return <span className="text-[#667C78]">—</span>
  if (col.format === 'color') {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          className="h-4 w-4 rounded border border-[#E3E7E5]"
          style={{ backgroundColor: String(valor) }}
        />
        <span className="text-xs text-[#667C78]">{String(valor)}</span>
      </span>
    )
  }
  const n = Number(valor)
  if (col.format === 'money') return Number.isFinite(n) ? moeda(n) : String(valor)
  if (col.format === 'percent')
    return Number.isFinite(n) ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : String(valor)
  if (col.format === 'number')
    return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(valor)
  return String(valor)
}

function registroParaForm(def: CadastroDef, reg: Registro | null): FormState {
  const s: FormState = {}
  for (const c of def.campos) {
    const v = reg?.[c.name]
    if (c.type === 'bool') s[c.name] = reg ? Boolean(v) : c.name === 'ativo'
    else if (c.type === 'color') s[c.name] = typeof v === 'string' && v ? v : '#166A5A'
    else if (v === undefined || v === null) s[c.name] = ''
    else s[c.name] = String(v)
  }
  return s
}

function formParaPayload(def: CadastroDef, form: FormState): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  for (const c of def.campos) {
    const v = form[c.name]
    if (c.type === 'bool') p[c.name] = Boolean(v)
    else if (c.type === 'number' || c.type === 'money' || c.type === 'percent') {
      const n = Number(String(v).replace(',', '.'))
      p[c.name] = String(v).trim() === '' || !Number.isFinite(n) ? 0 : n
    } else p[c.name] = String(v).trim()
  }
  return p
}

function CadastroConteudo({ def }: { def: CadastroDef }) {
  const { toast } = useToast()
  const [itens, setItens] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Registro | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [salvando, setSalvando] = useState(false)
  const [margemVisivel, setMargemVisivel] = useState(false)
  const [excluir, setExcluir] = useState<Registro | null>(null)
  const [acaoAberta, setAcaoAberta] = useState<{ acao: AcaoExtraDef; registro: Registro } | null>(
    null,
  )

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setItens(await def.servico.list('', def.sort))
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: `Não foi possível carregar ${def.titulo.toLowerCase()}.`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [def, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return itens
    return itens.filter((it) =>
      def.busca.some((campo) =>
        String(it[campo] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    )
  }, [itens, busca, def])

  const nomeDe = (r: Registro) => String(r[def.nomeCampo] ?? r.id)

  const abrirNovo = () => {
    setEditando(null)
    setForm(registroParaForm(def, null))
    setMargemVisivel(false)
    setModalAberto(true)
  }

  const abrirEditar = (r: Registro) => {
    setEditando(r)
    setForm(registroParaForm(def, r))
    setMargemVisivel(false)
    setModalAberto(true)
  }

  const setCampo = (nome: string, valor: ValorForm) => setForm((f) => ({ ...f, [nome]: valor }))

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const faltando = def.campos.filter(
      (c) => c.required && String(form[c.name] ?? '').trim() === '',
    )
    if (faltando.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${faltando.map((c) => c.label).join(', ')}.`,
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const payload = formParaPayload(def, form)
      const nome = String(payload[def.nomeCampo] ?? '')
      let salvoId = editando?.id ?? ''
      if (editando) {
        await def.servico.update(editando.id, payload)
      } else {
        const criado = await def.servico.create(payload)
        salvoId = criado.id
      }
      // Garante um único registro marcado como padrão.
      if (def.unicoBool && payload[def.unicoBool] === true) {
        const outros = itens.filter((i) => i.id !== salvoId && i[def.unicoBool as string] === true)
        await Promise.all(
          outros.map((o) => def.servico.update(o.id, { [def.unicoBool as string]: false })),
        )
      }
      await registrarAuditoria(def.titulo, editando ? 'Editar' : 'Criar', nome)
      toast({
        title: editando ? 'Registro atualizado' : 'Registro criado',
        description: `${nome} salvo com sucesso.`,
      })
      setModalAberto(false)
      carregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o registro. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    const alvo = excluir
    try {
      await def.servico.delete(alvo.id)
      await registrarAuditoria(def.titulo, 'Excluir', nomeDe(alvo))
      toast({ title: 'Registro excluído', description: `${nomeDe(alvo)} foi removido.` })
      setExcluir(null)
      carregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro. Ele pode estar em uso.',
        variant: 'destructive',
      })
    }
  }

  const preco = Number(String(form.preco ?? '').replace(',', '.')) || 0
  const custo = Number(String(form.custo ?? '').replace(',', '.')) || 0
  const margem = preco - custo
  const margemPct = preco > 0 ? (margem / preco) * 100 : 0

  const Icone = def.icone

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/config"
            className="inline-flex items-center gap-1 text-xs text-[#667C78] hover:text-[#166A5A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Configurações
          </Link>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <Icone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
                {def.titulo}
              </h1>
              <p className="text-sm text-[#667C78]">{def.descricao}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={abrirNovo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar"
          className="pl-9 rounded-xl border-[#E3E7E5]"
        />
      </div>

      <div className="rounded-xl border border-[#E3E7E5] bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {def.colunas.map((c) => (
                <TableHead key={c.name} className="text-xs font-semibold text-[#1C2B29]">
                  {c.label}
                </TableHead>
              ))}
              <TableHead
                className={`${def.acoesExtras?.length ? '' : 'w-24 '}text-right text-xs font-semibold text-[#1C2B29]`}
              >
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={def.colunas.length + 1}
                  className="py-12 text-center text-xs text-[#667C78]"
                >
                  <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={def.colunas.length + 1}
                  className="py-12 text-center text-xs text-[#667C78]"
                >
                  {itens.length === 0
                    ? 'Nenhum registro cadastrado. Use o botão Novo para começar.'
                    : 'Nenhum registro encontrado para a busca.'}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((it) => (
                <TableRow key={it.id}>
                  {def.colunas.map((c) => (
                    <TableCell key={c.name} className="text-sm text-[#1C2B29]">
                      {formatarCelula(c, it[c.name])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {def.acoesExtras?.map((acao) => {
                        const IconeAcao = acao.icone
                        return (
                          <Button
                            key={acao.id}
                            size="sm"
                            variant="ghost"
                            aria-label={`${acao.label} de ${nomeDe(it)}`}
                            onClick={() => setAcaoAberta({ acao, registro: it })}
                            className="h-8 gap-1 text-xs text-[#667C78] hover:text-[#166A5A]"
                          >
                            {IconeAcao && <IconeAcao className="h-4 w-4" />}
                            {acao.label}
                          </Button>
                        )
                      })}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${nomeDe(it)}`}
                        onClick={() => abrirEditar(it)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${nomeDe(it)}`}
                        onClick={() => setExcluir(it)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">
              {editando ? `Editar ${def.singular}` : `Novo(a) ${def.singular}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvar} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {def.campos.map((c) => {
                const id = `campo-${c.name}`
                const span = c.full || c.type === 'textarea' ? 'sm:col-span-2' : ''
                const rotulo = (
                  <Label htmlFor={id} className="text-xs font-semibold text-[#1C2B29]">
                    {c.label}
                    {c.required ? ' *' : ''}
                  </Label>
                )
                if (c.type === 'bool') {
                  return (
                    <div
                      key={c.name}
                      className={`flex items-center justify-between rounded-xl border border-[#E3E7E5] px-3 py-2 ${span}`}
                    >
                      {rotulo}
                      <Switch
                        id={id}
                        checked={Boolean(form[c.name])}
                        onCheckedChange={(v) => setCampo(c.name, v)}
                      />
                    </div>
                  )
                }
                return (
                  <div key={c.name} className={`space-y-1.5 ${span}`}>
                    {rotulo}
                    {c.type === 'textarea' ? (
                      <Textarea
                        id={id}
                        rows={c.rows ?? 3}
                        value={String(form[c.name] ?? '')}
                        onChange={(e) => setCampo(c.name, e.target.value)}
                        className="rounded-xl border-[#E3E7E5]"
                      />
                    ) : c.type === 'select' ? (
                      <Select
                        value={String(form[c.name] ?? '') || undefined}
                        onValueChange={(v) => setCampo(c.name, v)}
                      >
                        <SelectTrigger id={id} className="rounded-xl border-[#E3E7E5]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {(c.options ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : c.type === 'color' ? (
                      <div className="flex items-center gap-2">
                        <input
                          id={id}
                          type="color"
                          value={String(form[c.name] ?? '#166A5A')}
                          onChange={(e) => setCampo(c.name, e.target.value)}
                          className="h-9 w-14 cursor-pointer rounded-lg border border-[#E3E7E5] bg-white p-1"
                        />
                        <span className="text-xs text-[#667C78]">{String(form[c.name])}</span>
                      </div>
                    ) : (
                      <Input
                        id={id}
                        type={
                          c.type === 'number' || c.type === 'money' || c.type === 'percent'
                            ? 'number'
                            : c.type === 'date'
                              ? 'date'
                              : 'text'
                        }
                        step={c.type === 'number' ? 'any' : c.type === 'date' ? undefined : '0.01'}
                        min={c.type === 'number' || c.type === 'money' || c.type === 'percent' ? 0 : undefined}
                        placeholder={c.placeholder}
                        value={String(form[c.name] ?? '')}
                        onChange={(e) => setCampo(c.name, e.target.value)}
                        className="rounded-xl border-[#E3E7E5]"
                      />
                    )}
                    {c.hint && <p className="text-[11px] text-[#667C78]">{c.hint}</p>}
                  </div>
                )
              })}
            </div>

            {def.margem && (
              <div className="rounded-xl border border-[#E3E7E5] bg-[#F7F6F3] p-3 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMargemVisivel(true)}
                  className="rounded-xl gap-1.5 text-xs"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Calcular margem
                </Button>
                {margemVisivel && (
                  <div className="text-xs text-[#1C2B29] flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      Margem (preço − custo):{' '}
                      <strong className={margem < 0 ? 'text-[#C0392B]' : 'text-[#166A5A]'}>
                        {moeda(margem)}
                      </strong>
                    </span>
                    <span>
                      Margem percentual:{' '}
                      <strong className={margem < 0 ? 'text-[#C0392B]' : 'text-[#166A5A]'}>
                        {margemPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
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

      {acaoAberta && (
        <acaoAberta.acao.Componente
          registro={acaoAberta.registro}
          onClose={() => setAcaoAberta(null)}
        />
      )}

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir registro
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja excluir <strong>{excluir ? nomeDe(excluir) : ''}</strong>? Esta
              ação não pode ser desfeita.
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

export default function CadastroGenerico() {
  const { slug } = useParams<{ slug: string }>()
  const def = getCadastro(slug)

  if (!def) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-[#667C78]">Cadastro não encontrado.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/config">Voltar às configurações</Link>
        </Button>
      </div>
    )
  }
  // key força reinício do estado ao trocar de cadastro.
  return <CadastroConteudo key={def.slug} def={def} />
}
