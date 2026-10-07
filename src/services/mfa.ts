import pb from '@/lib/pocketbase/client'
import { MfaStatusResponse, MfaSetupResponse, Usuario } from '@/types/crm'

export interface MfaVerifyResponse {
  token: string
  record: Usuario
  usedRecoveryCode?: boolean
}

export const mfaService = {
  /**
   * Obtém status do 2FA do usuário autenticado.
   */
  async getStatus(): Promise<MfaStatusResponse> {
    return await pb.send<MfaStatusResponse>('/backend/v1/mfa/status', {
      method: 'GET',
    })
  },

  /**
   * Inicia o fluxo de configuração do 2FA:
   * Gera segredo Base32, URL otpauth:// e recovery codes preliminares.
   */
  async setup(): Promise<MfaSetupResponse> {
    return await pb.send<MfaSetupResponse>('/backend/v1/mfa/setup', {
      method: 'POST',
    })
  },

  /**
   * Confirma e ativa o 2FA após validar o primeiro código de 6 dígitos gerado no app autenticador.
   */
  async enable(code: string): Promise<{ success: boolean; message: string; configuredAt: string }> {
    return await pb.send<{ success: boolean; message: string; configuredAt: string }>(
      '/backend/v1/mfa/enable',
      {
        method: 'POST',
        body: { code },
      },
    )
  },

  /**
   * Valida segundo fator durante o login usando TOTP ou código de recuperação.
   * Retorna token de sessão definitivo do PocketBase.
   */
  async verify(params: {
    challengeToken: string
    code?: string
    recoveryCode?: string
  }): Promise<MfaVerifyResponse> {
    return await pb.send<MfaVerifyResponse>('/backend/v1/mfa/verify', {
      method: 'POST',
      body: params,
    })
  },

  /**
   * Desativa o 2FA mediante confirmação obrigatória de senha.
   */
  async disable(password: string): Promise<{ success: boolean; message: string }> {
    return await pb.send<{ success: boolean; message: string }>('/backend/v1/mfa/disable', {
      method: 'POST',
      body: { password },
    })
  },

  /**
   * Regenera os 8 códigos de recuperação do usuário autenticado, invalidando os anteriores.
   */
  async regenerateRecoveryCodes(
    password: string,
  ): Promise<{ success: boolean; message: string; recoveryCodes: string[] }> {
    return await pb.send<{ success: boolean; message: string; recoveryCodes: string[] }>(
      '/backend/v1/mfa/regenerate-recovery-codes',
      {
        method: 'POST',
        body: { password },
      },
    )
  },
}
