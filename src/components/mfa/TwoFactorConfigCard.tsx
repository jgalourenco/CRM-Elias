import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { mfaService } from '@/services/mfa'
import { MfaStatusResponse, MfaSetupResponse } from '@/types/crm'
import { QRCodeSVG } from '@/components/mfa/QRCodeSVG'

export const TwoFactorConfigCard: React.FC = () => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<MfaStatusResponse | null>(null)

  // Modal Setup / Ativação
  const [setupModalOpen, setSetupModalOpen] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [enabling, setEnabling] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedCodes, setCopiedCodes] = useState(false)

  // Modal Desativação
  const [disableModalOpen, setDisableModalOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disabling, setDisabling] = useState(false)

  // Modal Regeneração de Códigos
  const [regenModalOpen, setRegenModalOpen] = useState(false)
  const [regenPassword, setRegenPassword] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [newRegenCodes, setNewRegenCodes] = useState<string[] | null>(null)

  const loadStatus = async () => {
    try {
      setLoading(true)
      const data = await mfaService.getStatus()
      setStatus(data)
    } catch (err) {
      console.error('Erro ao carregar status 2FA:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleStartSetup = async () => {
    setSetupLoading(true)
    setSetupModalOpen(true)
    setConfirmationCode('')
    setCopiedSecret(false)
    setCopiedCodes(false)
    try {
      const data = await mfaService.setup()
      setSetupData(data)
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      toast({
        title: 'Erro ao iniciar configuração',
        description:
          anyErr.data?.message || anyErr.message || 'Falha ao gerar chaves de segurança.',
        variant: 'destructive',
      })
      setSetupModalOpen(false)
    } finally {
      setSetupLoading(false)
    }
  }

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = confirmationCode.replace(/\s+/g, '')
    if (cleanCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite o código de 6 dígitos exibido no seu aplicativo autenticador.',
        variant: 'destructive',
      })
      return
    }

    setEnabling(true)
    try {
      const res = await mfaService.enable(cleanCode)
      toast({
        title: '2FA Ativado com sucesso!',
        description:
          res.message || 'Sua conta agora está protegida com autenticação em dois fatores.',
      })
      setSetupModalOpen(false)
      setSetupData(null)
      setConfirmationCode('')
      await loadStatus()
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      toast({
        title: 'Falha na validação',
        description:
          anyErr.data?.message ||
          anyErr.message ||
          'Código incorreto ou expirado. Tente o código mais recente do app.',
        variant: 'destructive',
      })
    } finally {
      setEnabling(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disablePassword) {
      toast({
        title: 'Senha obrigatória',
        description: 'Informe sua senha atual para desativar o 2FA.',
        variant: 'destructive',
      })
      return
    }

    setDisabling(true)
    try {
      await mfaService.disable(disablePassword)
      toast({
        title: '2FA Desativado',
        description: 'A autenticação em dois fatores foi removida da sua conta.',
      })
      setDisableModalOpen(false)
      setDisablePassword('')
      await loadStatus()
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      toast({
        title: 'Erro ao desativar',
        description: anyErr.data?.message || anyErr.message || 'Senha incorreta.',
        variant: 'destructive',
      })
    } finally {
      setDisabling(false)
    }
  }

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regenPassword) {
      toast({
        title: 'Senha obrigatória',
        description: 'Informe sua senha para gerar novos códigos.',
        variant: 'destructive',
      })
      return
    }

    setRegenerating(true)
    try {
      const res = await mfaService.regenerateRecoveryCodes(regenPassword)
      setNewRegenCodes(res.recoveryCodes)
      toast({
        title: 'Códigos regenerados!',
        description: 'Guarde seus novos códigos de recuperação com segurança.',
      })
      await loadStatus()
    } catch (err: unknown) {
      const anyErr = err as { data?: { message?: string }; message?: string }
      toast({
        title: 'Erro ao regenerar códigos',
        description: anyErr.data?.message || anyErr.message || 'Senha incorreta.',
        variant: 'destructive',
      })
    } finally {
      setRegenerating(false)
    }
  }

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text)
    if (type === 'secret') {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } else {
      setCopiedCodes(true)
      setTimeout(() => setCopiedCodes(false), 2000)
    }
    toast({ title: 'Copiado para a área de transferência' })
  }

  return (
    <Card className="rounded-2xl border-[#E3E7E5] bg-white shadow-xs p-6 space-y-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#166A5A]" />
            <CardTitle className="text-base font-bold text-[#1C2B29]">
              Autenticação em dois fatores (2FA / MFA)
            </CardTitle>
          </div>
          {status && (
            <Badge
              variant={status.enabled ? 'default' : 'secondary'}
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                status.enabled
                  ? 'bg-[#E2F0EB] text-[#166A5A] hover:bg-[#E2F0EB] border border-[#166A5A]/30'
                  : 'bg-gray-100 text-[#667C78]'
              }`}
            >
              {status.enabled ? 'Ativada' : 'Desativada'}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-[#667C78] pt-1">
          Adicione uma camada extra de segurança aos prontuários e receitas exigindo um código TOTP
          do celular além da senha para fazer login no CRM.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {loading ? (
          <div className="py-4 text-center text-xs text-[#667C78]">
            Carregando status de segurança...
          </div>
        ) : status?.enabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#E2F0EB]/50 rounded-xl border border-[#166A5A]/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#166A5A]">
                <ShieldCheck className="h-4 w-4" />
                <span>Sua conta está protegida com autenticação em dois fatores.</span>
              </div>
              <p className="text-xs text-[#667C78]">
                {status.configuredAt && (
                  <>
                    Ativada em: {new Date(status.configuredAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(status.configuredAt).toLocaleTimeString('pt-BR')}.{' '}
                  </>
                )}
                Você possui{' '}
                <strong className="text-[#1C2B29] font-bold">
                  {status.recoveryCodesRemaining} de {status.recoveryCodesTotal}
                </strong>{' '}
                códigos de recuperação não utilizados disponíveis.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewRegenCodes(null)
                  setRegenPassword('')
                  setRegenModalOpen(true)
                }}
                className="rounded-xl border-[#E3E7E5] text-xs font-semibold hover:border-[#166A5A] text-[#1C2B29]"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-[#166A5A]" />
                Gerar novos códigos de recuperação
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDisablePassword('')
                  setDisableModalOpen(true)
                }}
                className="rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700"
              >
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                Desativar 2FA
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>
                  2FA desativado: recomendamos ativar para proteger dados médicos dos pacientes.
                </span>
              </div>
              <p className="text-xs text-amber-800">
                Compatível com qualquer app autenticador como Google Authenticator, Microsoft
                Authenticator, Authy, 1Password ou Apple Keychain.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleStartSetup}
              className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
            >
              <Smartphone className="mr-1.5 h-4 w-4" />
              Configurar Autenticação em Dois Fatores
            </Button>
          </div>
        )}
      </CardContent>

      {/* Modal: Setup e Ativação */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#166A5A]" />
              Configurar Aplicativo Autenticador (TOTP)
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Siga as 3 etapas abaixo para ativar a proteção em dois fatores.
            </DialogDescription>
          </DialogHeader>

          {setupLoading || !setupData ? (
            <div className="py-8 text-center text-xs text-[#667C78]">
              Gerando chaves de segurança criptográficas...
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Etapa 1: QR Code */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C2B29]">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#166A5A] text-white text-[10px]">
                    1
                  </span>
                  <span>Escaneie o QR Code no seu aplicativo autenticador</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-[#E3E7E5]">
                  <QRCodeSVG value={setupData.otpauthUrl} size={190} />
                  <p className="text-[11px] text-[#667C78] mt-2 text-center">
                    Conta: <strong>{setupData.account}</strong> • Emissor:{' '}
                    <strong>{setupData.issuer}</strong>
                  </p>
                </div>
              </div>

              {/* Chave manual */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Ou digite a chave manualmente se não conseguir escanear:
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={setupData.secret}
                    className="font-mono text-xs rounded-xl bg-gray-50 border-[#E3E7E5]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(setupData.secret, 'secret')}
                    className="rounded-xl shrink-0"
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-[#166A5A]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Etapa 2: Códigos de recuperação */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C2B29]">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#166A5A] text-white text-[10px]">
                    2
                  </span>
                  <span>Salve seus códigos de recuperação (Backup)</span>
                </div>
                <p className="text-xs text-[#667C78]">
                  Se perder o celular, esses códigos permitirão acessar sua conta. Cada código pode
                  ser utilizado apenas uma vez.
                </p>
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs font-mono grid grid-cols-2 gap-2 text-[#1C2B29]">
                  {setupData.recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-white/80 rounded border border-amber-200/50 text-center font-bold"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.recoveryCodes.join('\n'), 'codes')}
                  className="rounded-xl text-xs w-full border-[#E3E7E5]"
                >
                  {copiedCodes ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-[#166A5A]" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copiedCodes ? 'Códigos copiados!' : 'Copiar todos os códigos de recuperação'}
                </Button>
              </div>

              {/* Etapa 3: Validar código */}
              <form
                onSubmit={handleConfirmEnable}
                className="space-y-3 pt-2 border-t border-[#E3E7E5]"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C2B29]">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#166A5A] text-white text-[10px]">
                    3
                  </span>
                  <span>Digite o código de 6 dígitos do app para ativar:</span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="000000"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ''))}
                    className="pl-9 font-mono text-center text-lg tracking-[0.25em] font-bold rounded-xl border-[#E3E7E5] focus-visible:ring-[#166A5A]"
                  />
                </div>
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSetupModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={enabling || confirmationCode.length !== 6}
                    className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
                  >
                    {enabling ? 'Validando...' : 'Confirmar e Ativar 2FA'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Desativação com reautenticação obrigatória */}
      <Dialog open={disableModalOpen} onOpenChange={setDisableModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#C0392B] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#C0392B]" />
              Desativar Autenticação em Dois Fatores
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Por motivos de segurança, confirme sua senha atual para remover a proteção 2FA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDisable2FA} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1C2B29]">Senha Atual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="pl-9 rounded-xl border-[#E3E7E5]"
                />
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl text-xs text-[#C0392B] border border-red-200">
              Aviso: sua conta voltará a depender apenas de login e senha para acesso.
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={disabling}
                className="bg-[#C0392B] hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
              >
                {disabling ? 'Desativando...' : 'Confirmar Desativação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Regenerar Códigos de Recuperação */}
      <Dialog open={regenModalOpen} onOpenChange={setRegenModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C2B29] flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#166A5A]" />
              Regenerar Códigos de Recuperação
            </DialogTitle>
            <DialogDescription className="text-xs text-[#667C78]">
              Isso invalidará imediatamente todos os códigos de recuperação antigos gerados para sua
              conta.
            </DialogDescription>
          </DialogHeader>

          {newRegenCodes ? (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs font-mono grid grid-cols-2 gap-2 text-[#1C2B29]">
                {newRegenCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-white/80 rounded border border-amber-200/50 text-center font-bold"
                  >
                    {code}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => copyToClipboard(newRegenCodes.join('\n'), 'codes')}
                className="rounded-xl text-xs w-full border-[#E3E7E5]"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copiar novos códigos
              </Button>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setRegenModalOpen(false)}
                  className="bg-[#166A5A] text-white rounded-xl text-xs"
                >
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleRegenerateCodes} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#1C2B29]">
                  Confirme sua Senha Atual
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667C78]" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regenPassword}
                    onChange={(e) => setRegenPassword(e.target.value)}
                    className="pl-9 rounded-xl border-[#E3E7E5]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRegenModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={regenerating}
                  className="bg-[#166A5A] hover:bg-[#0F5145] text-white rounded-xl text-xs font-semibold"
                >
                  {regenerating ? 'Gerando...' : 'Gerar Novos Códigos'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
