/**
 * Endpoint de status do 2FA do usuário autenticado.
 * GET /api/mfa/status
 * Requer usuário autenticado.
 * Retorna status de habilitação, data de configuração, e quantidade de recovery codes restantes.
 * NUNCA retorna o segredo TOTP ou códigos em texto puro!
 */
routerAdd('GET', '/backend/v1/mfa/status', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  const enabled = authRecord.getBool('mfa_enabled')
  const configuredAt = authRecord.getString('mfa_configured_at')
  const storedCodes = authRecord.get('mfa_recovery_codes') || []

  let remainingCodes = 0
  let totalCodes = 0
  if (Array.isArray(storedCodes)) {
    totalCodes = storedCodes.length
    for (let i = 0; i < storedCodes.length; i++) {
      if (!storedCodes[i].used) {
        remainingCodes++
      }
    }
  }

  return e.json(200, {
    enabled: enabled,
    configuredAt: configuredAt || null,
    recoveryCodesRemaining: remainingCodes,
    recoveryCodesTotal: totalCodes,
    hasPendingSetup: !!authRecord.getString('mfa_temp_secret'),
  })
}, $apis.requireAuth())
