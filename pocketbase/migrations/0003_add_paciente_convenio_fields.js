migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pacientes')

    // Garantir que telefone não seja obrigatório
    const telefoneField = col.fields.getByName('telefone')
    if (telefoneField) {
      telefoneField.required = false
    }

    // Adicionar id_cliente se não existir
    if (!col.fields.getByName('id_cliente')) {
      col.fields.add(new TextField({ name: 'id_cliente', required: false }))
    }

    // Adicionar id_assinatura se não existir
    if (!col.fields.getByName('id_assinatura')) {
      col.fields.add(new TextField({ name: 'id_assinatura', required: false }))
    }

    // Adicionar id_convenio se não existir
    if (!col.fields.getByName('id_convenio')) {
      col.fields.add(new TextField({ name: 'id_convenio', required: false }))
    }

    // Adicionar convenio se não existir
    if (!col.fields.getByName('convenio')) {
      col.fields.add(new TextField({ name: 'convenio', required: false }))
    }

    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pacientes')
      const fieldsToRemove = ['id_cliente', 'id_assinatura', 'id_convenio', 'convenio']
      for (const f of fieldsToRemove) {
        const field = col.fields.getByName(f)
        if (field) {
          col.fields.removeByName(f)
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
