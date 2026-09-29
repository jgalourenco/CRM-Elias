import React, { useEffect, useState } from 'react'
import { automacoesService, pacientesService, dispatchAutomacao } from '@/services/crm'
import { Automacao, Paciente, FaseRoadmapAutomacao } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Workflow,
  Sparkles,
  Play,
  MessageCircle,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FaseInfo {
  id: FaseRoadmapAutomacao
  title: string
  badge: string
  desc: string
}

const FASES_ROADMAP: FaseInfo[] = [
  {
    id: 'Prospeccao',
    title: 'Fase 1 — Prospecção',
    badge: 'bg-emerald-100 text-emerald-800',
    desc: 'Boas-vindas, follow-up e reengajamento de novos contatos',
  },
  {
    id: 'Primeira_consulta',
    title: 'Fase 2 — Pós-1ª Consulta',
    badge: 'bg-teal-100 text-teal-800',
    desc: 'Agradecimento e coleta de feedback após a consulta inicial',
  },
  {
    id: 'Retorno',
    title: 'Fase 3 — Retorno',
    badge: 'bg-blue-100 text-blue-800',
    desc: 'Lembrete e confirmação de presença em consultas de acompanhamento',
  },
  {
    id: 'Manipulado',
    title: 'Fase 4 — Manipulado',
    badge: 'bg-indigo-100 text-indigo-800',
    desc: 'Avisos de manipulação pronta na farmácia e cobrança de retirada',
  },
  {
    id: 'Aplicacao_APP',
    title: 'Fase 5.1 — Aplicação APP',
    badge: 'bg-purple-100 text-purple-800',
    desc: 'Lembretes e confirmação de procedimento injetável intramuscular',
  },
  {
    id: 'Aplicacao_APP_AV',
    title: 'Fase 5.2 — Aplicação APP+AV',
    badge: 'bg-fuchsia-100 text-fuchsia-800',
    desc: 'Lembretes de infusão venosa e protocolos combinados',
  },
  {
    id: 'D1',
    title: 'Fase 6 — Lembrete D-1',
    badge: 'bg-amber-100 text-amber-800',
    desc: 'Confirmação antecipada 24h antes de qualquer atendimento agendado',
  },
  {
    id: 'NF',
    title: 'Fase 7 — Nota Fiscal',
    badge: 'bg-cyan-100 text-cyan-800',
    desc: 'Envio automático de comprovante e nota após confirmação de pagamento',
  },
  {
    id: 'No_show',
    title: 'Fase 8 — No-Show (Falta)',
    badge: 'bg-red-100 text-red-800',
    desc: 'Notificação empática de ausência e incentivo de reagendamento',
  },
  {
    id: 'LTV',
    title: 'Fase 9 — LTV (Fidelidade)',
    badge: 'bg-[#FBF3D9] text-[#A5831D]',
    desc: 'Programa de continuidade e pesquisa 30 dias após término do pacote',
  },
]

export default function ReguaAtendimento() {
  const { toast } = useToast()
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [executingId, setExecutingId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [autRes, pacRes] = await Promise.all([
        automacoesService.list('', 'fase_roadmap'),
        pacientesService.list(1, 100),
      ])
      setAutomacoes(autRes)
      setPacientes(pacRes.items)
    } catch (err) {
      console.error('Erro ao listar automações:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Toggle active
  const handleToggleAtivo = async (aut: Automacao) => {
    try {
      const updated = await automacoesService.update(aut.id, {
        ativo: !aut.ativo,
      })
      setAutomacoes((prev) => prev.map((a) => (a.id === aut.id ? updated : a)))
      toast({
        title: updated.ativo ? 'Automação ativada' : 'Automação pausada',
        description: `Disparos automáticos para "${aut.nome}" foram ${updated.ativo ? 'ativados' : 'pausados'}.`,
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
    }
  }

  // Executar agora (Simulador de Régua)
  const handleExecutarAgora = async (aut: Automacao) => {
    setExecutingId(aut.id)
    try {
      // Encontrar pacientes elegíveis para esta fase
      let elegiveis = pacientes.filter((p) => {
        if (aut.fase_roadmap === 'Prospeccao') return p.fase === 'Prospeccao'
        if (aut.fase_roadmap === 'Primeira_consulta') return p.fase === 'Primeira_consulta'
        if (aut.fase_roadmap === 'Retorno') return p.fase === 'Em_acompanhamento'
        if (aut.fase_roadmap === 'LTV') return p.aplicacoes_restantes === 0
        return true
      })

      if (elegiveis.length === 0) {
        elegiveis = pacientes.slice(0, 2)
      }

      // Executar disparo simulado para até 3 pacientes
      const disparados = elegiveis.slice(0, 3)
      for (const pac of disparados) {
        await dispatchAutomacao(aut.nome, pac, {
          hora: '14:30',
          data: new Date().toLocaleDateString('pt-BR'),
        })
      }

      toast({
        title: 'Régua executada com sucesso!',
        description: `${disparados.length} mensagens simuladas geradas e gravadas no histórico dos pacientes.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao executar',
        description: 'Não foi possível disparar.',
        variant: 'destructive',
      })
    } finally {
      setExecutingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1C2B29] tracking-tight">
              Régua de Atendimento
            </h1>
            <Badge className="bg-[#E2F0EB] text-[#166A5A] text-xs font-semibold">
              19 AUTOMAÇÕES
            </Badge>
          </div>
          <p className="text-sm text-[#667C78]">
            Fluxo inteligente de comunicação multicanal (WhatsApp e E-mail simulados) da Clínica
            Seleta.
          </p>
        </div>

        <Button
          onClick={() => {
            if (automacoes.length > 0) handleExecutarAgora(automacoes[0])
          }}
          className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-[#C9A227]" />
          Disparar Teste Geral
        </Button>
      </div>

      {/* Grade por 9 Fases */}
      <div className="space-y-8">
        {FASES_ROADMAP.map((fase) => {
          const automacoesDaFase = automacoes.filter((a) => a.fase_roadmap === fase.id)
          if (automacoesDaFase.length === 0) return null

          return (
            <div key={fase.id} className="space-y-3">
              {/* Fase Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E7E5] pb-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-[#1C2B29]">{fase.title}</h2>
                  <Badge className={`text-xs ${fase.badge}`}>
                    {automacoesDaFase.length} fluxos
                  </Badge>
                </div>
                <p className="text-xs text-[#667C78]">{fase.desc}</p>
              </div>

              {/* Cards da Fase */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {automacoesDaFase.map((aut) => {
                  const isWA = aut.canal === 'WhatsApp'
                  const isRunning = executingId === aut.id

                  return (
                    <Card
                      key={aut.id}
                      className={`rounded-2xl border bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                        aut.ativo !== false ? 'border-[#E3E7E5]' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <CardHeader className="p-4 pb-2 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-[#1C2B29] leading-snug">
                              {aut.nome}
                            </CardTitle>
                            <Badge
                              className={`text-[10px] gap-1 ${
                                isWA
                                  ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30'
                                  : 'bg-[#2E7FA3]/10 text-[#2E7FA3] border border-[#2E7FA3]/30'
                              }`}
                            >
                              {isWA ? (
                                <MessageCircle className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {aut.canal}
                            </Badge>
                          </div>

                          {/* Toggle Ativo */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#667C78]">
                              {aut.ativo !== false ? 'Ativo' : 'Pausado'}
                            </span>
                            <Switch
                              checked={aut.ativo !== false}
                              onCheckedChange={() => handleToggleAtivo(aut)}
                            />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                        {/* Gatilho e Atraso */}
                        <div className="text-xs space-y-1 bg-[#F7F6F3] p-2.5 rounded-xl border border-[#E3E7E5]/70">
                          <p className="text-[#667C78]">
                            <strong className="text-[#1C2B29]">Gatilho:</strong> {aut.gatilho}
                          </p>
                          <p className="text-[#667C78] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <strong>Timing:</strong>{' '}
                            {aut.atraso_minutos === 0
                              ? 'Imediato'
                              : aut.atraso_minutos! < 0
                                ? `${Math.abs(aut.atraso_minutos! / 1440)} dia(s) antes`
                                : `${aut.atraso_minutos! / 1440} dia(s) após`}
                          </p>
                        </div>

                        {/* Template Mensagem */}
                        <div className="text-xs text-[#1C2B29] bg-white p-2.5 rounded-xl border border-[#E3E7E5] italic leading-relaxed">
                          "{aut.template}"
                        </div>

                        {/* Botão Executar Agora */}
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExecutarAgora(aut)}
                            disabled={isRunning}
                            className="w-full text-xs font-semibold gap-1.5 rounded-xl border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB]"
                          >
                            <Play className="h-3 w-3" />
                            {isRunning ? 'Disparando...' : 'Executar agora'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
