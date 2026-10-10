import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Calendar,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Paciente, Sexo } from '@/types/crm'

export default function PreCadastroPublico() {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [sexo, setSexo] = useState<Sexo>('Outro')
  const [comoConheceu, setComoConheceu] = useState('')
  const [queixaPrincipal, setQueixaPrincipal] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erroMsg, setErroMsg] = useState('')

  const formatTelefone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 2) return raw
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroMsg('')

    if (!nome.trim() || !telefone.trim()) {
      setErroMsg('Por favor, preencha ao menos seu nome completo e telefone WhatsApp.')
      return
    }

    setLoading(true)
    try {
      // 1. Criar paciente com fase 'Prospeccao'
      const pacientePayload: Partial<Paciente> = {
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        data_nascimento: dataNascimento ? new Date(dataNascimento).toISOString() : undefined,
        sexo: sexo || 'Outro',
        fase: 'Prospeccao',
        anamnese: {
          como_chegou: comoConheceu,
          objetivos: queixaPrincipal,
        },
        observacoes: observacoes.trim()
          ? `[Pré-cadastro Web] ${observacoes.trim()}`
          : `[Pré-cadastro Web] Queixa: ${queixaPrincipal || 'Não especificada'} • Como conheceu: ${comoConheceu || 'Não informado'}`,
      }

      const pacienteCriado = await pb.collection('pacientes').create<Paciente>(pacientePayload)

      // 2. Criar a prospecção no funil (etapa primeiro_contato)
      try {
        let canalProspeccao: 'WhatsApp' | 'Instagram' | 'Indicacao' | 'Email' | 'Telefone' =
          'WhatsApp'
        if (
          comoConheceu.toLowerCase().includes('instagram') ||
          comoConheceu.toLowerCase().includes('rede social')
        ) {
          canalProspeccao = 'Instagram'
        } else if (
          comoConheceu.toLowerCase().includes('indicação') ||
          comoConheceu.toLowerCase().includes('amigo')
        ) {
          canalProspeccao = 'Indicacao'
        }

        await pb.collection('prospeccoes').create({
          paciente_id: pacienteCriado.id,
          canal: canalProspeccao,
          prioridade: 'alta',
          etapa: 'primeiro_contato',
          observacoes: `Paciente pré-cadastrado via questionário online. Queixa/Objetivo: "${queixaPrincipal || 'Geral'}". Como conheceu: "${comoConheceu || 'Site/Link'}"`,
        })
      } catch (errPros) {
        console.warn('Aviso: prospecção vinculada não pôde ser criada automaticamente:', errPros)
      }

      setSucesso(true)
    } catch (err: unknown) {
      console.error('Erro ao enviar pré-cadastro:', err)
      setErroMsg(
        'Ocorreu um erro ao registrar suas informações. Por favor, tente novamente ou fale conosco via WhatsApp.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E2F0EB]/50 via-[#F7F6F3] to-[#F7F6F3] flex items-center justify-center p-4">
        <Card className="max-w-md w-full rounded-3xl border-[#E3E7E5] shadow-xl bg-white p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[#166A5A] to-[#0F5145] text-white flex items-center justify-center shadow-lg shadow-[#166A5A]/25">
            <CheckCircle2 className="h-8 w-8 text-[#C9A227]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1C2B29]">Pré-Cadastro Recebido!</h1>
            <p className="text-sm text-[#667C78] leading-relaxed">
              Obrigado, <strong className="text-[#1C2B29]">{nome}</strong>! Suas informações foram
              enviadas com sucesso para a equipe médica da{' '}
              <strong className="text-[#166A5A]">Clínica Elias Mansur</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#E2F0EB]/50 border border-[#166A5A]/20 text-xs text-[#166A5A] leading-relaxed">
            Nossa equipe de recepção entrará em contato em breve pelo seu telefone{' '}
            <strong>{telefone}</strong> para confirmar seu agendamento e esclarecer eventuais
            dúvidas.
          </div>

          <Button
            onClick={() => {
              setNome('')
              setTelefone('')
              setEmail('')
              setDataNascimento('')
              setQueixaPrincipal('')
              setComoConheceu('')
              setObservacoes('')
              setSucesso(false)
            }}
            variant="outline"
            className="rounded-xl border-[#E3E7E5] text-xs font-semibold"
          >
            Preencher outro questionário
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E2F0EB]/40 via-[#F7F6F3] to-[#F7F6F3] py-8 sm:py-12 px-4 flex flex-col items-center">
      {/* Brand Header */}
      <div className="max-w-xl w-full text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E3E7E5] shadow-xs text-xs font-semibold text-[#166A5A]">
          <Sparkles className="h-4 w-4 text-[#C9A227]" />
          <span>Clínica Elias Mansur • Medicina & Longevidade</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C2B29] tracking-tight">
          Questionário de Pré-Cadastro
        </h1>
        <p className="text-xs sm:text-sm text-[#667C78] max-w-md mx-auto">
          Preencha seus dados com antecedência para agilizar sua recepção e personalizar sua
          primeira experiência clínica.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="max-w-xl w-full rounded-3xl border-[#E3E7E5] bg-white shadow-xl shadow-black/5 overflow-hidden">
        <CardHeader className="p-6 pb-2 border-b border-[#E3E7E5]/70 bg-[#F7F6F3]/40">
          <CardTitle className="text-base font-bold text-[#1C2B29] flex items-center gap-2">
            <User className="h-4 w-4 text-[#166A5A]" />
            Dados Básicos & Motivo do Atendimento
          </CardTitle>
          <CardDescription className="text-xs text-[#667C78]">
            Leva menos de 2 minutos. Suas informações são confidenciais e protegidas.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-5">
          {erroMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {erroMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome Completo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Maria da Silva Santos"
                className="rounded-xl border-[#E3E7E5] h-10 text-sm"
              />
            </div>

            {/* Telefone e E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  WhatsApp / Celular <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    required
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="pl-9 rounded-xl border-[#E3E7E5] h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="pl-9 rounded-xl border-[#E3E7E5] h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Data de Nascimento e Sexo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="rounded-xl border-[#E3E7E5] h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">Sexo</Label>
                <Select value={sexo} onValueChange={(v: Sexo) => setSexo(v)}>
                  <SelectTrigger className="rounded-xl border-[#E3E7E5] h-10 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Prefiro não informar / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Como conheceu a clínica */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Como conheceu a clínica?
              </Label>
              <Select value={comoConheceu} onValueChange={setComoConheceu}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5] h-10 text-sm">
                  <SelectValue placeholder="Selecione uma opção..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instagram / Redes Sociais">
                    Instagram / Redes Sociais
                  </SelectItem>
                  <SelectItem value="Indicação de amigo/familiar">
                    Indicação de amigo ou familiar
                  </SelectItem>
                  <SelectItem value="Indicação médica / profissional">
                    Indicação de outro médico/profissional
                  </SelectItem>
                  <SelectItem value="Busca no Google / Site">Busca no Google / Site</SelectItem>
                  <SelectItem value="Outro">Outro canal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Queixa Principal / Objetivo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Queixa principal ou objetivo do tratamento
              </Label>
              <Textarea
                rows={3}
                value={queixaPrincipal}
                onChange={(e) => setQueixaPrincipal(e.target.value)}
                placeholder="Ex.: Gostaria de avaliar disposição, reposição hormonal, protocolo de longevidade ou aplicação injetável..."
                className="rounded-xl border-[#E3E7E5] text-sm leading-relaxed"
              />
            </div>

            {/* Observações adicionais */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">
                Observações ou melhor horário para contato (opcional)
              </Label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: Prefiro contato no período da tarde via WhatsApp..."
                className="rounded-xl border-[#E3E7E5] h-10 text-sm"
              />
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#166A5A] hover:bg-[#0F5145] text-white font-semibold rounded-xl h-11 text-sm shadow-md shadow-[#166A5A]/20 transition-all"
              >
                {loading ? 'Enviando pré-cadastro...' : 'Concluir Pré-Cadastro'}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#667C78] pt-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#166A5A]" />
              <span>Seus dados são tratados com total sigilo e respeito à LGPD médica.</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
