import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Paciente, CanalMensagem } from '@/types/crm'
import { mensagensService } from '@/services/crm'
import { useToast } from '@/hooks/use-toast'
import { Send, MessageCircle, Mail, Sparkles } from 'lucide-react'

interface EnviarMensagemAvulsaModalProps {
  open: boolean
  onClose: () => void
  paciente: Paciente
  onSuccess?: () => void
}

const TEMPLATES_PADRAO = [
  {
    nome: 'Lembrete de Consulta',
    canal: 'WhatsApp' as CanalMensagem,
    texto:
      'Olá, {nome}! Lembramos do seu atendimento agendado na Clínica Elias Mansur. Por favor, confirme respondendo a esta mensagem.',
  },
  {
    nome: 'Solicitação de Exames',
    canal: 'WhatsApp' as CanalMensagem,
    texto:
      'Olá, {nome}! Seguem as orientações dos exames laboratoriais solicitados em sua consulta. Caso precise de encaminhamento ou dúvidas sobre o preparo, estamos à disposição!',
  },
  {
    nome: 'Orientações Pré-procedimento',
    canal: 'WhatsApp' as CanalMensagem,
    texto:
      'Olá, {nome}! Seguem as orientações para o seu procedimento: hidratação abundante no dia anterior e repouso leve. Qualquer dúvida nos avise.',
  },
  {
    nome: 'Comunicação Oficial por E-mail',
    canal: 'Email' as CanalMensagem,
    texto:
      'Prezado(a) {nome},\n\nEntramos em contato para compartilhar o resumo da sua consulta e o planejamento terapêutico traçado pela equipe da Clínica Elias Mansur.\n\nFicamos à total disposição para eventuais esclarecimentos.\n\nAtenciosamente,\nEquipe Clínica Elias Mansur',
  },
  {
    nome: 'Feedback e Pós-Consulta',
    canal: 'WhatsApp' as CanalMensagem,
    texto:
      'Olá, {nome}! Como está se sentindo após o início do tratamento? Nossa equipe médica está à disposição para acompanhar sua evolução.',
  },
]

export default function EnviarMensagemAvulsaModal({
  open,
  onClose,
  paciente,
  onSuccess,
}: EnviarMensagemAvulsaModalProps) {
  const { toast } = useToast()
  const [canal, setCanal] = useState<CanalMensagem>('WhatsApp')
  const [assuntoTemplate, setAssuntoTemplate] = useState('Mensagem Avulsa')
  const [conteudo, setConteudo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const handleSelecionarTemplate = (templateNome: string) => {
    const t = TEMPLATES_PADRAO.find((item) => item.nome === templateNome)
    if (!t) return
    setCanal(t.canal)
    setAssuntoTemplate(t.nome)
    setConteudo(t.texto.replace('{nome}', paciente.nome.split(' ')[0] || paciente.nome))
  }

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteudo.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite o conteúdo da mensagem antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    setEnviando(true)
    try {
      await mensagensService.create({
        paciente_id: paciente.id,
        canal,
        direcao: 'saida',
        template: assuntoTemplate || 'Mensagem Avulsa',
        conteudo: conteudo.trim(),
        status: 'enviada',
        lida: true,
        agendada_para: new Date().toISOString(),
      })

      toast({
        title: 'Mensagem enviada com sucesso',
        description: `Disparada via ${canal} simulada e registrada no prontuário do paciente.`,
      })

      setConteudo('')
      setAssuntoTemplate('Mensagem Avulsa')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao enviar mensagem avulsa:', err)
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível registrar a mensagem.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#1C2B29]">
                Enviar Mensagem ao Paciente
              </DialogTitle>
              <DialogDescription className="text-xs text-[#667C78]">
                Mensagem avulsa registrada no banco e refletida na caixa simulada correspondente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleEnviar} className="space-y-4 pt-1">
          {/* Destinatário */}
          <div className="p-3 bg-[#F7F6F3] rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[#667C78]">Destinatário:</span>
              <p className="font-semibold text-[#1C2B29]">{paciente.nome}</p>
            </div>
            <div className="text-right">
              <span className="text-[#667C78]">Contato:</span>
              <p className="font-mono text-[#1C2B29]">
                {canal === 'WhatsApp'
                  ? paciente.telefone || 'Sem telefone'
                  : paciente.email || 'Sem e-mail'}
              </p>
            </div>
          </div>

          {/* Canal & Templates Rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Canal de Disparo</Label>
              <Select value={canal} onValueChange={(v: CanalMensagem) => setCanal(v)}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-[#25D366]" />
                      <span>WhatsApp (Simulado)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#2E7FA3]" />
                      <span>E-mail (Simulado)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29] flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#C9A227]" />
                Modelo / Template Rápido
              </Label>
              <Select onValueChange={handleSelecionarTemplate}>
                <SelectTrigger className="rounded-xl border-[#E3E7E5] text-xs">
                  <SelectValue placeholder="Escolher modelo pronto..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES_PADRAO.map((tpl) => (
                    <SelectItem key={tpl.nome} value={tpl.nome}>
                      <span className="text-xs">
                        {tpl.nome} ({tpl.canal})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assunto / Identificador */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1C2B29]">Identificador / Assunto</Label>
            <Input
              value={assuntoTemplate}
              onChange={(e) => setAssuntoTemplate(e.target.value)}
              placeholder="Ex: Mensagem Avulsa, Lembrete, Orientações..."
              className="rounded-xl border-[#E3E7E5] text-xs"
            />
          </div>

          {/* Conteúdo da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#1C2B29]">Conteúdo da Mensagem</Label>
              <span className="text-[11px] text-[#667C78]">{conteudo.length} caracteres</span>
            </div>
            <Textarea
              rows={5}
              required
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={`Digite aqui a mensagem que será enviada para ${paciente.nome}...`}
              className="rounded-xl border-[#E3E7E5] text-xs leading-relaxed"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={enviando}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando || !conteudo.trim()}
              className={`${
                canal === 'WhatsApp'
                  ? 'bg-[#25D366] hover:bg-[#20ba59] text-white'
                  : 'bg-[#2E7FA3] hover:bg-[#246785] text-white'
              } rounded-xl text-xs gap-1.5 shadow-sm font-semibold`}
            >
              <Send className="h-3.5 w-3.5" />
              {enviando ? 'Enviando...' : `Disparar para ${canal}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
