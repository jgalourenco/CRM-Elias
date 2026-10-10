/**
 * Endpoint de administração de usuários para administradores:
 * POST /backend/v1/admin/reset-password
 * Requer usuário autenticado com papel = 'Administrador'
 * Body: { userId, newPassword }
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

  if (!targetUserId || !newPassword || newPassword.length < 8) {
    return e.json(400, {
      error: 'INVALID_REQUEST',
      message: 'ID do usuário e nova senha (mínimo de 8 caracteres) são obrigatórios.',
    })
  }

  try {
    const targetUser = $app.findRecordById('users', targetUserId)
    targetUser.setPassword(newPassword)
    $app.save(targetUser)

    console.log('[SECURITY] ADMIN_PASSWORD_RESET: target=' + targetUserId + ' by=' + authRecord.id)

    return e.json(200, {
      success: true,
      message: 'Senha do usuário redefinida com sucesso.',
    })
  } catch (err) {
    console.log('[SECURITY] ADMIN_PASSWORD_RESET_ERROR: ' + err)
    return e.json(404, {
      error: 'USER_NOT_FOUND',
      message: 'Usuário não encontrado ou erro ao redefinir senha.',
    })
  }
}, $apis.requireAuth())
