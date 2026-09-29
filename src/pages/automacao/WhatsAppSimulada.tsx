import React, { useEffect, useState } from 'react'
import { mensagensService, pacientesService } from '@/services/crm'
import { Mensagem, Paciente } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  MessageCircle,
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Clock,
  User,
  Phone,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function WhatsAppSimulada() {
  const { toast } = useToast()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Selected conversation
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mensagemTexto, setMensagemTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const fetchData = async () => {
    try {
      const [msgRes, pacRes] = await Promise.all([
        mensagensService.list(`canal = "WhatsApp"`, 'created'),
        pacientesService.list(1, 100),
      ])
      setMensagens(msgRes)
      setPacientes(pacRes.items)

      if (!selectedPacienteId && pacRes.items.length > 0) {
        setSelectedPacienteId(pacRes.items[0].id)
      }
    } catch (err) {
      console.error('Erro ao listar conversas WhatsApp:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Marcar como lida ao abrir
  useEffect(() => {
    if (!selectedPacienteId) return
    const naoLidas = mensagens.filter(
      (m) => m.paciente_id === selectedPacienteId && !m.lida && m.direcao === 'entrada',
    )
    if (naoLidas.length > 0) {
      naoLidas.forEach(async (m) => {
        try {
          await mensagensService.markAsRead(m.id)
        } catch {
          /* intentionally ignored */
        }
      })
    }
  }, [selectedPacienteId, mensagens])

  // Conversas agrupadas por paciente
  const conversasPorPaciente = pacientes
    .map((pac) => {
      const msgs = mensagens.filter((m) => m.paciente_id === pac.id)
      const lastMsg = msgs[msgs.length - 1]
      const naoLidas = msgs.filter((m) => !m.lida && m.direcao === 'entrada').length

      return {
        paciente: pac,
        ultimaMensagem: lastMsg,
        totalMensagens: msgs.length,
        naoLidas,
      }
    })
    .filter((c) => {
      if (!searchQuery) return true
      return (
        c.paciente.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.paciente.telefone.includes(searchQuery)
      )
    })
    .sort((a, b) => {
      const timeA = a.ultimaMensagem ? new Date(a.ultimaMensagem.created).getTime() : 0
      const timeB = b.ultimaMensagem ? new Date(b.ultimaMensagem.created).getTime() : 0
      return timeB - timeA
    })

  const selectedPaciente = pacientes.find((p) => p.id === selectedPacienteId)
  const msgsSelecionadas = mensagens.filter((m) => m.paciente_id === selectedPacienteId)

  // Enviar nova mensagem manual
  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mensagemTexto.trim() || !selectedPacienteId) return

    setEnviando(true)
    try {
      await mensagensService.create({
        paciente_id: selectedPacienteId,
        canal: 'WhatsApp',
        direcao: 'saida',
        template: 'Manual',
        conteudo: mensagemTexto.trim(),
        status: 'enviada',
        lida: true,
        agendada_para: new Date().toISOString(),
      })

      setMensagemTexto('')
      fetchData()
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível registrar mensagem.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C2B29]">
            Caixa de Entrada WhatsApp
          </h1>
          <Badge className="bg-[#E2F0EB] text-[#166A5A] text-[10px] font-bold">SIMULADA</Badge>
        </div>
        <p className="text-xs text-[#667C78]">
          Mensagens registradas no banco de dados e visíveis em tempo real.
        </p>
      </div>

      {/* Main WhatsApp Window Container */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-md overflow-hidden h-[calc(100vh-210px)] flex flex-col md:flex-row">
        {/* Painel Esquerdo: Lista de Conversas (320px) */}
        <div className="w-full md:w-80 border-r border-[#E3E7E5] flex flex-col bg-[#F7F6F3]/50">
          {/* Busca */}
          <div className="p-3 border-b border-[#E3E7E5] bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#667C78]" />
              <Input
                type="text"
                placeholder="Buscar conversa ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl border-[#E3E7E5] bg-[#F7F6F3]"
              />
            </div>
          </div>

          {/* Lista de Contatos */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E3E7E5]/60">
            {conversasPorPaciente.map(({ paciente, ultimaMensagem, naoLidas }) => {
              const isSelected = paciente.id === selectedPacienteId
              const initials = paciente.nome
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <div
                  key={paciente.id}
                  onClick={() => setSelectedPacienteId(paciente.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-white shadow-xs border-l-4 border-l-[#25D366]'
                      : 'hover:bg-white/60'
                  }`}
                >
                  <Avatar className="h-10 w-10 border border-[#E3E7E5]">
                    <AvatarFallback className="bg-[#166A5A]/10 text-[#166A5A] text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#1C2B29] truncate">{paciente.nome}</p>
                      {ultimaMensagem && (
                        <span className="text-[10px] text-[#667C78]">
                          {new Date(ultimaMensagem.created).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-[#667C78] truncate">
                        {ultimaMensagem ? ultimaMensagem.conteudo : 'Nenhuma mensagem'}
                      </p>
                      {naoLidas > 0 && (
                        <Badge className="bg-[#25D366] text-white text-[10px] h-4.5 px-1.5 rounded-full">
                          {naoLidas}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Painel Direito: Conversa Aberta */}
        <div className="flex-1 flex flex-col bg-[#EFEAE2]/30">
          {selectedPaciente ? (
            <>
              {/* Header Conversa */}
              <div className="h-14 px-4 bg-white border-b border-[#E3E7E5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-[#E3E7E5]">
                    <AvatarFallback className="bg-[#166A5A] text-white text-xs font-bold">
                      {selectedPaciente.nome.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-bold text-[#1C2B29]">{selectedPaciente.nome}</p>
                    <p className="text-[11px] text-[#667C78] flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {selectedPaciente.telefone}
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px]">
                  Fase: {selectedPaciente.fase.replace('_', ' ')}
                </Badge>
              </div>

              {/* Balões da Conversa */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgsSelecionadas.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#667C78]">
                    Nenhuma mensagem no histórico deste paciente.
                  </div>
                ) : (
                  msgsSelecionadas.map((msg) => {
                    const isSaida = msg.direcao === 'saida'

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSaida ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-xs space-y-1 ${
                            isSaida
                              ? 'bg-[#D9FDD3] text-[#111B21] rounded-br-xs'
                              : 'bg-white text-[#111B21] rounded-bl-xs border border-[#E3E7E5]'
                          }`}
                        >
                          {msg.template && msg.template !== 'Manual' && (
                            <p className="text-[10px] font-semibold text-[#166A5A] uppercase tracking-wider">
                              Automação: {msg.template}
                            </p>
                          )}
                          <p className="leading-relaxed whitespace-pre-line">{msg.conteudo}</p>
                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#667781] pt-0.5">
                            <span>
                              {new Date(msg.created).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isSaida && <CheckCheck className="h-3.5 w-3.5 text-[#53BDEB]" />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Campo para Envio Manual */}
              <div className="p-3 bg-white border-t border-[#E3E7E5]">
                <form onSubmit={handleEnviarMensagem} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[#667C78] hover:bg-gray-100 rounded-xl"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Digitar mensagem simulada para este paciente..."
                    value={mensagemTexto}
                    onChange={(e) => setMensagemTexto(e.target.value)}
                    className="flex-1 rounded-xl border-[#E3E7E5] text-xs h-10"
                  />
                  <Button
                    type="submit"
                    disabled={enviando || !mensagemTexto.trim()}
                    className="bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl h-10 px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#667C78]">
              Selecione uma conversa ao lado para visualizar o histórico
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
