migrate(
  (app) => {
    const pacientesCol = app.findCollectionByNameOrId('pacientes')

    // 1. Criar collection `exames_laboratoriais`
    const exames = new Collection({
      name: 'exames_laboratoriais',
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
          collectionId: pacientesCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'nome_exame', type: 'text', required: true },
        { name: 'resultado', type: 'text', required: true },
        { name: 'unidade', type: 'text', required: false },
        { name: 'valor_referencia', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['Normal', 'Alterado', 'Atenção'],
          maxSelect: 1,
          required: false,
        },
        { name: 'laboratorio', type: 'text', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_exames_paciente ON exames_laboratoriais (paciente_id)',
        'CREATE INDEX idx_exames_data ON exames_laboratoriais (data)',
        'CREATE INDEX idx_exames_status ON exames_laboratoriais (status)',
      ],
    })
    app.save(exames)

    // 2. Seed de dados de exemplo para demonstração clínica
    try {
      const maria = app.findFirstRecordByData('pacientes', 'nome', 'Maria Fernanda Costa')
      const carlos = app.findFirstRecordByData('pacientes', 'nome', 'Carlos Eduardo Lima')

      const sampleExames = [
        {
          paciente_id: maria.id,
          data: '2026-09-15 08:30:00.000Z',
          nome_exame: 'Vitamina D (25-OH)',
          resultado: '48.2',
          unidade: 'ng/mL',
          valor_referencia: '30.0 a 60.0 ng/mL',
          status: 'Normal',
          laboratorio: 'Fleury',
          observacoes: 'Excelente nível após protocolo suplementar',
        },
        {
          paciente_id: maria.id,
          data: '2026-09-15 08:30:00.000Z',
          nome_exame: 'Ferritina Sérica',
          resultado: '85.4',
          unidade: 'ng/mL',
          valor_referencia: '10.0 a 120.0 ng/mL',
          status: 'Normal',
          laboratorio: 'Fleury',
          observacoes: 'Estável com aporte nutricional adequado',
        },
        {
          paciente_id: maria.id,
          data: '2026-09-15 08:30:00.000Z',
          nome_exame: 'TSH Ultra Sensível',
          resultado: '2.14',
          unidade: 'mUI/L',
          valor_referencia: '0.40 a 4.50 mUI/L',
          status: 'Normal',
          laboratorio: 'Fleury',
          observacoes: 'Eutireoidismo sob medicação',
        },
        {
          paciente_id: maria.id,
          data: '2026-05-10 08:00:00.000Z',
          nome_exame: 'Vitamina D (25-OH)',
          resultado: '22.0',
          unidade: 'ng/mL',
          valor_referencia: '30.0 a 60.0 ng/mL',
          status: 'Alterado',
          laboratorio: 'Fleury',
          observacoes: 'Hipovitaminose pré-tratamento',
        },
        {
          paciente_id: carlos.id,
          data: '2026-09-20 09:00:00.000Z',
          nome_exame: 'Testosterona Total',
          resultado: '640',
          unidade: 'ng/dL',
          valor_referencia: '240 a 870 ng/dL',
          status: 'Normal',
          laboratorio: 'Dasa',
          observacoes: 'Perfil androgênico equilibrado para atleta',
        },
        {
          paciente_id: carlos.id,
          data: '2026-09-20 09:00:00.000Z',
          nome_exame: 'Creatinina Sérica',
          resultado: '1.05',
          unidade: 'mg/dL',
          valor_referencia: '0.70 a 1.20 mg/dL',
          status: 'Normal',
          laboratorio: 'Dasa',
          observacoes: 'Função renal preservada com suplementação de creatina',
        },
        {
          paciente_id: carlos.id,
          data: '2026-09-20 09:00:00.000Z',
          nome_exame: 'Proteína C Reativa (PCR-us)',
          resultado: '0.8',
          unidade: 'mg/L',
          valor_referencia: '< 1.0 mg/L',
          status: 'Normal',
          laboratorio: 'Dasa',
          observacoes: 'Sem marcadores inflamatórios agudos',
        },
      ]

      for (const item of sampleExames) {
        const r = new Record(exames)
        r.set('paciente_id', item.paciente_id)
        r.set('data', item.data)
        r.set('nome_exame', item.nome_exame)
        r.set('resultado', item.resultado)
        r.set('unidade', item.unidade)
        r.set('valor_referencia', item.valor_referencia)
        r.set('status', item.status)
        r.set('laboratorio', item.laboratorio)
        r.set('observacoes', item.observacoes)
        app.save(r)
      }
    } catch (err) {
      console.log('Aviso ao popular exames de exemplo:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('exames_laboratoriais')
      app.delete(col)
    } catch (_) {}
  },
)
