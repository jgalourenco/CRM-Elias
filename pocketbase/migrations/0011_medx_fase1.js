// Fase 1 — funcionalidades inspiradas no MedX: prontuário, financeiro interno, estoque,
// sessões, cadastros de apoio e configurações. Sem integrações externas.
migrate(
  (app) => {
    const authRule = '@request.auth.id != ""'

    const T = (name, required = false, max = 0) => ({ name, type: 'text', required, max })
    const LT = (name) => ({ name, type: 'text', required: false, max: 100000 })
    const N = (name, required = false) => ({ name, type: 'number', required })
    const B = (name) => ({ name, type: 'bool' })
    const D = (name, required = false) => ({ name, type: 'date', required })
    const J = (name) => ({ name, type: 'json', maxSize: 2000000 })
    const S = (name, values, required = false) => ({
      name,
      type: 'select',
      values,
      maxSelect: 1,
      required,
    })
    const R = (name, collection, required = false, cascadeDelete = false) => ({
      name,
      type: 'relation',
      required,
      collectionId: app.findCollectionByNameOrId(collection).id,
      maxSelect: 1,
      cascadeDelete,
    })
    const F = (name) => ({
      name,
      type: 'file',
      maxSelect: 1,
      maxSize: 15728640,
      required: false,
    })

    const make = (name, fields, indexes = []) => {
      const col = new Collection({
        name,
        type: 'base',
        listRule: authRule,
        viewRule: authRule,
        createRule: authRule,
        updateRule: authRule,
        deleteRule: authRule,
        fields: [
          ...fields,
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes,
      })
      app.save(col)
      return col
    }

    // ------------------------------------------------------------------
    // 1. Campos extras em `pacientes` (ficha completa + notas clínicas)
    // ------------------------------------------------------------------
    const pacientes = app.findCollectionByNameOrId('pacientes')
    const addText = (name) => {
      if (!pacientes.fields.getByName(name)) {
        pacientes.fields.add(new TextField({ name, required: false, max: 5000 }))
      }
    }
    const addBool = (name) => {
      if (!pacientes.fields.getByName(name)) {
        pacientes.fields.add(new BoolField({ name }))
      }
    }
    ;[
      'nome_social',
      'rg',
      'nr_prontuario',
      'tags',
      'tipo',
      'matricula',
      'numero_cns',
      'telefone2',
      'celular',
      'telefone_comercial',
      'contato',
      'regiao',
      'empresa',
      'referencia',
      'conheceu_por',
      'indicado_por',
      'estado_civil',
      'profissao',
      'escolaridade',
      'religiao',
      'pai',
      'mae',
      'acompanhante',
      'conjuge',
      // notas clínicas do prontuário
      'diagnosticos',
      'historia_pregressa',
      'medicamentos_em_uso',
      'alergias_alerta',
      'obs_importantes',
    ].forEach(addText)
    ;['vip', 'excluir_marketing', 'mala_direta'].forEach(addBool)
    if (!pacientes.fields.getByName('filhos')) {
      pacientes.fields.add(new NumberField({ name: 'filhos', required: false }))
    }
    app.save(pacientes)

    // ------------------------------------------------------------------
    // 2. Cadastros de apoio (configurações)
    // ------------------------------------------------------------------
    make('procedimentos', [
      T('nome', true),
      T('categoria'),
      N('preco'),
      N('custo'),
      N('nr_sessoes'),
      N('comissao_pct'),
      B('ativo'),
    ])
    make('tabelas_convenios', [T('nome', true), T('observacoes')])
    make('contas_correntes', [
      T('nome', true),
      S('tipo', ['Caixa', 'Banco', 'Cartão']),
      N('encargos_pct'),
    ])
    make('plano_contas', [T('classificacao', true), T('nome'), S('tipo', ['Receita', 'Despesa'])])
    make('formas_pagamento', [
      T('nome', true),
      N('max_parcelas'),
      N('taxa_adm_pct'),
      B('exige_documento'),
      N('prazo_primeira_parcela'),
    ])
    make('unidades', [
      T('nome', true),
      T('razao_social'),
      T('cpf_cnpj'),
      T('cnaes'),
      T('logradouro'),
      T('cidade'),
      T('uf'),
      B('ativo'),
    ])
    make('setores_agenda', [T('nome', true), T('ddd'), T('telefone')])
    make('tipos_agendamento', [T('nome', true), N('duracao_min'), T('cor')])
    make('farmacias', [
      T('nome', true),
      T('email'),
      T('telefone'),
      T('telefone2'),
      T('celular'),
    ])
    make('catalogo_exames', [
      T('nome', true),
      T('grupo'),
      N('peso'),
      N('volume'),
      N('min_m'),
      N('max_m'),
      N('min_f'),
      N('max_f'),
    ])
    make('alimentos', [
      T('nome', true),
      T('apresentacao'),
      N('kcal'),
      N('gramas'),
      N('carboidratos'),
      N('proteinas'),
      N('gorduras'),
      N('fibras'),
    ])
    make('modelos_documentos', [
      T('titulo', true),
      T('pasta'),
      S('tipo', ['Receita', 'Exame', 'Atestado', 'Outro']),
      LT('conteudo'),
    ])
    make('cabecalhos_rodapes', [
      T('nome', true),
      LT('cabecalho'),
      LT('rodape'),
      N('margem_topo'),
      N('margem_base'),
      B('padrao'),
    ])
    make(
      'parametros',
      [T('chave', true), J('valor')],
      ['CREATE UNIQUE INDEX idx_parametros_chave ON parametros (chave)'],
    )
    make('formularios_anamnese', [T('nome', true), J('estrutura'), B('ativo')])
    make('questionarios_apoio', [T('nome', true), J('perguntas'), B('ativo')])

    // ------------------------------------------------------------------
    // 3. Estoque, sessões e financeiro
    // ------------------------------------------------------------------
    make('estoque_itens', [
      T('nome', true),
      T('apresentacao'),
      T('unidade'),
      N('saldo'),
      N('minimo'),
      B('oculto'),
    ])
    make(
      'estoque_movimentos',
      [
        R('item_id', 'estoque_itens', true, true),
        S('tipo', ['Entrada', 'Saída', 'Ajuste'], true),
        N('quantidade', true),
        D('data'),
        T('motivo'),
      ],
      ['CREATE INDEX idx_estoque_mov_item ON estoque_movimentos (item_id)'],
    )
    make(
      'sessoes_venda',
      [
        R('paciente_id', 'pacientes', true, true),
        R('procedimento_id', 'procedimentos'),
        T('procedimento_nome'),
        D('data_venda'),
        N('quantidade'),
        N('realizadas'),
        B('concluida'),
      ],
      ['CREATE INDEX idx_sessoes_paciente ON sessoes_venda (paciente_id)'],
    )
    make(
      'faturas',
      [
        R('paciente_id', 'pacientes', true),
        D('data', true),
        N('valor'),
        R('forma_pagamento_id', 'formas_pagamento'),
        T('tabela'),
        T('unidade'),
        T('guia_nr'),
        T('nf'),
        T('recibo'),
        B('fechado'),
        S('status', ['Fatura', 'Paga', 'Pendência', 'Cancelada']),
        T('observacoes'),
        J('itens'),
      ],
      [
        'CREATE INDEX idx_faturas_paciente ON faturas (paciente_id)',
        'CREATE INDEX idx_faturas_data ON faturas (data)',
      ],
    )
    make(
      'contas_lancamentos',
      [
        S('natureza', ['Receber', 'Pagar'], true),
        T('descricao', true),
        D('vencimento', true),
        N('valor'),
        N('pago'),
        R('conta_id', 'contas_correntes'),
        R('classificacao_id', 'plano_contas'),
        T('unidade'),
        T('nr_controle'),
      ],
      ['CREATE INDEX idx_contas_lanc_venc ON contas_lancamentos (vencimento)'],
    )

    // ------------------------------------------------------------------
    // 4. Prontuário
    // ------------------------------------------------------------------
    make(
      'prontuario_evolucoes',
      [
        R('paciente_id', 'pacientes', true, true),
        D('data'),
        LT('texto'),
        T('profissional'),
        S('tipo', ['Evolução', 'Anamnese', 'Orientação']),
      ],
      ['CREATE INDEX idx_evolucoes_paciente ON prontuario_evolucoes (paciente_id)'],
    )
    make(
      'paciente_documentos',
      [
        R('paciente_id', 'pacientes', true, true),
        T('titulo', true),
        S('tipo', ['Receita', 'Exame', 'Solicitação', 'Resultado', 'Atestado', 'Outro']),
        D('data'),
        F('arquivo'),
        T('observacoes'),
      ],
      ['CREATE INDEX idx_pac_docs_paciente ON paciente_documentos (paciente_id)'],
    )
    make('questionarios_respostas', [
      R('paciente_id', 'pacientes', true, true),
      R('questionario_id', 'questionarios_apoio'),
      T('questionario_nome'),
      J('respostas'),
      N('pontuacao'),
      D('data'),
    ])
    make('pesquisas_qualidade', [
      R('paciente_id', 'pacientes'),
      D('data'),
      J('notas'),
      T('comentario'),
    ])

    // ------------------------------------------------------------------
    // 5. Auditoria e uso de IA (contrato; sem integração real)
    // ------------------------------------------------------------------
    make('auditoria_eventos', [
      T('modulo'),
      T('acao'),
      T('usuario'),
      T('descricao'),
      D('data'),
    ])
    make('ia_extrato', [D('data'), T('area'), LT('pergunta'), LT('resposta')])

    // ------------------------------------------------------------------
    // 6. Dados iniciais
    // ------------------------------------------------------------------
    const seed = (name, rows) => {
      const col = app.findCollectionByNameOrId(name)
      for (const row of rows) {
        const r = new Record(col)
        for (const [k, v] of Object.entries(row)) r.set(k, v)
        app.save(r)
      }
    }
    seed('formas_pagamento', [
      { nome: 'Dinheiro', max_parcelas: 1, taxa_adm_pct: 0, exige_documento: false, prazo_primeira_parcela: 0 },
      { nome: 'PIX', max_parcelas: 1, taxa_adm_pct: 0, exige_documento: false, prazo_primeira_parcela: 0 },
      { nome: 'Cartão de débito', max_parcelas: 1, taxa_adm_pct: 1.5, exige_documento: false, prazo_primeira_parcela: 1 },
      { nome: 'Cartão de crédito', max_parcelas: 12, taxa_adm_pct: 3.5, exige_documento: false, prazo_primeira_parcela: 30 },
      { nome: 'Boleto', max_parcelas: 12, taxa_adm_pct: 0, exige_documento: true, prazo_primeira_parcela: 30 },
      { nome: 'Cheque', max_parcelas: 6, taxa_adm_pct: 0, exige_documento: true, prazo_primeira_parcela: 30 },
    ])
    seed('contas_correntes', [{ nome: 'Caixa da clínica', tipo: 'Caixa', encargos_pct: 0 }])
    seed('plano_contas', [
      { classificacao: '1.01', nome: 'Consultas e retornos', tipo: 'Receita' },
      { classificacao: '1.02', nome: 'Aplicações e procedimentos', tipo: 'Receita' },
      { classificacao: '1.03', nome: 'Manipulados', tipo: 'Receita' },
      { classificacao: '2.01', nome: 'Aluguel e condomínio', tipo: 'Despesa' },
      { classificacao: '2.02', nome: 'Insumos e estoque', tipo: 'Despesa' },
      { classificacao: '2.03', nome: 'Pessoal', tipo: 'Despesa' },
    ])
    seed('unidades', [{ nome: 'Matriz', razao_social: 'Clínica Elias Mansur', ativo: true }])
    seed('parametros', [
      {
        chave: 'agenda',
        valor: { horario_inicio: '07:00', horario_fim: '19:00', intervalo_min: 30 },
      },
      {
        chave: 'clinica',
        valor: { nome: 'Clínica Elias Mansur', pais: 'Brasil', ddd: '', telefone: '', email: '' },
      },
      {
        chave: 'cores_agenda',
        valor: {
          Agendado: { nome: 'Agendado', cor: '#2E7FA3' },
          Confirmado: { nome: 'Confirmado', cor: '#166A5A' },
          Chegou: { nome: 'Compareceu', cor: '#C9A227' },
          Em_atendimento: { nome: 'Iniciado atendimento', cor: '#7C3AED' },
          Realizado: { nome: 'Realizado', cor: '#16A34A' },
          No_show: { nome: 'Não compareceu', cor: '#C0392B' },
          Cancelado: { nome: 'Desmarcado', cor: '#9AA8A5' },
        },
      },
    ])
    seed('formularios_anamnese', [
      {
        nome: 'Anamnese padrão',
        ativo: true,
        estrutura: [
          { id: 'a1', tipo: 'titulo', rotulo: 'Queixa e história' },
          { id: 'a2', tipo: 'caixa_texto', rotulo: 'Queixa principal' },
          { id: 'a3', tipo: 'caixa_texto', rotulo: 'Doença atual' },
          { id: 'a4', tipo: 'caixa_texto', rotulo: 'Medicamentos em uso' },
          { id: 'a5', tipo: 'caixa_texto', rotulo: 'Alergias a medicamentos, alimentos e ambiente' },
        ],
      },
    ])
  },
  (app) => {
    const names = [
      'ia_extrato',
      'auditoria_eventos',
      'pesquisas_qualidade',
      'questionarios_respostas',
      'paciente_documentos',
      'prontuario_evolucoes',
      'contas_lancamentos',
      'faturas',
      'sessoes_venda',
      'estoque_movimentos',
      'estoque_itens',
      'questionarios_apoio',
      'formularios_anamnese',
      'parametros',
      'cabecalhos_rodapes',
      'modelos_documentos',
      'alimentos',
      'catalogo_exames',
      'farmacias',
      'tipos_agendamento',
      'setores_agenda',
      'unidades',
      'formas_pagamento',
      'plano_contas',
      'contas_correntes',
      'tabelas_convenios',
      'procedimentos',
    ]
    for (const n of names) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (_) {}
    }
    try {
      const pacientes = app.findCollectionByNameOrId('pacientes')
      ;[
        'nome_social', 'rg', 'nr_prontuario', 'tags', 'tipo', 'matricula', 'numero_cns',
        'telefone2', 'celular', 'telefone_comercial', 'contato', 'regiao', 'empresa',
        'referencia', 'conheceu_por', 'indicado_por', 'estado_civil', 'profissao',
        'escolaridade', 'religiao', 'pai', 'mae', 'acompanhante', 'conjuge', 'diagnosticos',
        'historia_pregressa', 'medicamentos_em_uso', 'alergias_alerta', 'obs_importantes',
        'vip', 'excluir_marketing', 'mala_direta', 'filhos',
      ].forEach((f) => pacientes.fields.removeByName(f))
      app.save(pacientes)
    } catch (_) {}
  },
)
