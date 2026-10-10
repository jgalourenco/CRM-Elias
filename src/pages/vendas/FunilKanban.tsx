import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prospeccoesService, pacientesService, dispatchAutomacao } from '@/services/crm'
import { Prospeccao, Paciente, EtapaProspeccao, PrioridadeProspeccao } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, MessageSquare, Phone, Calendar, ArrowRight, Sparkles, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ColunaFunil {
  id: EtapaProspeccao | 'paciente_ativo'
  title: string
  color: string
}

const COLUNAS: ColunaFunil[] = [
  { id: 'primeiro_contato', title: '1. Primeiro Contato', color: 'border-t-emerald-500' },
  { id: 'proposta', title: '2. Proposta / Consulta', color: 'border-t-teal-500' },
  { id: 'comparacao', title: '3. Comparação Diagnóstico', color: 'border-t-cyan-500' },
  { id: 'recomendacao', title: '4. Recomendação', color: 'border-t-amber-500' },
  { id: 'fechamento', title: '5. Fechamento', color: 'border-t-[#C9A227]' },
  { id: 'paciente_ativo', title: '6. Paciente (1ª Consulta)', color: 'border-t-[#166A5A]' },
]

export default function FunilKanban() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [prospeccoes, setProspeccoes] = useState<Prospeccao[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<Prospeccao | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prospRes, pacRes] = await Promise.all([
        prospeccoesService.list('', '-updated'),
        pacientesService.list(1, 100),
      ])
      setProspeccoes(prospRes)
      setPacientes(pacRes.items)
    } catch (err) {
      console.error('Erro ao carregar kanban do funil:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDragStart = (p: Prospeccao) => {
    setDraggedItem(p)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (colunaId: string) => {
    if (!draggedItem) return

    try {
      const paciente = pacientes.find((p) => p.id === draggedItem.paciente_id)

      if (colunaId === 'paciente_ativo') {
        // Mudar para Paciente Ativo
        await prospeccoesService.update(draggedItem.id, { etapa: 'fechamento' })
        if (paciente) {
          await pacientesService.update(paciente.id, { fase: 'Ativo' })
          await dispatchAutomacao('Agradecimento pela consulta', paciente)
        }
        toast({
          title: 'Lead convertido!',
          description: `${paciente?.nome || 'Contato'} agora é um paciente ativo.`,
        })
      } else {
        const novaEtapa = colunaId as EtapaProspeccao
        await prospeccoesService.update(draggedItem.id, { etapa: novaEtapa })

        // Ao arrastar para Fechamento dispara boas-vindas imediatamente
        if (novaEtapa === 'fechamento' && paciente) {
          await dispatchAutomacao('Boas-vindas — primeiro contato', paciente)
          await pacientesService.update(paciente.id, { fase: 'Primeira_consulta' })
          toast({ title: 'Fechamento!', description: 'Automação de boas-vindas disparada.' })
        }
      }

      setDraggedItem(null)
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao mover card',
        description: 'Não foi possível atualizar a etapa.',
        variant: 'destructive',
      })
    }
  }

  const getPriorityBadge = (prio: PrioridadeProspeccao) => {
    switch (prio) {
      case 'alta':
        return <Badge className="bg-red-50 text-[#C0392B] border-red-200 text-[10px]">Alta</Badge>
      case 'media':
        return (
          <Badge className="bg-amber-50 text-[#D68910] border-amber-200 text-[10px]">Média</Badge>
        )
      default:
        return (
          <Badge className="bg-gray-50 text-[#667C78] border-gray-200 text-[10px]">Baixa</Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
            Funil de Vendas (Kanban)
          </h1>
          <p className="text-sm text-[#667C78]">
            Pipeline interativo com avanço por arraste e disparo dinâmico de automações da Clínica
            Elias Mansur.
          </p>
        </div>
        <Button
          onClick={() => navigate('/prospeccao')}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Prospecção
        </Button>
      </div>

      {/* Kanban Board Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {COLUNAS.map((col) => {
          // Cards for this column
          const colItems =
            col.id === 'paciente_ativo'
              ? prospeccoes.filter((p) => {
                  const pac = pacientes.find((x) => x.id === p.paciente_id)
                  return pac?.fase === 'Ativo' || pac?.fase === 'Em_acompanhamento'
                })
              : prospeccoes.filter((p) => p.etapa === col.id)

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
              className="flex-shrink-0 w-72 flex flex-col max-h-[calc(100vh-210px)] bg-[#F7F6F3]/90 rounded-2xl p-3 border border-[#E3E7E5]"
            >
              {/* Column Header */}
              <div
                className={`p-3 bg-white rounded-xl border border-[#E3E7E5] border-t-4 ${col.color} mb-3 flex items-center justify-between shadow-xs`}
              >
                <span className="text-xs font-bold text-[#1C2B29] truncate">{col.title}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-[#667C78]">
                  {colItems.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {colItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#667C78]/60 italic border-2 border-dashed border-[#E3E7E5] rounded-xl">
                    Arraste cards para esta coluna
                  </div>
                ) : (
                  colItems.map((item) => {
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
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item)}
                        onClick={() => pac && navigate(`/pacientes/${pac.id}`)}
                        className="p-3.5 bg-white rounded-xl border border-[#E3E7E5] shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {item.canal || 'WhatsApp'}
                          </Badge>
                          {getPriorityBadge(item.prioridade)}
                        </div>

                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 border border-[#E3E7E5]">
                            <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] text-[10px] font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#1C2B29] group-hover:text-[#166A5A] truncate">
                              {pac?.nome || 'Contato sem nome'}
                            </p>
                            <p className="text-[11px] text-[#667C78] truncate">
                              {pac?.telefone || 'Sem telefone'}
                            </p>
                          </div>
                        </div>

                        {item.observacoes && (
                          <p className="text-[11px] text-[#667C78] line-clamp-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                            {item.observacoes}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-[#667C78] pt-1 border-t border-[#E3E7E5]/50">
                          <span>Último contato:</span>
                          <span className="font-medium text-[#1C2B29]">
                            {new Date(item.updated).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
