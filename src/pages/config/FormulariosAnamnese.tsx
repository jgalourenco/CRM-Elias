import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  Heading,
  ListChecks,
  Loader2,
  Plus,
  Save,
  TextCursorInput,
  Trash2,
  Type,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { formulariosAnamneseService, registrarAuditoria } from '@/services/crm'
import type { FormularioAnamnese, ItemFormulario, TipoItemFormulario } from '@/types/crm'

const TIPOS: { tipo: TipoItemFormulario; label: string; icone: typeof Type }[] = [
  { tipo: 'titulo', label: 'Título de seção', icone: Heading },
  { tipo: 'rotulo', label: 'Texto/Rótulo', icone: Type },
  { tipo: 'caixa_texto', label: 'Caixa de texto', icone: TextCursorInput },
  { tipo: 'painel_check', label: 'Painel de check', icone: ListChecks },
  { tipo: 'painel_radio', label: 'Painel de rádio', icone: CircleDot },
]

const rotuloTipo = (t: TipoItemFormulario) => TIPOS.find((x) => x.tipo === t)?.label ?? t
const temOpcoes = (t: TipoItemFormulario) => t === 'painel_check' || t === 'painel_radio'

function mover<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const c = [...arr]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

function Previa({ itens }: { itens: ItemFormulario[] }) {
  if (itens.length === 0)
    return <p className="text-xs text-[#667C78]">Adicione itens para visualizar o formulário.</p>
  return (
    <div className="space-y-3">
      {itens.map((it) => {
        const rotulo = it.rotulo || '(sem rótulo)'
        if (it.tipo === 'titulo')
          return (
            <h3
              key={it.id}
              className="text-sm font-bold text-[#166A5A] border-b border-[#E3E7E5] pb-1 pt-2"
            >
              {rotulo}
            </h3>
          )
        if (it.tipo === 'rotulo')
          return (
            <p key={it.id} className="text-xs text-[#667C78]">
              {rotulo}
            </p>
          )
        if (it.tipo === 'caixa_texto')
          return (
            <div key={it.id} className="space-y-1">
              <Label className="text-xs font-semibold text-[#1C2B29]">{rotulo}</Label>
              <Textarea disabled rows={2} className="rounded-xl border-[#E3E7E5]" />
            </div>
          )
        const radio = it.tipo === 'painel_radio'
        return (
          <fieldset key={it.id} className="space-y-1">
            <legend className="text-xs font-semibold text-[#1C2B29]">{rotulo}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(it.opcoes ?? []).map((o, i) => (
                <label key={`${it.id}-${i}`} className="flex items-center gap-1.5 text-xs">
                  <input type={radio ? 'radio' : 'checkbox'} disabled name={it.id} />
                  {o || '(opção vazia)'}
                </label>
              ))}
              {(it.opcoes ?? []).length === 0 && (
                <span className="text-xs text-[#667C78]">Sem opções.</span>
              )}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

export default function FormulariosAnamnese() {
  const { toast } = useToast()
  const [lista, setLista] = useState<FormularioAnamnese[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<string | null>(null) // id | 'novo' | null
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [estrutura, setEstrutura] = useState<ItemFormulario[]>([])
  const [salvando, setSalvando] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await formulariosAnamneseService.list('', 'nome'))
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os formulários.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const abrir = (f: FormularioAnamnese) => {
    setSelecionado(f.id)
    setNome(f.nome)
    setAtivo(f.ativo !== false)
    setEstrutura(Array.isArray(f.estrutura) ? f.estrutura.map((i) => ({ ...i })) : [])
  }

  const novo = () => {
    setSelecionado('novo')
    setNome('')
    setAtivo(true)
    setEstrutura([])
  }

  const adicionar = (tipo: TipoItemFormulario) =>
    setEstrutura((e) => [
      ...e,
      {
        id: crypto.randomUUID(),
        tipo,
        rotulo: '',
        ...(temOpcoes(tipo) ? { opcoes: ['Opção 1', 'Opção 2'] } : {}),
      },
    ])

  const atualizar = (id: string, parcial: Partial<ItemFormulario>) =>
    setEstrutura((e) => e.map((i) => (i.id === id ? { ...i, ...parcial } : i)))

  const salvar = async () => {
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do formulário.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const payload = { nome: nome.trim(), ativo, estrutura }
      if (selecionado === 'novo') {
        const criado = await formulariosAnamneseService.create(payload)
        setSelecionado(criado.id)
        await registrarAuditoria('Formulários de Anamnese', 'Criar', payload.nome)
      } else if (selecionado) {
        await formulariosAnamneseService.update(selecionado, payload)
        await registrarAuditoria('Formulários de Anamnese', 'Editar', payload.nome)
      }
      toast({ title: 'Formulário salvo', description: `${payload.nome} salvo com sucesso.` })
      carregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o formulário.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!selecionado || selecionado === 'novo') return
    try {
      await formulariosAnamneseService.delete(selecionado)
      await registrarAuditoria('Formulários de Anamnese', 'Excluir', nome)
      toast({ title: 'Formulário excluído', description: `${nome} foi removido.` })
      setConfirmarExcluir(false)
      setSelecionado(null)
      carregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o formulário.',
        variant: 'destructive',
      })
    }
  }

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Formulários de Anamnese
          </h1>
          <p className="text-sm text-[#667C78]">
            Monte formulários com seções, textos, caixas de texto e painéis de escolha.
          </p>
        </div>
        <Button
          onClick={novo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo formulário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="rounded-2xl border-[#E3E7E5] h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1C2B29]">Formulários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-[#667C78]">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Carregando...
              </div>
            ) : lista.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#667C78]">Nenhum formulário cadastrado.</p>
            ) : (
              lista.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => abrir(f)}
                  className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors ${
                    selecionado === f.id
                      ? 'border-[#166A5A] bg-[#E2F0EB] text-[#166A5A]'
                      : 'border-[#E3E7E5] hover:bg-[#F7F6F3] text-[#1C2B29]'
                  }`}
                >
                  <span className="font-semibold block truncate">{f.nome}</span>
                  <span className="text-[11px] text-[#667C78]">
                    {(f.estrutura ?? []).length} itens • {f.ativo === false ? 'Inativo' : 'Ativo'}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selecionado === null ? (
          <div className="rounded-2xl border border-dashed border-[#E3E7E5] py-16 text-center text-xs text-[#667C78]">
            Selecione um formulário à esquerda ou crie um novo.
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5]">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="f-nome" className="text-xs font-semibold text-[#1C2B29]">
                      Nome do formulário *
                    </Label>
                    <Input
                      id="f-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="rounded-xl border-[#E3E7E5]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch id="f-ativo" checked={ativo} onCheckedChange={setAtivo} />
                    <Label htmlFor="f-ativo" className="text-xs font-semibold text-[#1C2B29]">
                      Ativo
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#1C2B29]">Adicionar item</Label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map((t) => {
                      const Icone = t.icone
                      return (
                        <Button
                          key={t.tipo}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => adicionar(t.tipo)}
                          className="rounded-xl text-xs gap-1.5 border-[#E3E7E5]"
                        >
                          <Icone className="h-3.5 w-3.5" />
                          {t.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {estrutura.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#667C78]">
                      Nenhum item. Use os botões acima para montar o formulário.
                    </p>
                  )}
                  {estrutura.map((it, idx) => (
                    <div
                      key={it.id}
                      className="rounded-xl border border-[#E3E7E5] bg-[#F7F6F3]/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          {rotuloTipo(it.tipo)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Mover para cima"
                            disabled={idx === 0}
                            onClick={() => setEstrutura((e) => mover(e, idx, -1))}
                            className="h-7 w-7"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Mover para baixo"
                            disabled={idx === estrutura.length - 1}
                            onClick={() => setEstrutura((e) => mover(e, idx, 1))}
                            className="h-7 w-7"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Remover item"
                            onClick={() => setEstrutura((e) => e.filter((x) => x.id !== it.id))}
                            className="h-7 w-7 text-[#667C78] hover:text-[#C0392B]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={it.rotulo}
                        onChange={(e) => atualizar(it.id, { rotulo: e.target.value })}
                        placeholder="Rótulo"
                        aria-label="Rótulo do item"
                        className="rounded-xl border-[#E3E7E5] bg-white"
                      />
                      {temOpcoes(it.tipo) && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-[#E2F0EB]">
                          {(it.opcoes ?? []).map((o, oi) => (
                            <div key={`${it.id}-${oi}`} className="flex gap-1.5">
                              <Input
                                value={o}
                                aria-label={`Opção ${oi + 1}`}
                                onChange={(e) =>
                                  atualizar(it.id, {
                                    opcoes: (it.opcoes ?? []).map((x, xi) =>
                                      xi === oi ? e.target.value : x,
                                    ),
                                  })
                                }
                                className="rounded-xl border-[#E3E7E5] bg-white h-8 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Remover opção"
                                onClick={() =>
                                  atualizar(it.id, {
                                    opcoes: (it.opcoes ?? []).filter((_, xi) => xi !== oi),
                                  })
                                }
                                className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              atualizar(it.id, { opcoes: [...(it.opcoes ?? []), ''] })
                            }
                            className="text-xs gap-1 text-[#166A5A]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar opção
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {selecionado !== 'novo' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmarExcluir(true)}
                      className="rounded-xl text-xs gap-1.5 text-[#C0392B] border-[#E3E7E5]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={salvar}
                    disabled={salvando}
                    className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#E3E7E5]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#1C2B29] flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#166A5A]" />
                  Pré-visualização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Previa itens={estrutura} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir formulário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={excluir}
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
