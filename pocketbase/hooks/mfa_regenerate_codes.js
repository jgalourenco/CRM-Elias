/**
 * Endpoint para regenerar códigos de recuperação (Recovery Codes).
 * POST /api/mfa/regenerate-recovery-codes
 * Requer usuário autenticado com 2FA ativo.
 * Exige confirmação de senha do usuário para segurança.
 * Invalida TODOS os códigos de recuperação anteriores.
 * Retorna nova lista de 8 códigos em texto puro SOMENTE nesta chamada.
 */
routerAdd('POST', '/backend/v1/mfa/regenerate-recovery-codes', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  if (!authRecord.getBool('mfa_enabled')) {
    return e.json(400, {
      error: 'MFA_NOT_ENABLED',
      message: 'A autenticação em dois fatores não está ativa nesta conta.',
    })
  }

  const reqBody = e.requestInfo().body || {}
  const password = (reqBody.password || '').toString()

  if (!password) {
    return e.json(400, {
      error: 'PASSWORD_REQUIRED',
      message: 'Confirme sua senha para regenerar os códigos de recuperação.',
    })
  }

  if (!authRecord.validatePassword(password)) {
    console.log('[SECURITY] 2FA_REGENERATE_FAILED: user=' + authRecord.id + ' senha incorreta')
    return e.json(400, {
      error: 'INVALID_PASSWORD',
      message: 'Senha incorreta. Ação não autorizada.',
    })
  }

  // Gerar 8 novos códigos de recuperação
  const hexChars = '0123456789abcdef'
  const newCodesPlain = []
  const newCodesHashed = []

  for (let i = 0; i < 8; i++) {
    let p1 = ''
    let p2 = ''
    for (let c = 0; c < 4; c++) {
      p1 += hexChars[Math.floor(Math.random() * hexChars.length)]
      p2 += hexChars[Math.floor(Math.random() * hexChars.length)]
    }
    const code = p1 + '-' + p2
    newCodesPlain.push(code)

    const codeHash = $security.sha256(code)
    newCodesHashed.push({
      hash: codeHash,
      used: false,
      used_at: null,
    })
  }

  // Sobrescrever códigos antigos invalidando-os instantaneamente
  authRecord.set('mfa_recovery_codes', newCodesHashed)
  $app.save(authRecord)

  console.log('[SECURITY] 2FA_RECOVERY_CODES_REGENERATED: user=' + authRecord.id)

  return e.json(200, {
    success: true,
    message: 'Novos códigos de recuperação gerados com sucesso. Os anteriores foram invalidados.',
    recoveryCodes: newCodesPlain,
  })
}, $apis.requireAuth())
