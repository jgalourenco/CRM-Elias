/**
 * Endpoint de setup do 2FA.
 * POST /api/mfa/setup
 * Requer usuário autenticado ($apis.requireAuth()).
 * Gera um segredo TOTP em Base32, criptografa com AES-256-GCM antes de persistir em mfa_temp_secret,
 * gera 8 recovery codes de uso único (com hashes armazenados em mfa_temp_recovery_codes)
 * e retorna secret (texto limpo, para digitação manual no app), otpauthUrl e recoveryCodes em texto puro
 * SOMENTE esta vez durante o fluxo de configuração.
 */
routerAdd('POST', '/backend/v1/mfa/setup', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  // Se já tem 2FA ativo, rejeitar iniciar setup sem desativar antes
  if (authRecord.getBool('mfa_enabled')) {
    return e.json(400, {
      error: 'MFA_ALREADY_ENABLED',
      message: 'A autenticação em dois fatores já está ativa nesta conta.',
    })
  }

  // Gerar secret Base32 de 20 bytes (32 caracteres Base32: A-Z, 2-7)
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let rawSecret = ''
  for (let i = 0; i < 32; i++) {
    const randIdx = Math.floor(Math.random() * base32Chars.length)
    rawSecret += base32Chars[randIdx]
  }

  // Gerar 8 recovery codes em formato xxxx-xxxx
  const hexChars = '0123456789abcdef'
  const recoveryCodesPlain = []
  const recoveryCodesHashed = []

  for (let i = 0; i < 8; i++) {
    let p1 = ''
    let p2 = ''
    for (let c = 0; c < 4; c++) {
      p1 += hexChars[Math.floor(Math.random() * hexChars.length)]
      p2 += hexChars[Math.floor(Math.random() * hexChars.length)]
    }
    const code = p1 + '-' + p2
    recoveryCodesPlain.push(code)

    const codeHash = $security.sha256(code)
    recoveryCodesHashed.push({
      hash: codeHash,
      used: false,
      used_at: null,
    })
  }

  // Criptografar segredo com AES-256-GCM usando chave de 32 bytes do ambiente
  const encKey = $os.getenv('MFA_ENCRYPTION_KEY') || '4a8f9c2d1e0b7a6f5e4d3c2b1a0f9e8d'
  const encryptedSecret = $security.encrypt(rawSecret, encKey)

  // Salvar segredo e recovery codes temporários no registro do usuário
  authRecord.set('mfa_temp_secret', encryptedSecret)
  authRecord.set('mfa_temp_recovery_codes', recoveryCodesHashed)
  $app.save(authRecord)

  console.log('[SECURITY] 2FA_SETUP_STARTED: user=' + authRecord.id)

  const issuer = 'Seleta CRM'
  const email = authRecord.getString('email')
  const otpauthUrl = 'otpauth://totp/' + encodeURIComponent(issuer) + ':' + encodeURIComponent(email) +
    '?secret=' + rawSecret +
    '&issuer=' + encodeURIComponent(issuer) +
    '&algorithm=SHA1&digits=6&period=30'

  return e.json(200, {
    secret: rawSecret,
    otpauthUrl: otpauthUrl,
    recoveryCodes: recoveryCodesPlain,
    issuer: issuer,
    account: email,
  })
}, $apis.requireAuth())
