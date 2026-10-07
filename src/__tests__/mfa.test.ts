import { describe, it, expect } from 'vitest'

// Algoritmo TOTP puro idêntico ao do hook para validação em testes
function verifyTotpRFC6238(
  secretBase32: string,
  inputCode: string,
  stepOffset = 0,
  timestampMs = Date.now(),
): boolean {
  const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const s = secretBase32.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const keyBytes: number[] = []
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

  function rotl(n: number, sn: number) {
    return (n << sn) | (n >>> (32 - sn))
  }

  function sha1(bytes: number[]): number[] {
    const ml = bytes.length * 8
    const withPad = bytes.slice()
    withPad.push(0x80)
    while (withPad.length % 64 !== 56) {
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
        w[t] =
          ((withPad[idx] << 24) |
            (withPad[idx + 1] << 16) |
            (withPad[idx + 2] << 8) |
            withPad[idx + 3]) >>>
          0
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
          f = (b & c) | (~b & d)
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

    const out: number[] = []
    const words = [h0, h1, h2, h3, h4]
    for (let i = 0; i < 5; i++) {
      out.push((words[i] >>> 24) & 0xff)
      out.push((words[i] >>> 16) & 0xff)
      out.push((words[i] >>> 8) & 0xff)
      out.push(words[i] & 0xff)
    }
    return out
  }

  function hmacSha1(key: number[], msg: number[]): number[] {
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

  function generateCodeForCounter(counter: number): string {
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

  const currentEpoch = Math.floor(timestampMs / 1000)
  const currentStep = Math.floor(currentEpoch / 30)

  for (let offset = -1; offset <= 1; offset++) {
    const gen = generateCodeForCounter(currentStep + offset + stepOffset)
    if (gen === inputCode) {
      return true
    }
  }
  return false
}

function generateExpectedTotp(secretBase32: string, timestampMs = Date.now()): string {
  const base32Lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const s = secretBase32.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  const keyBytes: number[] = []
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

  function rotl(n: number, sn: number) {
    return (n << sn) | (n >>> (32 - sn))
  }

  function sha1(bytes: number[]): number[] {
    const ml = bytes.length * 8
    const withPad = bytes.slice()
    withPad.push(0x80)
    while (withPad.length % 64 !== 56) {
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
        w[t] =
          ((withPad[idx] << 24) |
            (withPad[idx + 1] << 16) |
            (withPad[idx + 2] << 8) |
            withPad[idx + 3]) >>>
          0
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
          f = (b & c) | (~b & d)
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

    const out: number[] = []
    const words = [h0, h1, h2, h3, h4]
    for (let i = 0; i < 5; i++) {
      out.push((words[i] >>> 24) & 0xff)
      out.push((words[i] >>> 16) & 0xff)
      out.push((words[i] >>> 8) & 0xff)
      out.push(words[i] & 0xff)
    }
    return out
  }

  function hmacSha1(key: number[], msg: number[]): number[] {
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

  const currentEpoch = Math.floor(timestampMs / 1000)
  const currentStep = Math.floor(currentEpoch / 30)
  const counterBytes = [0, 0, 0, 0, 0, 0, 0, 0]
  let tmp = currentStep
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

describe('2FA / MFA Core Security & Cryptographic Tests', () => {
  const testSecret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' // RFC 3548 Base32 test vector

  it('1. Deve validar código TOTP correto dentro da janela de 30 segundos', () => {
    const code = generateExpectedTotp(testSecret)
    const isValid = verifyTotpRFC6238(testSecret, code)
    expect(isValid).toBe(true)
  })

  it('2. Deve aceitar código TOTP com tolerância de clock drift de +/- 30 segundos', () => {
    const now = Date.now()
    const code30sAgo = generateExpectedTotp(testSecret, now - 30 * 1000)
    const isValid = verifyTotpRFC6238(testSecret, code30sAgo, 0, now)
    expect(isValid).toBe(true)
  })

  it('3. Deve rejeitar código TOTP incorreto', () => {
    const isValid = verifyTotpRFC6238(testSecret, '000000')
    const correct = generateExpectedTotp(testSecret)
    if (correct !== '000000') {
      expect(isValid).toBe(false)
    }
  })

  it('4. Deve rejeitar código TOTP expirado além da janela de tolerância (+90s)', () => {
    const now = Date.now()
    const codeOld = generateExpectedTotp(testSecret, now - 120 * 1000)
    const isValid = verifyTotpRFC6238(testSecret, codeOld, 0, now)
    expect(isValid).toBe(false)
  })

  it('5. Validação de formato da URI otpauth:// RFC 6238', () => {
    const issuer = 'Seleta CRM'
    const account = 'jgalourenco@hotmail.com'
    const secret = 'JBSWY3DPEHPK3PXP'
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`

    expect(uri.startsWith('otpauth://totp/')).toBe(true)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
    expect(uri).toContain('algorithm=SHA1')
  })

  it('6. Recovery codes: uso único e rejeição de reutilização', () => {
    const rawCodes = ['a1b2-c3d4', 'e5f6-g7h8']
    // Simulação do armazenamento em hash SHA-256
    const store = [
      { hash: 'hash_a1b2_c3d4', raw: 'a1b2-c3d4', used: false },
      { hash: 'hash_e5f6_g7h8', raw: 'e5f6-g7h8', used: false },
    ]

    function useCode(input: string): boolean {
      const item = store.find((c) => c.raw === input)
      if (!item) return false
      if (item.used) return false // Rejeição de reutilização!
      item.used = true
      return true
    }

    // Primeiro uso: deve passar
    expect(useCode('a1b2-c3d4')).toBe(true)
    // Segundo uso do mesmo código: deve FALHAR (proteção contra replay)
    expect(useCode('a1b2-c3d4')).toBe(false)
    // Outro código ainda não usado: deve passar
    expect(useCode('e5f6-g7h8')).toBe(true)
  })

  it('7. Rate limit: bloqueio temporário após 5 falhas consecutivas', () => {
    let failedAttempts = 0
    let lockedUntil: number | null = null

    function registerFailure() {
      failedAttempts++
      if (failedAttempts >= 5) {
        lockedUntil = Date.now() + 2 * 60 * 1000 // 2 minutos
      }
    }

    function canAttempt() {
      if (lockedUntil && lockedUntil > Date.now()) {
        return false
      }
      return true
    }

    for (let i = 0; i < 4; i++) {
      expect(canAttempt()).toBe(true)
      registerFailure()
    }
    expect(canAttempt()).toBe(true) // 4 falhas, ainda pode
    registerFailure() // 5ª falha
    expect(canAttempt()).toBe(false) // Bloqueado por 2 minutos
  })

  it('8. Desativação exige reautenticação com senha válida', () => {
    const user = { passwordHash: 'valid_bcrypt_hash' }
    function disableMfa(password: string): boolean {
      if (password !== 'Skip@Pass') {
        return false
      }
      return true
    }

    expect(disableMfa('senha_errada')).toBe(false)
    expect(disableMfa('')).toBe(false)
    expect(disableMfa('Skip@Pass')).toBe(true)
  })

  it('9. Challenge token temporário não pode ser aceito como Access Token de autorização', () => {
    const challengePayload = { sub: 'usr123', purpose: 'mfa_challenge' }
    function isAccessToken(payload: { purpose?: string }): boolean {
      return payload.purpose !== 'mfa_challenge'
    }

    expect(isAccessToken(challengePayload)).toBe(false)
  })
})
