/**
 * Endpoint de verificação do 2FA no login.
 * POST /api/mfa/verify
 * Endpoint público (não exige access token prévio).
 * Valida challengeToken temporário emitido pelo mfa_auth_interceptor.
 * Se TOTP fornecido: valida TOTP contra mfa_secret descriptografado.
 * Se recoveryCode fornecido: valida hash contra mfa_recovery_codes não utilizados e consome imediatamente.
 * Emite auth token definitivo do PocketBase via record.newAuthToken() e retorna { token, record }.
 */
routerAdd('POST', '/backend/v1/mfa/verify', (e) => {
  const reqBody = e.requestInfo().body || {}
  const challengeToken = (reqBody.challengeToken || '').toString().trim()
  const code = (reqBody.code || '').toString().trim().replace(/\s+/g, '')
  const recoveryCode = (reqBody.recoveryCode || '').toString().trim().toLowerCase().replace(/\s+/g, '')

  if (!challengeToken) {
    return e.json(400, {
      error: 'MISSING_CHALLENGE',
      message: 'Token de desafio (challengeToken) ausente.',
    })
  }

  if (!code && !recoveryCode) {
    return e.json(400, {
      error: 'MISSING_CREDENTIALS',
      message: 'Informe o código autenticador de 6 dígitos ou um código de recuperação.',
    })
  }

  // 1. Validar challengeToken JWT
  const jwtSecret = $os.getenv('MFA_JWT_SECRET') || 'default-seleta-crm-mfa-jwt-secret-key-32'
  let claims = null
  try {
    claims = $security.parseJWT(challengeToken, jwtSecret)
  } catch (err) {
    console.log('[SECURITY] 2FA_CHALLENGE_FAILED: assinatura invalida ou expirado')
    return e.json(401, {
      error: 'INVALID_CHALLENGE',
      message: 'Sessão de verificação expirada ou inválida. Por favor, refaça o login.',
    })
  }

  if (!claims || claims.purpose !== 'mfa_challenge' || !claims.sub) {
    console.log('[SECURITY] 2FA_CHALLENGE_FAILED: claims invalidas')
    return e.json(401, {
      error: 'INVALID_CHALLENGE',
      message: 'Token de desafio inválido para esta operação.',
    })
  }

  const userId = claims.sub
  let userRecord = null
  try {
    userRecord = $app.findRecordById('users', userId)
  } catch (_) {
    return e.json(404, {
      error: 'USER_NOT_FOUND',
      message: 'Usuário não localizado.',
    })
  }

  // 2. Verificar se o usuário está em lockout por excesso de tentativas
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

  const encSecret = userRecord.getString('mfa_secret')
  const mfaEnabled = userRecord.getBool('mfa_enabled')

  if (!mfaEnabled || !encSecret) {
    return e.json(400, {
      error: 'MFA_NOT_CONFIGURED',
      message: '2FA não está ativo para esta conta.',
    })
  }

  let isVerified = false
  let usedRecovery = false

  // Helper de rate-limiting progressivo para falhas
  function recordFailedAttempt(record) {
    const currentFails = record.getInt('mfa_failed_attempts') + 1
    record.set('mfa_failed_attempts', currentFails)

    if (currentFails >= 10) {
      // 15 minutos de bloqueio
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      record.set('mfa_locked_until', lockUntil)
      console.log('[SECURITY] 2FA_LOCKOUT: user=' + record.id + ' attempts=' + currentFails)
    } else if (currentFails >= 5) {
      // 2 minutos de bloqueio
      const lockUntil = new Date(Date.now() + 2 * 60 * 1000).toISOString()
      record.set('mfa_locked_until', lockUntil)
      console.log('[SECURITY] 2FA_LOCKOUT: user=' + record.id + ' attempts=' + currentFails)
    }
    $app.save(record)
  }

  // Se o usuário utilizou código de recuperação
  if (recoveryCode) {
    const hashedInput = $security.sha256(recoveryCode)
    const storedCodes = userRecord.get('mfa_recovery_codes') || []
    let matchIdx = -1

    for (let i = 0; i < storedCodes.length; i++) {
      if (storedCodes[i].hash === hashedInput) {
        if (storedCodes[i].used) {
          // Já foi utilizado anteriormente: rejeita
          recordFailedAttempt(userRecord)
          console.log('[SECURITY] 2FA_RECOVERY_CODE_REUSED_ATTEMPT: user=' + userId)
          return e.json(400, {
            error: 'RECOVERY_CODE_ALREADY_USED',
            message: 'Este código de recuperação já foi utilizado. Cada código tem uso único.',
          })
        }
        matchIdx = i
        break
      }
    }

    if (matchIdx !== -1) {
      isVerified = true
      usedRecovery = true
      // Marcar código como usado imediatamente
      storedCodes[matchIdx].used = true
      storedCodes[matchIdx].used_at = new Date().toISOString()
      userRecord.set('mfa_recovery_codes', storedCodes)
      console.log('[SECURITY] 2FA_RECOVERY_CODE_USED: user=' + userId)
    } else {
      recordFailedAttempt(userRecord)
      console.log('[SECURITY] 2FA_CHALLENGE_FAILED: user=' + userId + ' recovery code invalido')
      return e.json(400, {
        error: 'INVALID_RECOVERY_CODE',
        message: 'Código de recuperação inválido. Verifique o formato digitado.',
      })
    }
  } else if (code) {
    // Validar TOTP 6 dígitos
    if (!/^\d{6}$/.test(code)) {
      return e.json(400, {
        error: 'INVALID_CODE_FORMAT',
        message: 'O código deve conter exatamente 6 dígitos numéricos.',
      })
    }

    const encKey = $os.getenv('MFA_ENCRYPTION_KEY') || '4a8f9c2d1e0b7a6f5e4d3c2b1a0f9e8d'
    let rawSecret = ''
    try {
      rawSecret = $security.decrypt(encSecret, encKey)
    } catch (_) {
      console.log('[SECURITY] 2FA_VERIFY_ERROR: falha ao descriptografar secret')
      return e.json(500, { error: 'CRYPTO_ERROR', message: 'Erro interno ao validar 2FA.' })
    }

    // Algoritmo TOTP HMAC-SHA1
    const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const s = rawSecret.toUpperCase().replace(/=+$/, '')
    let bits = 0
    let value = 0
    const keyBytes = []
    for (let i = 0; i < s.length; i++) {
      const idx = base32Lookup.indexOf(s.charAt(i))
      if (idx === -1) continue
      value = (value << 5) | idx
      bits += 5
      if (bits >= 8) {
        keyBytes.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }

    function sha1(bytes) {
      function rotl(n, sn) {
        return (n << sn) | (n >>> (32 - sn))
      }
      const ml = bytes.length * 8
      const withPad = bytes.slice()
      withPad.push(0x80)
      while ((withPad.length % 64) !== 56) {
        withPad.push(0)
      }
      for (let i = 7; i >= 0; i--) {
        withPad.push((ml / Math.pow(2, i * 8)) & 0xff)
      }

      let h0 = 0x67452301
      let h1 = 0xefcdab89
      let h2 = 0x98badcfe
      let h3 = 0x10325476
      let h4 = 0xc3d2e1f0

      const w = new Array(80)
      for (let i = 0; i < withPad.length; i += 64) {
        for (let t = 0; t < 16; t++) {
          const idx = i + t * 4
          w[t] = ((withPad[idx] << 24) | (withPad[idx + 1] << 16) | (withPad[idx + 2] << 8) | withPad[idx + 3]) >>> 0
        }
        for (let t = 16; t < 80; t++) {
          w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1) >>> 0
        }

        let a = h0
        let b = h1
        let c = h2
        let d = h3
        let e = h4

        for (let t = 0; t < 80; t++) {
          let f = 0
          let k = 0
          if (t < 20) {
            f = (b & c) | ((~b) & d)
            k = 0x5a827999
          } else if (t < 40) {
            f = b ^ c ^ d
            k = 0x6ed9eba1
          } else if (t < 60) {
            f = (b & c) | (b & d) | (c & d)
            k = 0x8f1bbcdc
          } else {
            f = b ^ c ^ d
            k = 0xca62c1d6
          }
          const temp = (rotl(a, 5) + f + e + k + w[t]) >>> 0
          e = d
          d = c
          c = rotl(b, 30) >>> 0
          b = a
          a = temp
        }

        h0 = (h0 + a) >>> 0
        h1 = (h1 + b) >>> 0
        h2 = (h2 + c) >>> 0
        h3 = (h3 + d) >>> 0
        h4 = (h4 + e) >>> 0
      }

      const out = []
      const words = [h0, h1, h2, h3, h4]
      for (let i = 0; i < 5; i++) {
        out.push((words[i] >>> 24) & 0xff)
        out.push((words[i] >>> 16) & 0xff)
        out.push((words[i] >>> 8) & 0xff)
        out.push(words[i] & 0xff)
      }
      return out
    }

    function hmacSha1(key, msg) {
      let k = key.slice()
      if (k.length > 64) {
        k = sha1(k)
      }
      while (k.length < 64) {
        k.push(0)
      }
      const oKeyPad = new Array(64)
      const iKeyPad = new Array(64)
      for (let i = 0; i < 64; i++) {
        oKeyPad[i] = k[i] ^ 0x5c
        iKeyPad[i] = k[i] ^ 0x36
      }
      const inner = sha1(iKeyPad.concat(msg))
      return sha1(oKeyPad.concat(inner))
    }

    function generateCodeForCounter(counter) {
      const counterBytes = [0, 0, 0, 0, 0, 0, 0, 0]
      let tmp = counter
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = tmp & 0xff
        tmp = Math.floor(tmp / 256)
      }
      const hash = hmacSha1(keyBytes, counterBytes)
      const offset = hash[hash.length - 1] & 0x0f
      const binary =
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)
      const otp = binary % 1000000
      let otpStr = otp.toString()
      while (otpStr.length < 6) {
        otpStr = '0' + otpStr
      }
      return otpStr
    }

    const currentEpoch = Math.floor(Date.now() / 1000)
    const currentStep = Math.floor(currentEpoch / 30)

    for (let stepOffset = -1; stepOffset <= 1; stepOffset++) {
      const generated = generateCodeForCounter(currentStep + stepOffset)
      if (generated === code) {
        isVerified = true
        break
      }
    }

    if (!isVerified) {
      recordFailedAttempt(userRecord)
      console.log('[SECURITY] 2FA_CHALLENGE_FAILED: user=' + userId + ' codigo totp invalido')
      return e.json(400, {
        error: 'INVALID_TOTP_CODE',
        message: 'Código autenticador incorreto ou expirado. Tente novamente.',
      })
    }
  }

  // Sucesso na verificação! Resetar contadores de falha
  userRecord.set('mfa_failed_attempts', 0)
  userRecord.set('mfa_locked_until', '')
  $app.save(userRecord)

  // Emitir token definitivo do PocketBase para a sessão autenticada
  const finalToken = userRecord.newAuthToken()

  console.log('[SECURITY] 2FA_VERIFIED_SUCCESS: user=' + userId + (usedRecovery ? ' via recovery_code' : ' via totp'))

  return e.json(200, {
    token: finalToken,
    record: {
      id: userRecord.id,
      email: userRecord.getString('email'),
      name: userRecord.getString('name'),
      avatar: userRecord.getString('avatar'),
      papel: userRecord.getString('papel'),
      precisa_trocar_senha: userRecord.getBool('precisa_trocar_senha'),
      mfa_enabled: true,
      created: userRecord.getString('created'),
      updated: userRecord.getString('updated'),
    },
    usedRecoveryCode: usedRecovery,
  })
})
