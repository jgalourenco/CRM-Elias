// Fase 2 — liga os cadastros ao uso: agenda (tipo/setor/duração), insumos por procedimento,
// sessões geradas por fatura e histórico de baixas/estornos em contas a pagar/receber.
migrate(
  (app) => {
    const authRule = '@request.auth.id != ""'

    // 1. atendimentos: tipo/setor/duração vindos dos cadastros
    const atendimentos = app.findCollectionByNameOrId('atendimentos')
    const tipos = app.findCollectionByNameOrId('tipos_agendamento')
    const setores = app.findCollectionByNameOrId('setores_agenda')
    if (!atendimentos.fields.getByName('tipo_agendamento_id')) {
      atendimentos.fields.add(
        new RelationField({
          name: 'tipo_agendamento_id',
          collectionId: tipos.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    if (!atendimentos.fields.getByName('setor_id')) {
      atendimentos.fields.add(
        new RelationField({
          name: 'setor_id',
          collectionId: setores.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    if (!atendimentos.fields.getByName('duracao_min')) {
      atendimentos.fields.add(new NumberField({ name: 'duracao_min', required: false }))
    }
    app.save(atendimentos)

    // 2. sessoes_venda: origem na fatura
    const sessoes = app.findCollectionByNameOrId('sessoes_venda')
    const faturas = app.findCollectionByNameOrId('faturas')
    if (!sessoes.fields.getByName('fatura_id')) {
      sessoes.fields.add(
        new RelationField({
          name: 'fatura_id',
          collectionId: faturas.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }
    app.save(sessoes)

    // 3. contas_lancamentos: histórico de baixas e estornos
    const lanc = app.findCollectionByNameOrId('contas_lancamentos')
    if (!lanc.fields.getByName('pagamentos')) {
      lanc.fields.add(new JSONField({ name: 'pagamentos', maxSize: 2000000 }))
    }
    app.save(lanc)

    // 4. estoque_movimentos: rastreabilidade da origem (ex.: "sessao:<id>")
    const mov = app.findCollectionByNameOrId('estoque_movimentos')
    if (!mov.fields.getByName('origem')) {
      mov.fields.add(new TextField({ name: 'origem', required: false }))
    }
    app.save(mov)

    // 5. procedimento_insumos: itens de estoque consumidos por sessão de cada procedimento
    const procedimentos = app.findCollectionByNameOrId('procedimentos')
    const itens = app.findCollectionByNameOrId('estoque_itens')
    const insumos = new Collection({
      name: 'procedimento_insumos',
      type: 'base',
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        {
          name: 'procedimento_id',
          type: 'relation',
          required: true,
          collectionId: procedimentos.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'quantidade', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_proc_insumos_proc ON procedimento_insumos (procedimento_id)',
      ],
    })
    app.save(insumos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('procedimento_insumos'))
    } catch (_) {}
    const drop = (collection, fields) => {
      try {
        const col = app.findCollectionByNameOrId(collection)
        fields.forEach((f) => col.fields.removeByName(f))
        app.save(col)
      } catch (_) {}
    }
    drop('estoque_movimentos', ['origem'])
    drop('contas_lancamentos', ['pagamentos'])
    drop('sessoes_venda', ['fatura_id'])
    drop('atendimentos', ['tipo_agendamento_id', 'setor_id', 'duracao_min'])
  },
)
