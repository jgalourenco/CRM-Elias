/**
 * Endpoints de administração de usuários e primeiro acesso:
 * 1. POST /backend/v1/admin/reset-password (Admin define/reseta senha de usuário)
 * 2. POST /backend/v1/auth/primeiro-acesso (Usuário autenticado troca sua senha inicial obrigatória)
 */

routerAdd('POST', '/backend/v1/admin/reset-password', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  const role = authRecord.getString('papel')
  if (role !== 'Administrador') {
    return e.json(403, {
      error: 'FORBIDDEN',
      message: 'Apenas administradores podem redefinir a senha de outros usuários.',
    })
  }

  const body = e.requestInfo().body || {}
  const targetUserId = body.userId
  const newPassword = body.newPassword
  // Se explicitamente informado no body, respeita. Por padrão ao definir senha pelo admin: true
  const flagPrimeiroAcesso = body.precisaTrocarSenha !== undefined ? !!body.precisaTrocarSenha : true

  if (!targetUserId || !newPassword || newPassword.length < 8) {
    return e.json(400, {
      error: 'INVALID_REQUEST',
      message: 'ID do usuário e nova senha (mínimo de 8 caracteres) são obrigatórios.',
    })
  }

  try {
    const targetUser = $app.findRecordById('users', targetUserId)
    targetUser.setPassword(newPassword)
    targetUser.set('precisa_trocar_senha', flagPrimeiroAcesso)
    $app.save(targetUser)

    console.log(
      '[SECURITY] ADMIN_PASSWORD_RESET: target=' +
        targetUserId +
        ' by=' +
        authRecord.id +
        ' flagPrimeiroAcesso=' +
        flagPrimeiroAcesso,
    )

    return e.json(200, {
      success: true,
      message: 'Senha do usuário redefinida com sucesso.',
      precisa_trocar_senha: flagPrimeiroAcesso,
    })
  } catch (err) {
    console.log('[SECURITY] ADMIN_PASSWORD_RESET_ERROR: ' + err)
    return e.json(404, {
      error: 'USER_NOT_FOUND',
      message: 'Usuário não encontrado ou erro ao redefinir senha.',
    })
  }
}, $apis.requireAuth())

/**
 * Endpoint para troca obrigatória de senha no primeiro acesso
 * POST /backend/v1/auth/primeiro-acesso
 * Requer usuário autenticado com precisa_trocar_senha = true
 * Body: { currentPassword, newPassword }
 */
routerAdd('POST', '/backend/v1/auth/primeiro-acesso', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
  }

  const body = e.requestInfo().body || {}
  const currentPassword = (body.currentPassword || '').toString()
  const newPassword = (body.newPassword || '').toString()

  if (!newPassword || newPassword.length < 8) {
    return e.json(400, {
      error: 'INVALID_PASSWORD',
      message: 'A nova senha deve ter no mínimo 8 caracteres.',
    })
  }

  // Se informou currentPassword, valida se não é idêntica à anterior
  if (currentPassword && currentPassword === newPassword) {
    return e.json(400, {
      error: 'SAME_PASSWORD',
      message: 'A nova senha deve ser diferente da senha inicial provisória.',
    })
  }

  try {
    const user = $app.findRecordById('users', authRecord.id)

    // Se informou currentPassword e o método validatePassword existir, valida
    if (currentPassword && !user.validatePassword(currentPassword)) {
      return e.json(400, {
        error: 'INVALID_CURRENT_PASSWORD',
        message: 'A senha atual/temporária informada está incorreta.',
      })
    }

    user.setPassword(newPassword)
    user.set('precisa_trocar_senha', false)
    $app.save(user)

    console.log('[SECURITY] FIRST_LOGIN_PASSWORD_CHANGED: user=' + user.id)

    return e.json(200, {
      success: true,
      message: 'Senha alterada com sucesso! Seu acesso completo foi liberado.',
      user: {
        id: user.id,
        email: user.getString('email'),
        name: user.getString('name'),
        papel: user.getString('papel'),
        precisa_trocar_senha: false,
      },
    })
  } catch (err) {
    console.log('[SECURITY] FIRST_LOGIN_PASSWORD_CHANGE_ERROR: ' + err)
    return e.json(500, {
      error: 'UPDATE_FAILED',
      message: 'Não foi possível atualizar sua senha. Tente novamente.',
    })
  }
}, $apis.requireAuth())
