import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { pacientesService, prospeccoesService, dispatchAutomacao } from '@/services/crm'
import { Paciente, FasePaciente, Sexo } from '@/types/crm'
import { useToast } from '@/hooks/use-toast'
import { User, MapPin, FileText, Sparkles, CreditCard } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: (paciente: Paciente) => void
  pacienteParaEditar?: Paciente | null
}

export default function NovoPacienteModal({ open, onClose, onSuccess, pacienteParaEditar }: Props) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('dados')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [nome, setNome] = useState(pacienteParaEditar?.nome || '')
  const [cpf, setCpf] = useState(pacienteParaEditar?.cpf || '')
  const [dataNascimento, setDataNascimento] = useState(
    pacienteParaEditar?.data_nascimento?.slice(0, 10) || '',
  )
  const [sexo, setSexo] = useState<Sexo>((pacienteParaEditar?.sexo as Sexo) || 'Feminino')
  const [telefone, setTelefone] = useState(pacienteParaEditar?.telefone || '')
  const [email, setEmail] = useState(pacienteParaEditar?.email || '')
  const [fase, setFase] = useState<FasePaciente>(pacienteParaEditar?.fase || 'Prospeccao')

  // Identificadores & Convênio
  const [idCliente, setIdCliente] = useState(pacienteParaEditar?.id_cliente || '')
  const [idAssinatura, setIdAssinatura] = useState(pacienteParaEditar?.id_assinatura || '')
  const [idConvenio, setIdConvenio] = useState(pacienteParaEditar?.id_convenio || '')
  const [convenio, setConvenio] = useState(pacienteParaEditar?.convenio || '')

  // Endereço
  const [cep, setCep] = useState(pacienteParaEditar?.cep || '')
  const [logradouro, setLogradouro] = useState(pacienteParaEditar?.logradouro || '')
  const [numero, setNumero] = useState(pacienteParaEditar?.numero || '')
  const [complemento, setComplemento] = useState(pacienteParaEditar?.complemento || '')
  const [bairro, setBairro] = useState(pacienteParaEditar?.bairro || '')
  const [cidade, setCidade] = useState(pacienteParaEditar?.cidade || 'São Paulo')
  const [uf, setUf] = useState(pacienteParaEditar?.uf || 'SP')

  // Observações Clínicas
  const [observacoes, setObservacoes] = useState(pacienteParaEditar?.observacoes || '')

  // Update on prop change
  React.useEffect(() => {
    if (pacienteParaEditar) {
      setNome(pacienteParaEditar.nome || '')
      setCpf(pacienteParaEditar.cpf || '')
      setDataNascimento(pacienteParaEditar.data_nascimento?.slice(0, 10) || '')
      setSexo(pacienteParaEditar.sexo || 'Feminino')
      setTelefone(pacienteParaEditar.telefone || '')
      setEmail(pacienteParaEditar.email || '')
      setFase(pacienteParaEditar.fase || 'Prospeccao')
      setIdCliente(pacienteParaEditar.id_cliente || '')
      setIdAssinatura(pacienteParaEditar.id_assinatura || '')
      setIdConvenio(pacienteParaEditar.id_convenio || '')
      setConvenio(pacienteParaEditar.convenio || '')
      setCep(pacienteParaEditar.cep || '')
      setLogradouro(pacienteParaEditar.logradouro || '')
      setNumero(pacienteParaEditar.numero || '')
      setComplemento(pacienteParaEditar.complemento || '')
      setBairro(pacienteParaEditar.bairro || '')
      setCidade(pacienteParaEditar.cidade || 'São Paulo')
      setUf(pacienteParaEditar.uf || 'SP')
      setObservacoes(pacienteParaEditar.observacoes || '')
    } else {
      setNome('')
      setCpf('')
      setDataNascimento('')
      setSexo('Feminino')
      setTelefone('')
      setEmail('')
      setFase('Prospeccao')
      setIdCliente('')
      setIdAssinatura('')
      setIdConvenio('')
      setConvenio('')
      setCep('')
      setLogradouro('')
      setNumero('')
      setComplemento('')
      setBairro('')
      setCidade('São Paulo')
      setUf('SP')
      setObservacoes('')
    }
  }, [pacienteParaEditar, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do paciente.',
        variant: 'destructive',
      })
      setActiveTab('dados')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: Partial<Paciente> = {
        nome: nome.trim(),
        cpf: cpf.trim() || undefined,
        data_nascimento: dataNascimento ? new Date(dataNascimento).toISOString() : undefined,
        sexo,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        fase,
        id_cliente: idCliente.trim() || undefined,
        id_assinatura: idAssinatura.trim() || undefined,
        id_convenio: idConvenio.trim() || undefined,
        convenio: convenio.trim() || undefined,
        cep: cep.trim() || undefined,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        uf: uf.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      }

      let result: Paciente
      if (pacienteParaEditar?.id) {
        result = await pacientesService.update(pacienteParaEditar.id, payload)
        toast({ title: 'Paciente atualizado', description: 'Dados clínicos salvos com sucesso.' })
      } else {
        result = await pacientesService.create(payload)

        // Se nova prospecção criada, criar entrada no pipeline e disparar automação de boas-vindas
        if (fase === 'Prospeccao') {
          try {
            await prospeccoesService.create({
              paciente_id: result.id,
              canal: 'WhatsApp',
              prioridade: 'media',
              etapa: 'primeiro_contato',
            })
          } catch {
            /* intentionally ignored */
          }

          // Disparar automação de boas-vindas
          await dispatchAutomacao('Boas-vindas — primeiro contato', {
            id: result.id,
            nome: result.nome,
            telefone: result.telefone,
            email: result.email,
          })
        }

        toast({
          title: 'Paciente cadastrado',
          description: 'Paciente salvo e registrado com sucesso!',
        })
      }

      onSuccess(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar paciente.'
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#E2F0EB] text-[#166A5A] flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#1C2B29]">
              {pacienteParaEditar ? 'Editar Ficha do Paciente' : 'Novo Paciente'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#F7F6F3] p-1 rounded-xl">
              <TabsTrigger
                value="dados"
                className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#166A5A]"
              >
                <User className="h-3.5 w-3.5" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger
                value="endereco"
                className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#166A5A]"
              >
                <MapPin className="h-3.5 w-3.5" />
                Endereço
              </TabsTrigger>
              <TabsTrigger
                value="clinica"
                className="gap-2 text-xs font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#166A5A]"
              >
                <FileText className="h-3.5 w-3.5" />
                Observações
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: DADOS PESSOAIS */}
            <TabsContent value="dados" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="nome" className="text-xs font-semibold text-[#1C2B29]">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    required
                    placeholder="Ex: Maria Fernanda Costa"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="text-xs font-semibold text-[#1C2B29]">
                    Telefone / WhatsApp{' '}
                    <span className="text-xs font-normal text-[#667C78]">(opcional)</span>
                  </Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 98765-4321"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-[#1C2B29]">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="paciente@exemplo.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-xs font-semibold text-[#1C2B29]">
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nascimento" className="text-xs font-semibold text-[#1C2B29]">
                    Data de Nascimento
                  </Label>
                  <Input
                    id="nascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">Sexo</Label>
                  <Select value={sexo} onValueChange={(v: Sexo) => setSexo(v)}>
                    <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                      <SelectValue placeholder="Selecione o sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#1C2B29]">Fase Atual</Label>
                  <Select value={fase} onValueChange={(v: FasePaciente) => setFase(v)}>
                    <SelectTrigger className="rounded-xl border-[#E3E7E5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prospeccao">Prospecção</SelectItem>
                      <SelectItem value="Primeira_consulta">Primeira Consulta</SelectItem>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Em_acompanhamento">Em Acompanhamento</SelectItem>
                      <SelectItem value="Concluido">Concluído</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subseção: Identificadores & Convênio */}
                <div className="sm:col-span-2 pt-2 border-t border-[#E3E7E5] mt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#166A5A] mb-3 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Identificadores & Convênio
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="id_cliente" className="text-xs font-semibold text-[#1C2B29]">
                        ID do Cliente
                      </Label>
                      <Input
                        id="id_cliente"
                        placeholder="Ex: CLI-1049"
                        value={idCliente}
                        onChange={(e) => setIdCliente(e.target.value)}
                        className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="id_assinatura"
                        className="text-xs font-semibold text-[#1C2B29]"
                      >
                        ID da Assinatura
                      </Label>
                      <Input
                        id="id_assinatura"
                        placeholder="Ex: SUB-9821"
                        value={idAssinatura}
                        onChange={(e) => setIdAssinatura(e.target.value)}
                        className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="id_convenio" className="text-xs font-semibold text-[#1C2B29]">
                        ID do Convênio
                      </Label>
                      <Input
                        id="id_convenio"
                        placeholder="Ex: CONV-042"
                        value={idConvenio}
                        onChange={(e) => setIdConvenio(e.target.value)}
                        className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="convenio" className="text-xs font-semibold text-[#1C2B29]">
                        Convênio / Plano de Saúde
                      </Label>
                      <Input
                        id="convenio"
                        placeholder="Ex: Bradesco Saúde, Amil, SulAmérica..."
                        value={convenio}
                        onChange={(e) => setConvenio(e.target.value)}
                        className="rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: ENDEREÇO */}
            <TabsContent value="endereco" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cep" className="text-xs font-semibold text-[#1C2B29]">
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    placeholder="01414-001"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="logradouro" className="text-xs font-semibold text-[#1C2B29]">
                    Logradouro (Rua / Av)
                  </Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua Oscar Freire"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="numero" className="text-xs font-semibold text-[#1C2B29]">
                    Número
                  </Label>
                  <Input
                    id="numero"
                    placeholder="1420"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="complemento" className="text-xs font-semibold text-[#1C2B29]">
                    Complemento
                  </Label>
                  <Input
                    id="complemento"
                    placeholder="Apto 82"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bairro" className="text-xs font-semibold text-[#1C2B29]">
                    Bairro
                  </Label>
                  <Input
                    id="bairro"
                    placeholder="Cerqueira César"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cidade" className="text-xs font-semibold text-[#1C2B29]">
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    placeholder="São Paulo"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="uf" className="text-xs font-semibold text-[#1C2B29]">
                    UF
                  </Label>
                  <Input
                    id="uf"
                    maxLength={2}
                    placeholder="SP"
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className="rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: OBSERVAÇÕES CLÍNICAS */}
            <TabsContent value="clinica" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-xs font-semibold text-[#1C2B29]">
                  Observações Iniciais da Recepção / Triagem
                </Label>
                <Textarea
                  id="observacoes"
                  rows={5}
                  placeholder="Informações adicionais sobre histórico prévio, queixa principal de contato ou orientações específicas..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="rounded-xl border-[#E3E7E5]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-end gap-2 pt-4 border-t border-[#E3E7E5]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl px-5"
            >
              {isSubmitting
                ? 'Salvando...'
                : pacienteParaEditar
                  ? 'Atualizar Paciente'
                  : 'Cadastrar Paciente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
