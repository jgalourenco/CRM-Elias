migrate(
  (app) => {
    // 1. Atualizar campos da coleção users para novos papéis e campo ativo
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Campo papel: expandir valores
    const papelField = usersCol.fields.getByName('papel')
    if (papelField) {
      papelField.values = [
        'Administrador',
        'Gestor/Recepção',
        'Profissional/Saúde',
        'Visualização',
        // mantendo compatibilidade com valores legados caso algum exista no banco
        'Recepção',
        'Financeiro',
      ]
      papelField.maxSelect = 1
    }

    // Campo ativo: bool (opcional, default true para não travar login)
    if (!usersCol.fields.getByName('ativo')) {
      usersCol.fields.add(new BoolField({ name: 'ativo' }))
    }

    // Regras de acesso da coleção users:
    // list/view: qualquer usuário autenticado pode listar a equipe
    // create: apenas Administrador pode criar usuários
    // update: Administrador OU o próprio usuário (mas usuário não pode alterar seu papel nem ativo)
    // delete: apenas Administrador
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"
    usersCol.updateRule =
      "@request.auth.id != '' && (@request.auth.papel = 'Administrador' || (id = @request.auth.id && @request.body.papel:changed = false && @request.body.ativo:changed = false))"
    usersCol.deleteRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"

    app.save(usersCol)

    // Atualizar usuários existentes para garantir que estão com ativo = true
    // e converter papel legado "Recepção" -> "Gestor/Recepção" se desejado, mantendo Admins
    try {
      app.db().newQuery("UPDATE users SET ativo = 1 WHERE ativo IS NULL").execute()
      app.db().newQuery("UPDATE users SET papel = 'Gestor/Recepção' WHERE papel = 'Recepção'").execute()
      app.db().newQuery("UPDATE users SET papel = 'Administrador' WHERE papel = 'Financeiro'").execute()
    } catch (e) {
      console.log('Aviso ao normalizar users:', e)
    }

    // 2. Expandir coleção medx_importacoes com campos adicionais de auditoria do histórico
    const impCol = app.findCollectionByNameOrId('medx_importacoes')
    if (!impCol.fields.getByName('status')) {
      impCol.fields.add(
        new SelectField({
          name: 'status',
          values: ['concluida', 'com_erro'],
          maxSelect: 1,
        }),
      )
    }
    if (!impCol.fields.getByName('tipo')) {
      impCol.fields.add(new TextField({ name: 'tipo' }))
    }
    if (!impCol.fields.getByName('usuario_nome')) {
      impCol.fields.add(new TextField({ name: 'usuario_nome' }))
    }

    // Permitir listagem/criação por usuários autenticados
    impCol.listRule = "@request.auth.id != ''"
    impCol.viewRule = "@request.auth.id != ''"
    impCol.createRule = "@request.auth.id != ''"
    impCol.updateRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"
    impCol.deleteRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"

    app.save(impCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('ativo')) {
        usersCol.fields.removeByName('ativo')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
