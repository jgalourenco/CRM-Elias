import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prospeccoesService, pacientesService, dispatchAutomacao } from '@/services/crm'
import {
  Prospeccao,
  Paciente,
  CanalProspeccao,
  PrioridadeProspeccao,
  EtapaProspeccao,
} from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  UserPlus,
  Search,
  Plus,
  Calendar,
  Eye,
  ChevronRight,
  Phone,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ProspeccaoList() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [prospeccoes, setProspeccoes] = useState<Prospeccao[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [etapaFilter, setEtapaFilter] = useState<string>('todos')

  // Modal Nova Prospeccao
  const [modalNova, setModalNova] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [canal, setCanal] = useState<CanalProspeccao>('WhatsApp')
  const [prioridade, setPrioridade] = useState<PrioridadeProspeccao>('media')
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prospRes, pacRes] = await Promise.all([
        prospeccoesService.list('', '-created'),
        pacientesService.list(1, 100),
      ])
      setProspeccoes(prospRes)
      setPacientes(pacRes.items)
    } catch (err) {
      console.error('Erro ao carregar prospecções:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter items
  const filtered = prospeccoes.filter((item) => {
    const pac = pacientes.find((p) => p.id === item.paciente_id)
    const matchSearch =
      !search ||
      (pac && pac.nome.toLowerCase().includes(search.toLowerCase())) ||
      (pac && pac.telefone.includes(search))

    const matchEtapa = etapaFilter === 'todos' || item.etapa === etapaFilter

    return matchSearch && matchEtapa
  })

  // Criar nova prospecção (cria paciente na fase Prospeccao + entrada no funil + dispara boas-vindas)
  const handleCriarProspeccao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe nome e telefone.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Criar paciente
      const novoPac = await pacientesService.create({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        fase: 'Prospeccao',
        observacoes: observacoes.trim() || undefined,
      })

      // 2. Criar prospecção
      await prospeccoesService.create({
        paciente_id: novoPac.id,
        canal,
        prioridade,
        etapa: 'primeiro_contato',
        observacoes: observacoes.trim() || undefined,
      })

      // 3. Disparar automação de boas-vindas
      await dispatchAutomacao('Boas-vindas — primeiro contato', novoPac)

      toast({
        title: 'Prospecção criada com sucesso!',
        description: 'Automação de boas-vindas enviada para o WhatsApp do contato.',
      })

      setModalNova(false)
      setNome('')
      setTelefone('')
      setEmail('')
      setObservacoes('')
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao criar prospecção',
        description: 'Não foi possível cadastrar.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Avançar etapa
  const handleAvançar = async (item: Prospeccao) => {
    const etapas: EtapaProspeccao[] = [
      'primeiro_contato',
      'proposta',
      'comparacao',
      'recomendacao',
      'fechamento',
    ]
    const idx = etapas.indexOf(item.etapa)
    if (idx < etapas.length - 1) {
      const nextEtapa = etapas[idx + 1]
      await prospeccoesService.update(item.id, { etapa: nextEtapa })
      const pac = pacientes.find((p) => p.id === item.paciente_id)
      if (nextEtapa === 'fechamento' && pac) {
        await dispatchAutomacao('Boas-vindas — primeiro contato', pac)
      }
      toast({
        title: 'Etapa avançada',
        description: `Lead avançou para ${nextEtapa.replace('_', ' ')}.`,
      })
      fetchData()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Gestão de Prospecção
          </h1>
          <p className="text-sm text-[#667C78]">
            Lista de contatos em qualificação e nutrição inicial da Clínica Elias Mansur.
          </p>
        </div>
        <Button
          onClick={() => setModalNova(true)}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Prospecção
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
            <Input
              type="text"
              placeholder="Buscar prospecção por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-[#E3E7E5] text-xs h-10"
            />
          </div>

          <div>
            <Select value={etapaFilter} onValueChange={setEtapaFilter}>
              <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs h-10">
                <SelectValue placeholder="Todas as etapas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as etapas</SelectItem>
                <SelectItem value="primeiro_contato">1. Primeiro Contato</SelectItem>
                <SelectItem value="proposta">2. Proposta / Consulta</SelectItem>
                <SelectItem value="comparacao">3. Comparação Diagnóstico</SelectItem>
                <SelectItem value="recomendacao">4. Recomendação</SelectItem>
                <SelectItem value="fechamento">5. Fechamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#667C78]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#166A5A] border-t-transparent" />
              Carregando lista de prospecção...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-[#E3E7E5] bg-white p-12 text-center text-xs text-[#667C78]">
            Nenhuma prospecção encontrada para os filtros aplicados.
          </Card>
        ) : (
          filtered.map((item) => {
            const pac = pacientes.find((p) => p.id === item.paciente_id)
            const initials = pac?.nome
              ? pac.nome
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              : 'CS'

            return (
              <Card
                key={item.id}
                className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs hover:shadow-md transition-shadow p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Lead Info */}
                  <div className="flex items-start sm:items-center gap-4">
                    <Avatar className="h-11 w-11 border border-[#E3E7E5]">
                      <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base text-[#1C2B29]">
                          {pac?.nome || 'Lead sem nome'}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize font-medium">
                          {item.canal || 'WhatsApp'}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            item.prioridade === 'alta'
                              ? 'bg-red-50 text-[#C0392B]'
                              : item.prioridade === 'media'
                                ? 'bg-amber-50 text-[#D68910]'
                                : 'bg-gray-50 text-[#667C78]'
                          }`}
                        >
                          Prioridade {item.prioridade}
                        </Badge>
                        <Badge className="bg-[#E2F0EB] text-[#166A5A] text-xs">
                          Etapa: {item.etapa.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#667C78] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {pac?.telefone}
                        </span>
                        <span>
                          Última interação:{' '}
                          {new Date(item.updated).toLocaleDateString('pt-BR', {
                            dateStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAvançar(item)}
                      disabled={item.etapa === 'fechamento'}
                      className="rounded-xl text-xs font-semibold gap-1"
                    >
                      <span>Avançar Etapa</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => pac && navigate(`/pacientes/${pac.id}`)}
                      className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Ficha
                    </Button>
                  </div>
                </div>

                {item.observacoes && (
                  <div className="mt-3 pt-3 border-t border-[#E3E7E5]/60 text-xs text-[#667C78]">
                    <strong>Observações:</strong> {item.observacoes}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Nova Prospeccao */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29]">Nova Prospecção</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarProspeccao} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Nome do Lead / Paciente <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Ex: João Pedro Almeida"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Telefone (WhatsApp) <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">E-mail</Label>
              <Input
                type="email"
                placeholder="lead@exemplo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Canal de Origem</Label>
                <Select value={canal} onValueChange={(v: CanalProspeccao) => setCanal(v)}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Telefone">Telefone</SelectItem>
                    <SelectItem value="Email">E-mail</SelectItem>
                    <SelectItem value="Indicacao">Indicação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Prioridade</Label>
                <Select
                  value={prioridade}
                  onValueChange={(v: PrioridadeProspeccao) => setPrioridade(v)}
                >
                  <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Observações Iniciais</Label>
              <Textarea
                rows={3}
                placeholder="Interesse em modulação hormonal, imunidade, indicação de amigo..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="rounded-xl border-[#E3E7E5]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNova(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl"
              >
                {isSubmitting ? 'Cadastrando...' : 'Criar Prospecção & Boas-Vindas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
