import React, { useEffect, useState } from 'react'
import { pacotesService, pacientesService } from '@/services/crm'
import { Pacote, Paciente, TipoAplicacaoPacote } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Package as PackageIcon,
  Plus,
  Edit,
  Trash2,
  Syringe,
  TrendingDown,
  Users,
  Sparkles,
  Percent,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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

export default function PacotesConfig() {
  const { toast } = useToast()
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Novo/Editar Pacote
  const [modalAberto, setModalAberto] = useState(false)
  const [pacoteEditando, setPacoteEditando] = useState<Pacote | null>(null)
  const [pacoteExcluir, setPacoteExcluir] = useState<Pacote | null>(null)

  // Form Fields
  const [nome, setNome] = useState('')
  const [tipoAplicacao, setTipoAplicacao] = useState<TipoAplicacaoPacote>('APP')
  const [quantidadeAplicacoes, setQuantidadeAplicacoes] = useState(4)
  const [valorPorAplicacao, setValorPorAplicacao] = useState(380) // Preço unitário base
  const [valorTotal, setValorTotal] = useState(1280)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pacotesRes, pacRes] = await Promise.all([
        pacotesService.list('', 'quantidade_aplicacoes'),
        pacientesService.list(1, 100),
      ])
      setPacotes(pacotesRes)
      setPacientes(pacRes.items)
    } catch (err) {
      console.error('Erro ao listar pacotes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Update name and calculate savings automatically when changing x or tipo
  useEffect(() => {
    if (!pacoteEditando) {
      setNome(`Pacote ${quantidadeAplicacoes}x ${tipoAplicacao}`)
    }
  }, [quantidadeAplicacoes, tipoAplicacao, pacoteEditando])

  // Preço unitário sem desconto de referência
  const precoReferenciaUnitario = tipoAplicacao === 'APP' ? 380 : 450
  const totalSemDesconto = precoReferenciaUnitario * quantidadeAplicacoes
  const economiaPercent = Math.max(
    0,
    Math.round(((totalSemDesconto - valorTotal) / (totalSemDesconto || 1)) * 100),
  )

  const handleOpenNovo = () => {
    setPacoteEditando(null)
    setTipoAplicacao('APP')
    setQuantidadeAplicacoes(4)
    setValorPorAplicacao(320)
    setValorTotal(1280)
    setNome('Pacote 4x APP')
    setModalAberto(true)
  }

  const handleOpenEditar = (p: Pacote) => {
    setPacoteEditando(p)
    setNome(p.nome)
    setTipoAplicacao(p.tipo_aplicacao)
    setQuantidadeAplicacoes(p.quantidade_aplicacoes)
    setValorPorAplicacao(p.valor_por_aplicacao)
    setValorTotal(p.valor_total)
    setModalAberto(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || quantidadeAplicacoes < 1 || valorTotal <= 0) {
      toast({
        title: 'Campos inválidos',
        description: 'Preencha todos os campos do pacote.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Partial<Pacote> = {
        nome: nome.trim(),
        tipo_aplicacao: tipoAplicacao,
        quantidade_aplicacoes: Number(quantidadeAplicacoes),
        valor_total: Number(valorTotal),
        valor_por_aplicacao: Number(valorPorAplicacao),
        ativo: true,
      }

      if (pacoteEditando) {
        await pacotesService.update(pacoteEditando.id, payload)
        toast({ title: 'Pacote atualizado', description: `${nome} salvo com sucesso.` })
      } else {
        await pacotesService.create(payload)
        toast({ title: 'Pacote criado', description: `${nome} disponível para venda.` })
      }

      setModalAberto(false)
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o pacote.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pacoteExcluir) return
    try {
      await pacotesService.delete(pacoteExcluir.id)
      toast({ title: 'Pacote excluído', description: 'Removido com sucesso.' })
      setPacoteExcluir(null)
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o pacote.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Gestão de Pacientes & Pacotes
          </h1>
          <p className="text-sm text-[#667C78]">
            Planos de aplicações (APP e APP+AV) com quantidade de sessões "x" configurável e cálculo
            de economia.
          </p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Pacote
        </Button>
      </div>

      {/* Cards de Pacotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-[#667C78]">
            Carregando pacotes disponíveis...
          </div>
        ) : pacotes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#667C78]">
            Nenhum pacote cadastrado no sistema.
          </div>
        ) : (
          pacotes.map((pkg) => {
            const pacientesUsando = pacientes.filter((p) => p.pacote_atual_id === pkg.id).length
            const refUnit = pkg.tipo_aplicacao === 'APP' ? 380 : 450
            const refTotal = refUnit * pkg.quantidade_aplicacoes
            const desc = Math.max(0, Math.round(((refTotal - pkg.valor_total) / refTotal) * 100))

            return (
              <Card
                key={pkg.id}
                className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                          <Syringe className="h-4 w-4" />
                        </span>
                        <CardTitle className="text-base font-bold text-[#1C2B29]">
                          {pkg.nome}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {pkg.tipo_aplicacao === 'APP'
                          ? 'Via Parenteral (APP)'
                          : 'Parenteral + Venosa (APP+AV)'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditar(pkg)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#166A5A]"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPacoteExcluir(pkg)}
                        className="h-8 w-8 text-[#667C78] hover:text-[#C0392B]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="p-3 bg-[#F7F6F3] rounded-xl space-y-1.5 border border-[#E3E7E5]/70">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667C78]">Aplicações contratadas:</span>
                      <strong className="text-[#1C2B29] text-sm">
                        {pkg.quantidade_aplicacoes} sessões
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#667C78]">Valor por aplicação:</span>
                      <strong className="text-[#166A5A]">
                        {pkg.valor_por_aplicacao.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E3E7E5]">
                      <span className="text-[#667C78] font-semibold">Valor Total:</span>
                      <strong className="text-base text-[#1C2B29] font-bold">
                        {pkg.valor_total.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </strong>
                    </div>
                  </div>

                  {desc > 0 && (
                    <div className="flex items-center justify-between text-xs bg-[#E2F0EB]/60 px-3 py-1.5 rounded-lg text-[#166A5A] font-semibold">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Economia vs Unitário:
                      </span>
                      <span>~{desc}%</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-[#667C78] pt-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {pacientesUsando}{' '}
                      {pacientesUsando === 1 ? 'paciente ativo' : 'pacientes ativos'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Novo / Editar Pacote */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
                <Syringe className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#1C2B29]">
                  {pacoteEditando ? 'Editar Pacote' : 'Novo Pacote de Aplicações'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#667C78]">
                  Defina a quantidade de aplicações "x" e condições de desconto.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Tipo de Aplicação</Label>
              <Select
                value={tipoAplicacao}
                onValueChange={(v: TipoAplicacaoPacote) => {
                  setTipoAplicacao(v)
                  if (v === 'APP') {
                    setValorPorAplicacao(320)
                    setValorTotal(320 * quantidadeAplicacoes)
                  } else {
                    setValorPorAplicacao(420)
                    setValorTotal(420 * quantidadeAplicacoes)
                  }
                }}
              >
                <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APP">APP (Parenteral / Intramuscular)</SelectItem>
                  <SelectItem value="APP_AV">APP + AV (Parenteral + Venosa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Quantidade de Aplicações ({quantidadeAplicacoes}x)
                </Label>
                <span className="text-xs font-bold text-[#166A5A]">x = {quantidadeAplicacoes}</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={quantidadeAplicacoes}
                onChange={(e) => {
                  const x = Number(e.target.value)
                  setQuantidadeAplicacoes(x)
                  setValorTotal(x * valorPorAplicacao)
                }}
                className="w-full h-2 bg-[#E2F0EB] rounded-lg appearance-none cursor-pointer accent-[#166A5A]"
              />
              <div className="flex justify-between text-[10px] text-[#667C78]">
                <span>1x</span>
                <span>2x</span>
                <span>4x</span>
                <span>6x</span>
                <span>8x</span>
                <span>10x</span>
                <span>12x</span>
              </div>
            </div>

            {/* Barra de Progresso de Desconto por Quantidade */}
            <div className="p-3 bg-[#FBF3D9]/60 rounded-xl border border-[#C9A227]/30 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#1C2B29] flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-[#C9A227]" />
                  Desconto por Quantidade
                </span>
                <span className="font-bold text-[#A5831D]">
                  Economia: {economiaPercent}% vs unitário
                </span>
              </div>
              <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A227] rounded-full transition-all"
                  style={{ width: `${Math.min(economiaPercent * 3.5, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Valor por Aplicação (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={valorPorAplicacao}
                  onChange={(e) => {
                    const unit = Number(e.target.value)
                    setValorPorAplicacao(unit)
                    setValorTotal(unit * quantidadeAplicacoes)
                  }}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Valor Total do Pacote (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={valorTotal}
                  onChange={(e) => {
                    const total = Number(e.target.value)
                    setValorTotal(total)
                    if (quantidadeAplicacoes > 0) {
                      setValorPorAplicacao(Math.round(total / quantidadeAplicacoes))
                    }
                  }}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Nome do Pacote</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

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
                disabled={isSubmitting}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Pacote'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação Exclusão */}
      <AlertDialog open={!!pacoteExcluir} onOpenChange={(v) => !v && setPacoteExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#1C2B29]">
              Excluir Pacote
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#667C78]">
              Tem certeza que deseja remover o plano <strong>{pacoteExcluir?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
