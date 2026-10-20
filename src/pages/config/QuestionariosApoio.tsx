import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { questionariosApoioService, registrarAuditoria } from '@/services/crm'
import type { PerguntaApoio, QuestionarioApoio, TipoPerguntaApoio } from '@/types/crm'

const APLICACOES: PerguntaApoio['aplicacao'][] = ['Ambos os sexos', 'Feminino', 'Masculino']
const TIPOS: TipoPerguntaApoio[] = ['Frequência', 'Intensidade', 'Sim ou Não', 'Texto']
const PESOS = [1, 2, 3, 4, 5]

function mover<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const c = [...arr]
  ;[c[i], c[j]] = [c[j], c[i]]
  return c
}

export default function QuestionariosApoio() {
  const { toast } = useToast()
  const [lista, setLista] = useState<QuestionarioApoio[]>([])
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [perguntas, setPerguntas] = useState<PerguntaApoio[]>([])
  const [salvando, setSalvando] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setLista(await questionariosApoioService.list('', 'nome'))
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os questionários.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const abrir = (q: QuestionarioApoio) => {
    setSelecionado(q.id)
    setNome(q.nome)
    setAtivo(q.ativo !== false)
    setPerguntas(Array.isArray(q.perguntas) ? q.perguntas.map((p) => ({ ...p })) : [])
  }

  const novo = () => {
    setSelecionado('novo')
    setNome('')
    setAtivo(true)
    setPerguntas([])
  }

  const adicionar = () =>
    setPerguntas((p) => [
      ...p,
      { id: crypto.randomUUID(), nome: '', tipo: 'Frequência', aplicacao: 'Ambos os sexos', peso: 1 },
    ])

  const atualizar = (id: string, parcial: Partial<PerguntaApoio>) =>
    setPerguntas((ps) => ps.map((p) => (p.id === id ? { ...p, ...parcial } : p)))

  const salvar = async () => {
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do questionário.',
        variant: 'destructive',
      })
      return
    }
    if (perguntas.some((p) => !p.nome.trim())) {
      toast({
        title: 'Pergunta sem nome',
        description: 'Preencha o nome de todas as perguntas ou remova as vazias.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      const payload = { nome: nome.trim(), ativo, perguntas }
      if (selecionado === 'novo') {
        const criado = await questionariosApoioService.create(payload)
        setSelecionado(criado.id)
        await registrarAuditoria('Questionários de Apoio', 'Criar', payload.nome)
      } else if (selecionado) {
        await questionariosApoioService.update(selecionado, payload)
        await registrarAuditoria('Questionários de Apoio', 'Editar', payload.nome)
      }
      toast({ title: 'Questionário salvo', description: `${payload.nome} salvo com sucesso.` })
      carregar()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o questionário.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!selecionado || selecionado === 'novo') return
    try {
      await questionariosApoioService.delete(selecionado)
      await registrarAuditoria('Questionários de Apoio', 'Excluir', nome)
      toast({ title: 'Questionário excluído', description: `${nome} foi removido.` })
      setConfirmarExcluir(false)
      setSelecionado(null)
      carregar()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o questionário.',
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
            Questionários de Apoio
          </h1>
          <p className="text-sm text-[#667C78]">
            Perguntas com aplicação por sexo, tipo de resposta e peso de relevância.
          </p>
        </div>
        <Button
          onClick={novo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo questionário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="rounded-2xl border-[#E3E7E5] h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1C2B29]">Questionários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-[#667C78]">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                Carregando...
              </div>
            ) : lista.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#667C78]">
                Nenhum questionário cadastrado.
              </p>
            ) : (
              lista.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => abrir(q)}
                  className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors ${
                    selecionado === q.id
                      ? 'border-[#166A5A] bg-[#E2F0EB] text-[#166A5A]'
                      : 'border-[#E3E7E5] hover:bg-[#F7F6F3] text-[#1C2B29]'
                  }`}
                >
                  <span className="font-semibold block truncate">{q.nome}</span>
                  <span className="text-[11px] text-[#667C78]">
                    {(q.perguntas ?? []).length} perguntas • {q.ativo === false ? 'Inativo' : 'Ativo'}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {selecionado === null ? (
          <div className="rounded-2xl border border-dashed border-[#E3E7E5] py-16 text-center text-xs text-[#667C78]">
            Selecione um questionário à esquerda ou crie um novo.
          </div>
        ) : (
          <Card className="rounded-2xl border-[#E3E7E5]">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="q-nome" className="text-xs font-semibold text-[#1C2B29]">
                    Nome do questionário *
                  </Label>
                  <Input
                    id="q-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch id="q-ativo" checked={ativo} onCheckedChange={setAtivo} />
                  <Label htmlFor="q-ativo" className="text-xs font-semibold text-[#1C2B29]">
                    Ativo
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#1C2B29]">Perguntas</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={adicionar}
                    className="rounded-xl text-xs gap-1.5 border-[#E3E7E5]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar pergunta
                  </Button>
                </div>

                {perguntas.length === 0 && (
                  <p className="py-6 text-center text-xs text-[#667C78]">
                    Nenhuma pergunta. Use o botão acima para adicionar.
                  </p>
                )}

                {perguntas.map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-[#E3E7E5] bg-[#F7F6F3]/60 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#667C78] w-6">{idx + 1}.</span>
                      <Input
                        value={p.nome}
                        onChange={(e) => atualizar(p.id, { nome: e.target.value })}
                        placeholder="Nome da pergunta"
                        aria-label={`Nome da pergunta ${idx + 1}`}
                        className="rounded-xl border-[#E3E7E5] bg-white"
                      />
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Mover para cima"
                          disabled={idx === 0}
                          onClick={() => setPerguntas((l) => mover(l, idx, -1))}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Mover para baixo"
                          disabled={idx === perguntas.length - 1}
                          onClick={() => setPerguntas((l) => mover(l, idx, 1))}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remover pergunta"
                          onClick={() => setPerguntas((l) => l.filter((x) => x.id !== p.id))}
                          className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:pl-8">
                      <Select
                        value={p.aplicacao}
                        onValueChange={(v) =>
                          atualizar(p.id, { aplicacao: v as PerguntaApoio['aplicacao'] })
                        }
                      >
                        <SelectTrigger
                          aria-label="Aplicação"
                          className="rounded-xl border-[#E3E7E5] bg-white h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APLICACOES.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={p.tipo}
                        onValueChange={(v) => atualizar(p.id, { tipo: v as TipoPerguntaApoio })}
                      >
                        <SelectTrigger
                          aria-label="Tipo de pergunta"
                          className="rounded-xl border-[#E3E7E5] bg-white h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(p.peso)}
                        onValueChange={(v) => atualizar(p.id, { peso: Number(v) })}
                      >
                        <SelectTrigger
                          aria-label="Peso"
                          className="rounded-xl border-[#E3E7E5] bg-white h-8 text-xs"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PESOS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Peso {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
        )}
      </div>

      <AlertDialog open={confirmarExcluir} onOpenChange={setConfirmarExcluir}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir questionário
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
