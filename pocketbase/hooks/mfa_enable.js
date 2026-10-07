/**
 * Endpoint de ativação do 2FA.
 * POST /api/mfa/enable
 * Requer usuário autenticado ($apis.requireAuth()).
 * Recebe { code: "123456" }.
 * Descriptografa mfa_temp_secret, valida o código TOTP no tempo atual (tolerância +/- 1 janela).
 * Se válido:
 * - Define mfa_secret = mfa_temp_secret
 * - Define mfa_recovery_codes = mfa_temp_recovery_codes
 * - Define mfa_enabled = true
 * - Define mfa_configured_at = now()
 * - Limpa mfa_temp_secret e mfa_temp_recovery_codes
 * - Registra log de auditoria 2FA_ENABLED
 * Se inválido: rejeita com 400 e NÃO ativa.
 */
routerAdd('POST', '/backend/v1/mfa/enable', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  const encTempSecret = authRecord.getString('mfa_temp_secret')
  if (!encTempSecret) {
    return e.json(400, {
      error: 'NO_PENDING_SETUP',
      message: 'Nenhuma configuração de 2FA em andamento. Inicie o setup primeiro.',
    })
  }

  const reqBody = e.requestInfo().body || {}
  const code = (reqBody.code || '').toString().trim().replace(/\s+/g, '')

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    return e.json(400, {
      error: 'INVALID_CODE_FORMAT',
      message: 'O código deve conter exatamente 6 dígitos numéricos.',
    })
  }

  // Descriptografar secret temporário
  const encKey = $os.getenv('MFA_ENCRYPTION_KEY') || '4a8f9c2d1e0b7a6f5e4d3c2b1a0f9e8d'
  let rawSecret = ''
  try {
    rawSecret = $security.decrypt(encTempSecret, encKey)
  } catch (decErr) {
    console.log('[SECURITY] 2FA_ENABLE_ERROR: falha ao descriptografar segredo temporario')
    return e.json(500, { error: 'CRYPTO_ERROR', message: 'Erro ao validar configuração.' })
  }

  // Validador TOTP RFC 6238 em JS puro (HMAC-SHA1)
  function verifyTotp(secretBase32, inputCode) {
    const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const s = secretBase32.toUpperCase().replace(/=+$/, '')
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

    // SHA-1 implementation
    function sha1(bytes) {
      function rotl(n, s) {
        return (n << s) | (n >>> (32 - s))
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

    // Janela de tolerância +/- 1 período (30 segundos antes, atual, 30 segundos depois)
    for (let stepOffset = -1; stepOffset <= 1; stepOffset++) {
      const generated = generateCodeForCounter(currentStep + stepOffset)
      if (generated === inputCode) {
        return true
      }
    }
    return false
  }

  const isValid = verifyTotp(rawSecret, code)
  if (!isValid) {
    console.log('[SECURITY] 2FA_ENABLE_FAILED: user=' + authRecord.id + ' codigo invalido')
    return e.json(400, {
      error: 'INVALID_CODE',
      message: 'Código autenticador incorreto ou expirado. Tente o código atual exibido no seu aplicativo.',
    })
  }

  // Ativar 2FA oficialmente
  authRecord.set('mfa_secret', encTempSecret)
  authRecord.set('mfa_recovery_codes', authRecord.get('mfa_temp_recovery_codes'))
  authRecord.set('mfa_enabled', true)
  authRecord.set('mfa_configured_at', new Date().toISOString())
  authRecord.set('mfa_temp_secret', '')
  authRecord.set('mfa_temp_recovery_codes', null)
  authRecord.set('mfa_failed_attempts', 0)
  authRecord.set('mfa_locked_until', '')
  $app.save(authRecord)

  console.log('[SECURITY] 2FA_ENABLED: user=' + authRecord.id)

  return e.json(200, {
    success: true,
    message: 'Autenticação em dois fatores ativada com sucesso.',
    configuredAt: authRecord.getString('mfa_configured_at'),
  })
}, $apis.requireAuth())
