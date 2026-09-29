migrate(
  (app) => {
    // 1. pacotes (needed first because pacientes references pacotes)
    const pacotes = new Collection({
      name: 'pacotes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo_aplicacao',
          type: 'select',
          required: true,
          values: ['APP', 'APP_AV'],
          maxSelect: 1,
        },
        { name: 'quantidade_aplicacoes', type: 'number', required: true, onlyInt: true },
        { name: 'valor_total', type: 'number', required: true },
        { name: 'valor_por_aplicacao', type: 'number', required: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pacotes)
    const pacotesId = pacotes.id

    // 2. pacientes
    const pacientes = new Collection({
      name: 'pacientes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'cpf', type: 'text' },
        { name: 'data_nascimento', type: 'date' },
        { name: 'sexo', type: 'select', values: ['Feminino', 'Masculino', 'Outro'], maxSelect: 1 },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'text' },
        { name: 'cep', type: 'text' },
        { name: 'logradouro', type: 'text' },
        { name: 'numero', type: 'text' },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'anamnese', type: 'json' },
        {
          name: 'fase',
          type: 'select',
          values: [
            'Prospeccao',
            'Primeira_consulta',
            'Ativo',
            'Em_acompanhamento',
            'Concluido',
            'Inativo',
          ],
          maxSelect: 1,
        },
        { name: 'pacote_atual_id', type: 'relation', collectionId: pacotesId, maxSelect: 1 },
        { name: 'aplicacoes_restantes', type: 'number' },
        { name: 'ltv', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pacientes_fase ON pacientes (fase)'],
    })
    app.save(pacientes)
    const pacientesId = pacientes.id

    // 3. prospeccoes
    const prospeccoes = new Collection({
      name: 'prospeccoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'canal',
          type: 'select',
          values: ['WhatsApp', 'Instagram', 'Telefone', 'Email', 'Indicacao'],
          maxSelect: 1,
        },
        { name: 'prioridade', type: 'select', values: ['alta', 'media', 'baixa'], maxSelect: 1 },
        {
          name: 'etapa',
          type: 'select',
          values: ['primeiro_contato', 'proposta', 'comparacao', 'recomendacao', 'fechamento'],
          maxSelect: 1,
        },
        { name: 'data_proximo_contato', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prospeccoes_etapa ON prospeccoes (etapa)',
        'CREATE INDEX idx_prospeccoes_paciente ON prospeccoes (paciente_id)',
      ],
    })
    app.save(prospeccoes)

    // 4. atendimentos
    const atendimentos = new Collection({
      name: 'atendimentos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'Consulta',
            'Retorno',
            'Aplicacao_APP',
            'Aplicacao_APP_AV',
            'Aplicacao_Manipulado',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'profissional', type: 'text' },
        { name: 'data_hora', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['Agendado', 'Realizado', 'No_show', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_atendimentos_data_hora ON atendimentos (data_hora)',
        'CREATE INDEX idx_atendimentos_paciente ON atendimentos (paciente_id)',
        'CREATE INDEX idx_atendimentos_status ON atendimentos (status)',
      ],
    })
    app.save(atendimentos)

    // 5. lancamentos
    const lancamentos = new Collection({
      name: 'lancamentos',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'Consulta',
            'Retorno',
            'Manipulado',
            'Aplicacao_APP',
            'Aplicacao_APP_AV',
            'Pacote',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        { name: 'status', type: 'select', values: ['Pago', 'Pendente', 'Cancelado'], maxSelect: 1 },
        { name: 'data', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lancamentos_paciente ON lancamentos (paciente_id)',
        'CREATE INDEX idx_lancamentos_status ON lancamentos (status)',
        'CREATE INDEX idx_lancamentos_data ON lancamentos (data)',
      ],
    })
    app.save(lancamentos)

    // 6. medx_importacoes
    const medxImportacoes = new Collection({
      name: 'medx_importacoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome_arquivo', type: 'text' },
        { name: 'total_registros', type: 'number' },
        { name: 'importados', type: 'number' },
        { name: 'erros', type: 'number' },
        { name: 'log_erros', type: 'json' },
        { name: 'criado_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(medxImportacoes)

    // 7. mensagens
    const mensagens = new Collection({
      name: 'mensagens',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['WhatsApp', 'Email'],
          maxSelect: 1,
        },
        {
          name: 'direcao',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'template', type: 'text' },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['enviada', 'pendente', 'falhou'], maxSelect: 1 },
        { name: 'lida', type: 'bool' },
        { name: 'agendada_para', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mensagens_paciente ON mensagens (paciente_id)',
        'CREATE INDEX idx_mensagens_canal ON mensagens (canal)',
        'CREATE INDEX idx_mensagens_lida ON mensagens (lida)',
      ],
    })
    app.save(mensagens)

    // 8. automacoes
    const automacoes = new Collection({
      name: 'automacoes',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'fase_roadmap',
          type: 'select',
          required: true,
          values: [
            'Prospeccao',
            'Primeira_consulta',
            'Retorno',
            'Manipulado',
            'Aplicacao_APP',
            'Aplicacao_APP_AV',
            'D1',
            'NF',
            'No_show',
            'LTV',
          ],
          maxSelect: 1,
        },
        {
          name: 'canal',
          type: 'select',
          required: true,
          values: ['WhatsApp', 'Email'],
          maxSelect: 1,
        },
        { name: 'template', type: 'text', required: true },
        { name: 'gatilho', type: 'text', required: true },
        { name: 'atraso_minutos', type: 'number' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(automacoes)

    // Add role field to users collection if not present
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (!usersCol.fields.getByName('papel')) {
        usersCol.fields.add(
          new SelectField({
            name: 'papel',
            values: ['Administrador', 'Recepção', 'Financeiro'],
            maxSelect: 1,
          }),
        )
        app.save(usersCol)
      }
    } catch (e) {
      console.log('Error updating users collection with papel:', e)
    }
  },
  (app) => {
    const toDelete = [
      'automacoes',
      'mensagens',
      'medx_importacoes',
      'lancamentos',
      'atendimentos',
      'prospeccoes',
      'pacientes',
      'pacotes',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
