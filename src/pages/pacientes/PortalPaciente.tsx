import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  pacientesService,
  atendimentosService,
  examesService,
  mensagensService,
} from '@/services/crm'
import { Paciente, Atendimento, ExameLaboratorial, Mensagem } from '@/types/crm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sparkles,
  Calendar,
  FileText,
  Activity,
  MessageCircle,
  User,
  Clock,
  ArrowLeft,
  Eye,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Heart,
  Pill,
  FileCheck,
  ShieldCheck,
  Download,
} from 'lucide-react'

export default function PortalPaciente() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [pacienteExemplo, setPacienteExemplo] = useState<Paciente | null>(null)
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [exames, setExames] = useState<ExameLaboratorial[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarDadosEsboco = async () => {
      setLoading(true)
      try {
        // Tentar obter um paciente real para preencher a demonstração com dados reais
        const res = await pacientesService.list(1, 1, '', '-created')
        const pac = res.items[0] || null
        setPacienteExemplo(pac)

        if (pac) {
          const [atendRes, examesRes, msgRes] = await Promise.all([
            atendimentosService.list(`paciente_id = "${pac.id}"`, '-data_hora'),
            examesService.list(`paciente_id = "${pac.id}"`, '-data'),
            mensagensService.list(`paciente_id = "${pac.id}"`, '-created'),
          ])
          setAtendimentos(atendRes)
          setExames(examesRes)
          setMensagens(msgRes)
        }
      } catch (e) {
        console.warn('Carregamento de dados para portal do paciente:', e)
      } finally {
        setLoading(false)
      }
    }
    carregarDadosEsboco()
  }, [])

  const pacienteNome = pacienteExemplo?.nome || 'Maria Clara Albuquerque'
  const pacienteEmail = pacienteExemplo?.email || 'paciente@exemplo.com.br'
  const pacienteTelefone = pacienteExemplo?.telefone || '(11) 98765-4321'

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E2F0EB]/30 via-[#F7F6F3] to-[#F7F6F3] text-[#1C2B29]">
      {/* Banner de Demonstração / Esboço do Perfil Visitante / Paciente */}
      <div className="bg-[#166A5A] text-white px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#C9A227] text-[#1C2B29] font-bold text-[10px] hover:bg-[#C9A227]">
            ESBOÇO • VISÃO DO PACIENTE
          </Badge>
          <span className="text-[11px] opacity-90">
            Prévia conceitual do futuro Portal do Paciente (área do cliente final da Clínica Elias
            Mansur).
          </span>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-lg"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Voltar ao CRM da Clínica
            </Button>
          )}
        </div>
      </div>

      {/* Header Leve do Portal */}
      <header className="bg-white border-b border-[#E3E7E5] px-4 sm:px-8 py-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] text-white flex items-center justify-center shadow-md shadow-[#166A5A]/20">
              <Sparkles className="h-5 w-5 text-[#C9A227]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1C2B29] leading-tight">
                Clínica Elias Mansur
              </h1>
              <p className="text-[11px] text-[#667C78]">
                Portal de Saúde & Longevidade do Paciente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-[#1C2B29]">{pacienteNome}</p>
              <p className="text-[10px] text-[#667C78]">{pacienteEmail}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#E2F0EB] text-[#166A5A] font-bold text-xs flex items-center justify-center border border-[#166A5A]/20">
              {pacienteNome
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Portal */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Boas-vindas card */}
        <Card className="rounded-3xl border-[#E3E7E5] bg-gradient-to-r from-white via-white to-[#E2F0EB]/40 shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2F0EB] text-[#166A5A] text-xs font-semibold">
                  <Heart className="h-3.5 w-3.5 text-[#166A5A]" />
                  <span>Seu Espaço Clínico Pessoal</span>
                </div>
                <h2 className="text-2xl font-bold text-[#1C2B29]">
                  Olá, {pacienteNome.split(' ')[0]}!
                </h2>
                <p className="text-xs sm:text-sm text-[#667C78] max-w-xl leading-relaxed">
                  Acompanhe aqui o histórico de suas consultas, laudos e resultados de exames,
                  prescrições médicas e as mensagens de acompanhamento da sua equipe de saúde.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => navigate('/questionario')}
                  className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Preencher Pré-Cadastro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abas do Portal do Paciente */}
        <Tabs defaultValue="consultas" className="space-y-4">
          <TabsList className="bg-white border border-[#E3E7E5] p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger
              value="consultas"
              className="rounded-xl text-xs py-2 data-[state=active]:bg-[#166A5A] data-[state=active]:text-white font-medium"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Minhas Consultas
            </TabsTrigger>
            <TabsTrigger
              value="exames"
              className="rounded-xl text-xs py-2 data-[state=active]:bg-[#166A5A] data-[state=active]:text-white font-medium"
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Meus Exames
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="rounded-xl text-xs py-2 data-[state=active]:bg-[#166A5A] data-[state=active]:text-white font-medium"
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5" />
              Receitas & Documentos
            </TabsTrigger>
            <TabsTrigger
              value="mensagens"
              className="rounded-xl text-xs py-2 data-[state=active]:bg-[#166A5A] data-[state=active]:text-white font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger
              value="dados"
              className="rounded-xl text-xs py-2 data-[state=active]:bg-[#166A5A] data-[state=active]:text-white font-medium"
            >
              <User className="h-3.5 w-3.5 mr-1.5" />
              Meus Dados
            </TabsTrigger>
          </TabsList>

          {/* 1. MINHAS CONSULTAS */}
          <TabsContent value="consultas" className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#166A5A]" />
                  Histórico e Próximos Atendimentos
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Consulte suas consultas médicas, retornos e sessões agendadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {atendimentos.length > 0 ? (
                  atendimentos.map((at) => (
                    <div
                      key={at.id}
                      className="p-4 rounded-xl border border-[#E3E7E5] hover:border-[#166A5A]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1C2B29]">
                            {at.tipo.replace('_', ' ')}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              at.status === 'Confirmado' || at.status === 'Realizado'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                                : 'bg-gray-100 text-gray-700 text-[10px]'
                            }
                          >
                            {at.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-[#667C78] flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#166A5A]" />
                          {new Date(at.data_hora).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(at.data_hora).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {at.profissional ? ` • Médico: ${at.profissional}` : ''}
                        </p>
                      </div>

                      <Badge className="bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB] text-xs h-7 px-3">
                        Agendamento Confirmado
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-[#E3E7E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1C2B29]">
                            Consulta Médica Integrativa • Retorno
                          </span>
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                            Agendada
                          </Badge>
                        </div>
                        <p className="text-xs text-[#667C78] flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#166A5A]" />
                          Próxima terça-feira às 14:30 • Dr. Elias Mansur
                        </p>
                      </div>
                      <Badge className="bg-[#166A5A] text-white text-xs h-7 px-3">
                        Presencial na Clínica
                      </Badge>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E3E7E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40 opacity-80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1C2B29]">
                            Primeira Consulta e Anamnese Geral
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            Realizada
                          </Badge>
                        </div>
                        <p className="text-xs text-[#667C78]">
                          15/08/2026 às 10:00 • Protocolo de Longevidade e Exames Iniciais
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs text-[#166A5A] h-7">
                        Ver Resumo
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. MEUS EXAMES */}
          <TabsContent value="exames" className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#166A5A]" />
                  Resultados de Exames Laboratoriais
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Laudos cadastrados e valores comparativos de evolução clínica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {exames.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E3E7E5] text-[#667C78] bg-gray-50/50">
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3">Exame</th>
                          <th className="py-2.5 px-3">Resultado</th>
                          <th className="py-2.5 px-3">Referência</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E7E5]/70">
                        {exames.map((ex) => (
                          <tr key={ex.id} className="hover:bg-gray-50/50">
                            <td className="py-2.5 px-3 font-medium">
                              {new Date(ex.data).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#1C2B29]">
                              {ex.nome_exame}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#166A5A]">
                              {ex.resultado} {ex.unidade || ''}
                            </td>
                            <td className="py-2.5 px-3 text-[#667C78]">
                              {ex.valor_referencia || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  ex.status === 'Normal'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : ex.status === 'Alterado'
                                      ? 'bg-red-50 text-red-800 border-red-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                }
                              >
                                {ex.status || 'Normal'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-xl border border-[#E3E7E5] flex items-center justify-between bg-gray-50/50 text-xs">
                      <div>
                        <p className="font-semibold text-[#1C2B29]">Vitamina D (25-OH)</p>
                        <p className="text-[11px] text-[#667C78]">
                          Coleta: 12/09/2026 • Lab. Fleury
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#166A5A]">48.2 ng/mL</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                          Normal
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E3E7E5] flex items-center justify-between bg-gray-50/50 text-xs">
                      <div>
                        <p className="font-semibold text-[#1C2B29]">Testosterona Total</p>
                        <p className="text-[11px] text-[#667C78]">
                          Coleta: 12/09/2026 • Lab. Fleury
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#166A5A]">640 ng/dL</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                          Normal
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E3E7E5] flex items-center justify-between bg-gray-50/50 text-xs">
                      <div>
                        <p className="font-semibold text-[#1C2B29]">Insulina Basal</p>
                        <p className="text-[11px] text-[#667C78]">
                          Coleta: 12/09/2026 • Lab. Fleury
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#166A5A]">5.1 µUI/mL</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                          Excelente
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. RECEITAS E DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#166A5A]" />
                  Prescrições, Receitas e Atestados
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Acesse receitas de manipulados e orientações do seu protocolo clínico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-xl border border-[#E3E7E5] bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 text-[#166A5A] flex items-center justify-center">
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-[#1C2B29]">
                        Fórmula Antioxidante & Otimização Mitocondrial
                      </p>
                      <p className="text-[11px] text-[#667C78]">
                        Emitida em 15/09/2026 • Dr. Elias Mansur • Farmácia de Manipulação
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg gap-1 border-[#E3E7E5]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar PDF
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-[#E3E7E5] bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-[#1C2B29]">
                        Orientações Nutricionais e Suplementação Diária
                      </p>
                      <p className="text-[11px] text-[#667C78]">
                        Emitida em 15/09/2026 • Protocolo de Longevidade
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-lg gap-1 border-[#E3E7E5]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. MENSAGENS COM A CLÍNICA */}
          <TabsContent value="mensagens" className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#166A5A]" />
                  Comunicações e Lembretes da Clínica
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Mensagens enviadas pela recepção médica e pela régua de atendimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mensagens.length > 0 ? (
                  mensagens.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-[#E3E7E5] bg-gray-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={
                            m.canal === 'WhatsApp'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]'
                              : 'bg-blue-50 text-blue-800 border-blue-200 text-[10px]'
                          }
                        >
                          {m.canal} • {m.template || 'Mensagem'}
                        </Badge>
                        <span className="text-[10px] text-[#667C78]">
                          {new Date(m.created).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-[#1C2B29] whitespace-pre-wrap">{m.conteudo}</p>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-xl border border-[#E3E7E5] bg-emerald-50/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                          WhatsApp • Confirmação de Agendamento
                        </Badge>
                        <span className="text-[10px] text-[#667C78]">Hoje às 09:12</span>
                      </div>
                      <p className="text-xs text-[#1C2B29]">
                        Olá, {pacienteNome.split(' ')[0]}! Lembramos de sua consulta na Clínica
                        Elias Mansur agendada para terça-feira às 14:30. Pedimos chegar com 10
                        minutos de antecedência.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E3E7E5] bg-blue-50/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">
                          E-mail • Boas-vindas
                        </Badge>
                        <span className="text-[10px] text-[#667C78]">Semana passada</span>
                      </div>
                      <p className="text-xs text-[#1C2B29]">
                        Seu pré-cadastro foi recebido com sucesso pela equipe médica. Estamos
                        preparando seu prontuário individual.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. MEUS DADOS E QUESTIONÁRIO */}
          <TabsContent value="dados" className="space-y-4">
            <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
                  <User className="h-4 w-4 text-[#166A5A]" />
                  Dados Cadastrais & Questionário de Saúde
                </CardTitle>
                <CardDescription className="text-xs text-[#667C78]">
                  Informações fornecidas no pré-cadastro e na recepção da clínica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">Nome Completo:</span>
                    <span className="font-semibold text-[#1C2B29]">{pacienteNome}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">Telefone WhatsApp:</span>
                    <span className="font-semibold text-[#1C2B29]">{pacienteTelefone}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">E-mail:</span>
                    <span className="font-semibold text-[#1C2B29]">{pacienteEmail}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">Data de Nascimento:</span>
                    <span className="font-semibold text-[#1C2B29]">
                      {pacienteExemplo?.data_nascimento
                        ? new Date(pacienteExemplo.data_nascimento).toLocaleDateString('pt-BR')
                        : '14/05/1988'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">Sexo:</span>
                    <span className="font-semibold text-[#1C2B29]">
                      {pacienteExemplo?.sexo || 'Feminino'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-[#E3E7E5]">
                    <span className="text-[10px] text-[#667C78] block">Fase do Tratamento:</span>
                    <span className="font-semibold text-[#166A5A]">
                      {pacienteExemplo?.fase || 'Ativo'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-xs flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#166A5A]">
                      Precisa atualizar suas informações ou histórico de saúde?
                    </p>
                    <p className="text-[11px] text-[#667C78]">
                      Você pode preencher novamente o formulário de pré-cadastro para registrar
                      novos objetivos clínicos.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/questionario')}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-[#166A5A]/30 text-[#166A5A] hover:bg-[#E2F0EB]"
                  >
                    Abrir Formulário
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
