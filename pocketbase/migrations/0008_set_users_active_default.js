migrate(
  (app) => {
    // Definir ativo = 1 para todos os usuários existentes
    try {
      const users = app.findRecordsByFilter('users', 'ativo != true', '', 100, 0)
      for (const u of users) {
        u.set('ativo', true)
        app.save(u)
      }
    } catch (e) {
      console.log('Aviso ao atualizar ativo em users:', e)
    }
  },
  () => {},
)
