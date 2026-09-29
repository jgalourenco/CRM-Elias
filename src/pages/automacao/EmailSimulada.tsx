import React, { useEffect, useState } from 'react'
import { mensagensService, pacientesService } from '@/services/crm'
import { Mensagem, Paciente } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MailOpen, Search, User, Clock, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function EmailSimulada() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)

  // Selected email
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    try {
      const [msgRes, pacRes] = await Promise.all([
        mensagensService.list(`canal = "Email"`, '-created'),
        pacientesService.list(1, 100),
      ])
      setMensagens(msgRes)
      setPacientes(pacRes.items)

      if (!selectedMsgId && msgRes.length > 0) {
        setSelectedMsgId(msgRes[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar e-mails simulados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Marcar como lido ao abrir
  useEffect(() => {
    if (!selectedMsgId) return
    const msg = mensagens.find((m) => m.id === selectedMsgId)
    if (msg && !msg.lida) {
      mensagensService.markAsRead(msg.id).then(() => {
        setMensagens((prev) => prev.map((m) => (m.id === selectedMsgId ? { ...m, lida: true } : m)))
      })
    }
  }, [selectedMsgId])

  const filtered = mensagens.filter((m) => {
    const pac = pacientes.find((p) => p.id === m.paciente_id)
    return (
      !search ||
      (pac && pac.nome.toLowerCase().includes(search.toLowerCase())) ||
      m.conteudo.toLowerCase().includes(search.toLowerCase()) ||
      (m.template && m.template.toLowerCase().includes(search.toLowerCase()))
    )
  })

  const selectedMsg = mensagens.find((m) => m.id === selectedMsgId)
  const selectedPac = pacientes.find((p) => p.id === selectedMsg?.paciente_id)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#2E7FA3]/20 text-[#2E7FA3] flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C2B29]">
            Caixa de Entrada de E-mail
          </h1>
          <Badge className="bg-[#E2F0EB] text-[#166A5A] text-[10px] font-bold">SIMULADA</Badge>
        </div>
        <p className="text-xs text-[#667C78]">
          Visualizador de e-mails transacionais e réguas de nutrição gravadas no sistema.
        </p>
      </div>

      {/* Main Container */}
      <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-md overflow-hidden h-[calc(100vh-210px)] flex flex-col md:flex-row">
        {/* Painel Esquerdo: Lista de E-mails (340px) */}
        <div className="w-full md:w-96 border-r border-[#E3E7E5] flex flex-col bg-[#F7F6F3]/50">
          <div className="p-3 border-b border-[#E3E7E5] bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#667C78]" />
              <Input
                type="text"
                placeholder="Buscar assunto, paciente ou corpo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl border-[#E3E7E5] bg-[#F7F6F3]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E3E7E5]/70">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#667C78]">
                Nenhum e-mail simulado encontrado.
              </div>
            ) : (
              filtered.map((msg) => {
                const pac = pacientes.find((p) => p.id === msg.paciente_id)
                const isSelected = msg.id === selectedMsgId

                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMsgId(msg.id)}
                    className={`p-3.5 cursor-pointer transition-colors space-y-1 ${
                      isSelected
                        ? 'bg-white shadow-xs border-l-4 border-l-[#2E7FA3]'
                        : !msg.lida
                          ? 'bg-[#E2F0EB]/30 font-semibold hover:bg-white'
                          : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1C2B29] truncate">
                        {pac?.nome || 'Contato Seleta'}
                      </span>
                      <span className="text-[10px] text-[#667C78]">
                        {new Date(msg.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-[#166A5A] truncate">
                      {msg.template || 'Notificação Clínica Seleta'}
                    </p>

                    <p className="text-[11px] text-[#667C78] line-clamp-2 leading-relaxed">
                      {msg.conteudo}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Conteúdo do E-mail */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">
          {selectedMsg ? (
            <div className="p-6 space-y-6">
              {/* Header do E-mail */}
              <div className="border-b border-[#E3E7E5] pb-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-lg font-bold text-[#1C2B29]">
                    {selectedMsg.template || 'Comunicação Oficial — Clínica Seleta'}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    Status: {selectedMsg.status}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-[#667C78]">
                  <p>
                    <strong className="text-[#1C2B29]">De:</strong> Clínica Seleta
                    &lt;contato@seletaclinica.com.br&gt;
                  </p>
                  <p>
                    <strong className="text-[#1C2B29]">Para:</strong> {selectedPac?.nome} &lt;
                    {selectedPac?.email || 'email@paciente.com.br'}&gt;
                  </p>
                  <p className="text-[11px]">
                    <strong className="text-[#1C2B29]">Data de envio:</strong>{' '}
                    {new Date(selectedMsg.created).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Corpo Formatado do E-mail */}
              <div className="bg-[#F7F6F3] p-6 rounded-2xl border border-[#E3E7E5] space-y-4">
                <div className="border-b border-[#E3E7E5] pb-3 flex items-center justify-between">
                  <span className="font-bold text-sm text-[#166A5A] tracking-tight">
                    CLÍNICA SELETA
                  </span>
                  <span className="text-[11px] text-[#A5831D] font-medium">
                    Medicina Integrativa
                  </span>
                </div>

                <div className="text-sm text-[#1C2B29] leading-relaxed whitespace-pre-line py-2">
                  {selectedMsg.conteudo}
                </div>

                <div className="border-t border-[#E3E7E5] pt-3 text-[11px] text-[#667C78]">
                  Equipe Clínica Seleta • Cuidando da sua longevidade com respeito e ciência.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#667C78]">
              Selecione um e-mail ao lado para ler o conteúdo.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
