/**
 * Endpoint de desativação do 2FA.
 * POST /api/mfa/disable
 * Requer usuário autenticado ($apis.requireAuth()).
 * Exige reautenticação OBRIGATÓRIA com senha atual (e opcionalmente código TOTP).
 * Se senha inválida: rejeita imediatamente.
 * Se senha correta:
 * - Limpa mfa_secret, mfa_recovery_codes, mfa_configured_at, mfa_temp_*
 * - Define mfa_enabled = false
 * - Registra evento de auditoria 2FA_DISABLED
 */
routerAdd('POST', '/backend/v1/mfa/disable', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  if (!authRecord.getBool('mfa_enabled')) {
    return e.json(400, {
      error: 'MFA_NOT_ENABLED',
      message: 'O 2FA não está ativado nesta conta.',
    })
  }

  const reqBody = e.requestInfo().body || {}
  const password = (reqBody.password || '').toString()

  if (!password) {
    return e.json(400, {
      error: 'PASSWORD_REQUIRED',
      message: 'Confirme sua senha atual para desativar a autenticação em dois fatores.',
    })
  }

  // Validar senha atual do usuário (reautenticação mandatória)
  if (!authRecord.validatePassword(password)) {
    console.log('[SECURITY] 2FA_DISABLE_FAILED: user=' + authRecord.id + ' senha incorreta')
    return e.json(400, {
      error: 'INVALID_PASSWORD',
      message: 'Senha incorreta. Não foi possível desativar a autenticação em dois fatores.',
    })
  }

  // Desativar 2FA e limpar chaves/segredos sensíveis
  authRecord.set('mfa_enabled', false)
  authRecord.set('mfa_secret', '')
  authRecord.set('mfa_recovery_codes', null)
  authRecord.set('mfa_configured_at', '')
  authRecord.set('mfa_temp_secret', '')
  authRecord.set('mfa_temp_recovery_codes', null)
  authRecord.set('mfa_failed_attempts', 0)
  authRecord.set('mfa_locked_until', '')
  $app.save(authRecord)

  console.log('[SECURITY] 2FA_DISABLED: user=' + authRecord.id)

  return e.json(200, {
    success: true,
    message: 'Autenticação em dois fatores desativada com sucesso.',
  })
}, $apis.requireAuth())
