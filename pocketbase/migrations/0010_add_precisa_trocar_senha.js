migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo precisa_trocar_senha (bool opcional)
    // NÃO deve ser required para não quebrar usuários existentes nem requerer true
    if (!usersCol.fields.getByName('precisa_trocar_senha')) {
      usersCol.fields.add(new BoolField({ name: 'precisa_trocar_senha' }))
    }

    // 2. Garantir opções do papel (Administrador, Gestor, Profissional, Visitante)
    // mantendo compatibilidade legada
    const papelField = usersCol.fields.getByName('papel')
    if (papelField) {
      papelField.values = [
        'Administrador',
        'Gestor',
        'Profissional',
        'Visitante',
        'Gestor/Recepção',
        'Profissional/Saúde',
        'Visualização',
        'Recepção',
        'Financeiro',
      ]
      papelField.maxSelect = 1
    }

    // 3. Regras de acesso da coleção users:
    // list/view: qualquer usuário autenticado
    // create: apenas Administrador
    // update: Administrador OU o próprio usuário (mas usuário comum não pode alterar seu papel, nem ativo, nem precisa_trocar_senha)
    // delete: apenas Administrador
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"
    usersCol.updateRule =
      "@request.auth.id != '' && (@request.auth.papel = 'Administrador' || (id = @request.auth.id && @request.body.papel:changed = false && @request.body.ativo:changed = false && @request.body.precisa_trocar_senha:changed = false))"
    usersCol.deleteRule = "@request.auth.id != '' && @request.auth.papel = 'Administrador'"

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('precisa_trocar_senha')) {
        usersCol.fields.removeByName('precisa_trocar_senha')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
