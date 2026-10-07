/**
 * Intercepta chamadas de autenticação por senha do PocketBase (users).
 * Se o usuário tiver mfa_enabled = true:
 * - Não emite o auth token final!
 * - Gera um challengeToken temporário assinado com MFA_JWT_SECRET (validade 5 minutos).
 * - Retorna JSON: { requiresTwoFactor: true, challengeToken: "...", mfaType: "totp" }
 * - Se mfa_enabled = false ou nulo: chama e.next() para manter fluxo normal.
 */
onRecordAuthWithPasswordRequest((e) => {
  if (e.collection && e.collection.name !== 'users') {
    return e.next()
  }

  // Identificar usuário pelo e-mail ou username informado
  const identity = (e.identity || '').trim().toLowerCase()
  if (!identity) {
    return e.next()
  }

  let userRecord = null
  try {
    userRecord = e.app.findAuthRecordByEmail('users', identity)
  } catch (_) {
    try {
      userRecord = e.app.findFirstRecordByData('users', 'username', identity)
    } catch (_) {}
  }

  if (!userRecord) {
    return e.next()
  }

  // Se o usuário não tem 2FA ativo, deixa passar normalmente
  const mfaEnabled = userRecord.getBool('mfa_enabled')
  if (!mfaEnabled) {
    return e.next()
  }

  // Verificar se a senha está correta ANTES de solicitar o 2FA
  const password = e.password || ''
  if (!userRecord.validatePassword(password)) {
    // Senha errada: deixa o PocketBase rejeitar normalmente com erro de credenciais inválidas
    return e.next()
  }

  // Verificar se o usuário está em lockout temporário de MFA
  const lockedUntilStr = userRecord.getString('mfa_locked_until')
  if (lockedUntilStr) {
    const lockedUntil = new Date(lockedUntilStr)
    if (lockedUntil.getTime() > Date.now()) {
      const waitSeconds = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
      return e.json(429, {
        error: 'MFA_LOCKED',
        message: 'Muitas tentativas incorretas. Conta bloqueada temporariamente para 2FA por ' + waitSeconds + ' segundos.',
      })
    }
  }

  // Usuário COM 2FA ATIVO e SENHA CORRETA:
  // NÃO EMITIR O TOKEN DEFINITIVO!
  // Gerar challengeToken temporário de uso único para 2FA
  const jwtSecret = $os.getenv('MFA_JWT_SECRET') || 'default-seleta-crm-mfa-jwt-secret-key-32'
  const challengeJti = $security.randomString(24)
  const durationSecs = 300 // 5 minutos de validade

  const payload = {
    sub: userRecord.id,
    purpose: 'mfa_challenge',
    jti: challengeJti,
    email: userRecord.getString('email'),
  }

  const challengeToken = $security.createJWT(payload, jwtSecret, durationSecs)

  console.log('[SECURITY] 2FA_CHALLENGE_ISSUED: user=' + userRecord.id)

  return e.json(200, {
    requiresTwoFactor: true,
    challengeToken: challengeToken,
    mfaType: 'totp',
    user: {
      id: userRecord.id,
      email: userRecord.getString('email'),
      name: userRecord.getString('name'),
    },
  })
}, 'users')
