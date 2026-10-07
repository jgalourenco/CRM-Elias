migrate(
  (app) => {
    // 1. Atualizar collection `atendimentos` com novos status e campos de horário de atendimento
    const atendimentosCol = app.findCollectionByNameOrId('atendimentos')
    const statusField = atendimentosCol.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'Agendado',
        'Confirmado',
        'Chegou',
        'Em_atendimento',
        'Realizado',
        'No_show',
        'Cancelado',
      ]
      statusField.maxSelect = 1
    }

    if (!atendimentosCol.fields.getByName('hora_chegada')) {
      atendimentosCol.fields.add(new DateField({ name: 'hora_chegada', required: false }))
    }

    if (!atendimentosCol.fields.getByName('hora_inicio_atendimento')) {
      atendimentosCol.fields.add(
        new DateField({ name: 'hora_inicio_atendimento', required: false }),
      )
    }

    if (!atendimentosCol.fields.getByName('hora_fim_atendimento')) {
      atendimentosCol.fields.add(new DateField({ name: 'hora_fim_atendimento', required: false }))
    }

    app.save(atendimentosCol)

    // 2. Criar collection `notas` para notas/lembretes rápidos por usuário
    const notas = new Collection({
      name: 'notas',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'usuario_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'memo', type: 'text', required: true },
        { name: 'concluido', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notas_usuario ON notas (usuario_id)',
        'CREATE INDEX idx_notas_data ON notas (data)',
        'CREATE INDEX idx_notas_concluido ON notas (concluido)',
      ],
    })
    app.save(notas)

    // 3. Seed de notas de exemplo
    try {
      const today = new Date()
      const dOntem = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString()
      const dHoje = new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString()
      const dAmanha = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()

      // Buscar primeiro usuário se houver para associar
      let userId = ''
      try {
        const u = app.findFirstRecordByData('users', 'email', 'jgalourenco@hotmail.com')
        userId = u.id
      } catch (_) {}

      const sampleNotas = [
        {
          memo: 'Ligar para farmácia de manipulação sobre fórmula da Mariana Costa',
          data: dOntem,
          concluido: false,
        },
        {
          memo: 'Revisar exames laboratoriais do protocolo APP antes da consulta das 15h',
          data: dHoje,
          concluido: false,
        },
        {
          memo: 'Confirmar reposição do estoque de ampolas mitocondriais para sexta',
          data: dAmanha,
          concluido: false,
        },
      ]

      for (const item of sampleNotas) {
        const r = new Record(notas)
        r.set('memo', item.memo)
        r.set('data', item.data)
        r.set('concluido', item.concluido)
        if (userId) {
          r.set('usuario_id', userId)
        }
        app.save(r)
      }
    } catch (err) {
      console.log('Erro ao criar seed de notas:', err)
    }
  },
  (app) => {
    try {
      const notas = app.findCollectionByNameOrId('notas')
      app.delete(notas)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('atendimentos')
      const fieldsToRemove = ['hora_chegada', 'hora_inicio_atendimento', 'hora_fim_atendimento']
      for (const f of fieldsToRemove) {
        if (col.fields.getByName(f)) {
          col.fields.removeByName(f)
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
