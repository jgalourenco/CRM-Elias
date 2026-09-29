migrate(
  (app) => {
    // 1. Seed user jgalourenco@hotmail.com / Skip@Pass
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userAdmin
    try {
      userAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'jgalourenco@hotmail.com')
    } catch (_) {
      userAdmin = new Record(users)
      userAdmin.setEmail('jgalourenco@hotmail.com')
      userAdmin.setPassword('Skip@Pass')
      userAdmin.setVerified(true)
      userAdmin.set('name', 'Dr. Lourenço')
      try {
        userAdmin.set('papel', 'Administrador')
      } catch (_) {}
      app.save(userAdmin)
    }

    // 2. Seed 3 Pacotes
    const pacotesCol = app.findCollectionByNameOrId('pacotes')

    let pacote1APP
    try {
      pacote1APP = app.findFirstRecordByData('pacotes', 'nome', 'Pacote 1x APP')
    } catch (_) {
      pacote1APP = new Record(pacotesCol)
      pacote1APP.set('nome', 'Pacote 1x APP')
      pacote1APP.set('tipo_aplicacao', 'APP')
      pacote1APP.set('quantidade_aplicacoes', 1)
      pacote1APP.set('valor_total', 380)
      pacote1APP.set('valor_por_aplicacao', 380)
      pacote1APP.set('ativo', true)
      app.save(pacote1APP)
    }

    let pacote4APP
    try {
      pacote4APP = app.findFirstRecordByData('pacotes', 'nome', 'Pacote 4x APP')
    } catch (_) {
      pacote4APP = new Record(pacotesCol)
      pacote4APP.set('nome', 'Pacote 4x APP')
      pacote4APP.set('tipo_aplicacao', 'APP')
      pacote4APP.set('quantidade_aplicacoes', 4)
      pacote4APP.set('valor_total', 1280)
      pacote4APP.set('valor_por_aplicacao', 320)
      pacote4APP.set('ativo', true)
      app.save(pacote4APP)
    }

    let pacote4APPAV
    try {
      pacote4APPAV = app.findFirstRecordByData('pacotes', 'nome', 'Pacote 4x APP+AV')
    } catch (_) {
      pacote4APPAV = new Record(pacotesCol)
      pacote4APPAV.set('nome', 'Pacote 4x APP+AV')
      pacote4APPAV.set('tipo_aplicacao', 'APP_AV')
      pacote4APPAV.set('quantidade_aplicacoes', 4)
      pacote4APPAV.set('valor_total', 1680)
      pacote4APPAV.set('valor_por_aplicacao', 420)
      pacote4APPAV.set('ativo', true)
      app.save(pacote4APPAV)
    }

    // 3. Seed 19 Automações
    const automacoesCol = app.findCollectionByNameOrId('automacoes')
    const automacoesList = [
      {
        nome: 'Boas-vindas — primeiro contato',
        fase_roadmap: 'Prospeccao',
        canal: 'WhatsApp',
        gatilho: 'Nova prospecção criada',
        atraso_minutos: 0,
        template:
          'Olá {nome}! Seja bem-vindo(a) à Clínica Seleta. Estamos à disposição para agendar sua consulta. 😊',
      },
      {
        nome: 'Aguardando resposta',
        fase_roadmap: 'Prospeccao',
        canal: 'WhatsApp',
        gatilho: '2 dias sem resposta na fase Prospecção',
        atraso_minutos: 2880,
        template:
          'Olá {nome}, tudo bem? Notamos que ainda não concluímos seu agendamento. Gostaria de reservar um horário conosco?',
      },
      {
        nome: 'Reengajamento final',
        fase_roadmap: 'Prospeccao',
        canal: 'Email',
        gatilho: '5 dias sem resposta após boas-vindas',
        atraso_minutos: 7200,
        template:
          'Olá {nome}, sou da equipe da Clínica Seleta. Por aqui para oferecer uma avaliação personalizada de medicina integrativa. Podemos conversar?',
      },
      {
        nome: 'Agradecimento pela consulta',
        fase_roadmap: 'Primeira_consulta',
        canal: 'WhatsApp',
        gatilho: 'Consulta concluída (status: realizada)',
        atraso_minutos: 0,
        template:
          'Olá {nome}, obrigado por sua consulta na Clínica Seleta! 🙏 Esperamos que tenha sido uma experiência incrível. Fique atento(a) às recomendações do seu profissional.',
      },
      {
        nome: 'Feedback e próximos passos',
        fase_roadmap: 'Primeira_consulta',
        canal: 'Email',
        gatilho: '1 dia após consulta concluída',
        atraso_minutos: 1440,
        template:
          'Olá {nome}, por gentileza, conte como foi sua experiência em nossa clínica. Responda este e-mail. — Equipe Seleta',
      },
      {
        nome: 'Lembrete de retorno',
        fase_roadmap: 'Retorno',
        canal: 'WhatsApp',
        gatilho: 'Retorno agendado',
        atraso_minutos: 0,
        template:
          'Olá {nome}, lembramos que seu retorno está agendado. Acesse a agenda para confirmar.',
      },
      {
        nome: 'Confirmação de retorno',
        fase_roadmap: 'Retorno',
        canal: 'WhatsApp',
        gatilho: '1 dia antes de retorno agendado',
        atraso_minutos: -1440,
        template:
          'Olá {nome}! Seu retorno é amanhã às {hora}. Confirma sua presença? Responda SIM para confirmar.',
      },
      {
        nome: 'Manipulado pronto para retirada',
        fase_roadmap: 'Manipulado',
        canal: 'WhatsApp',
        gatilho: 'Pedido de manipulado marcado como "pronto"',
        atraso_minutos: 0,
        template:
          'Olá {nome}, seu manipulado está pronto para retirada na Clínica Seleta! 🧪 Venha buscar durante nosso horário de funcionamento.',
      },
      {
        nome: 'Retirada pendente',
        fase_roadmap: 'Manipulado',
        canal: 'Email',
        gatilho: '3 dias após "manipulado pronto" sem retirada',
        atraso_minutos: 4320,
        template:
          'Olá {nome}, seu manipulado aguarda retirada há alguns dias. Por favor, compareça para garantir a validade do produto.',
      },
      {
        nome: 'Lembrete de aplicação APP',
        fase_roadmap: 'Aplicacao_APP',
        canal: 'WhatsApp',
        gatilho: 'Aplicação APP agendada',
        atraso_minutos: 0,
        template: 'Olá {nome}, sua aplicação APP está agendada. Até lá! 💉',
      },
      {
        nome: 'Confirmação de aplicação APP',
        fase_roadmap: 'Aplicacao_APP',
        canal: 'WhatsApp',
        gatilho: '1 dia antes da aplicação APP',
        atraso_minutos: -1440,
        template:
          'Olá {nome}, sua aplicação APP será amanhã às {hora}. Confirma? Responda SIM para confirmar.',
      },
      {
        nome: 'Lembrete de aplicação APP+AV',
        fase_roadmap: 'Aplicacao_APP_AV',
        canal: 'WhatsApp',
        gatilho: 'Aplicação APP+AV agendada',
        atraso_minutos: 0,
        template: 'Olá {nome}, sua aplicação APP+AV está agendada. Até lá! 💉',
      },
      {
        nome: 'Confirmação de aplicação APP+AV',
        fase_roadmap: 'Aplicacao_APP_AV',
        canal: 'WhatsApp',
        gatilho: '1 dia antes da aplicação APP+AV',
        atraso_minutos: -1440,
        template:
          'Olá {nome}, sua aplicação APP+AV será amanhã às {hora}. Confirma? Responda SIM para confirmar.',
      },
      {
        nome: 'Lembrete geral de consulta (D-1)',
        fase_roadmap: 'D1',
        canal: 'WhatsApp',
        gatilho: '1 dia antes de qualquer consulta',
        atraso_minutos: -1440,
        template:
          'Olá {nome}, lembramos que você tem consulta amanhã às {hora} na Clínica Seleta. Confirmando sua presença. 😊',
      },
      {
        nome: 'Envio de nota fiscal',
        fase_roadmap: 'NF',
        canal: 'Email',
        gatilho: 'Lançamento marcado como pago',
        atraso_minutos: 0,
        template:
          'Olá {nome}, segue sua nota fiscal em anexo. Agradecemos a preferência! — Equipe Seleta',
      },
      {
        nome: 'Notifica ausência',
        fase_roadmap: 'No_show',
        canal: 'WhatsApp',
        gatilho: 'Consulta marcada como "Não compareceu"',
        atraso_minutos: 0,
        template:
          'Olá {nome}, notamos sua ausência na consulta de hoje. Estamos à disposição para reagendar. 🙏',
      },
      {
        nome: 'Reagendamento',
        fase_roadmap: 'No_show',
        canal: 'WhatsApp',
        gatilho: '1 dia após no-show',
        atraso_minutos: 1440,
        template:
          'Olá {nome}, gostaria de agendar um novo horário? Temos disponibilidade na agenda. Toque aqui.',
      },
      {
        nome: 'Oferta de programa de fidelidade',
        fase_roadmap: 'LTV',
        canal: 'WhatsApp',
        gatilho: '30 dias após o fim do pacote de aplicações',
        atraso_minutos: 43200,
        template:
          'Olá {nome}, você já participa do Programa de Fidelidade Seleta? Pacientes que mantêm o tratamento contínuo têm condições especiais. Fale conosco!',
      },
      {
        nome: 'Pesquisa de satisfação',
        fase_roadmap: 'LTV',
        canal: 'Email',
        gatilho: '30 dias após fim do pacote',
        atraso_minutos: 43200,
        template:
          'Olá {nome}, prezamos pela sua experiência. Por gentileza, responda à pesquisa de satisfação. Leva menos de 1 minuto. — Equipe Seleta',
      },
    ]

    for (const item of automacoesList) {
      try {
        app.findFirstRecordByData('automacoes', 'nome', item.nome)
      } catch (_) {
        const rec = new Record(automacoesCol)
        rec.set('nome', item.nome)
        rec.set('fase_roadmap', item.fase_roadmap)
        rec.set('canal', item.canal)
        rec.set('gatilho', item.gatilho)
        rec.set('atraso_minutos', item.atraso_minutos)
        rec.set('template', item.template)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // 4. Seed 5 Pacientes
    const pacientesCol = app.findCollectionByNameOrId('pacientes')

    // Maria Fernanda Costa (Ativo, pacote 4x APP, 3 restantes, LTV 1660)
    let p1
    try {
      p1 = app.findFirstRecordByData('pacientes', 'nome', 'Maria Fernanda Costa')
    } catch (_) {
      p1 = new Record(pacientesCol)
      p1.set('nome', 'Maria Fernanda Costa')
      p1.set('cpf', '123.456.789-01')
      p1.set('data_nascimento', '1988-04-12 00:00:00.000Z')
      p1.set('sexo', 'Feminino')
      p1.set('telefone', '(11) 98765-4321')
      p1.set('email', 'maria.fernanda@exemplo.com.br')
      p1.set('cep', '01414-001')
      p1.set('logradouro', 'Rua Oscar Freire')
      p1.set('numero', '1420')
      p1.set('complemento', 'Apto 82')
      p1.set('bairro', 'Cerqueira César')
      p1.set('cidade', 'São Paulo')
      p1.set('uf', 'SP')
      p1.set(
        'observacoes',
        'Paciente em acompanhamento de modulação hormonal integrativa e suporte mitocondrial.',
      )
      p1.set('anamnese', {
        como_chegou: 'Indicação médica',
        indicacao_profissional: 'Dra. Camila Dermatologia',
        comorbidades: ['Hipotireoidismo subclínico', 'Fadiga crônica'],
        alergias: ['Sulfas', 'Dipirona'],
        medicamentos: 'Levotiroxina 50mcg em jejum, CoQ10 100mg',
        objetivos: 'Melhora da disposição física, recuperação muscular e longevidade saudável.',
      })
      p1.set('fase', 'Ativo')
      p1.set('pacote_atual_id', pacote4APP.id)
      p1.set('aplicacoes_restantes', 3)
      p1.set('ltv', 1660)
      app.save(p1)
    }

    // João Pedro Almeida (Prospeccao, canal WhatsApp, etapa proposta)
    let p2
    try {
      p2 = app.findFirstRecordByData('pacientes', 'nome', 'João Pedro Almeida')
    } catch (_) {
      p2 = new Record(pacientesCol)
      p2.set('nome', 'João Pedro Almeida')
      p2.set('cpf', '234.567.890-12')
      p2.set('data_nascimento', '1992-09-25 00:00:00.000Z')
      p2.set('sexo', 'Masculino')
      p2.set('telefone', '(11) 97654-3210')
      p2.set('email', 'joao.pedro.almeida@exemplo.com.br')
      p2.set('cep', '04538-133')
      p2.set('logradouro', 'Rua Joaquim Floriano')
      p2.set('numero', '533')
      p2.set('complemento', 'Sala 402')
      p2.set('bairro', 'Itaim Bibi')
      p2.set('cidade', 'São Paulo')
      p2.set('uf', 'SP')
      p2.set(
        'observacoes',
        'Interessado em protocolo de imunidade e reposição nutricional injetável.',
      )
      p2.set('anamnese', {
        como_chegou: 'Instagram',
        indicacao_profissional: '',
        comorbidades: ['Rinite alérgica'],
        alergias: ['Frutos do mar'],
        medicamentos: 'Nenhum de uso contínuo',
        objetivos: 'Otimização metabólica e aumento da imunidade no inverno.',
      })
      p2.set('fase', 'Prospeccao')
      p2.set('aplicacoes_restantes', 0)
      p2.set('ltv', 0)
      app.save(p2)
    }

    // Ana Beatriz Souza (Em_acompanhamento, retorno agendado)
    let p3
    try {
      p3 = app.findFirstRecordByData('pacientes', 'nome', 'Ana Beatriz Souza')
    } catch (_) {
      p3 = new Record(pacientesCol)
      p3.set('nome', 'Ana Beatriz Souza')
      p3.set('cpf', '345.678.901-23')
      p3.set('data_nascimento', '1985-02-18 00:00:00.000Z')
      p3.set('sexo', 'Feminino')
      p3.set('telefone', '(11) 96543-2109')
      p3.set('email', 'ana.souza.seleta@exemplo.com.br')
      p3.set('cep', '01452-000')
      p3.set('logradouro', 'Avenida Brigadeiro Faria Lima')
      p3.set('numero', '2229')
      p3.set('complemento', 'Cj 110')
      p3.set('bairro', 'Jardim Paulistano')
      p3.set('cidade', 'São Paulo')
      p3.set('uf', 'SP')
      p3.set(
        'observacoes',
        'Excelente resposta ao tratamento de saúde intestinal e reposição de ferro.',
      )
      p3.set('anamnese', {
        como_chegou: 'Google',
        indicacao_profissional: '',
        comorbidades: ['Anemia ferropriva prévia', 'Disbiose'],
        alergias: ['Lactose (intolerância leve)'],
        medicamentos: 'Probióticos manipulados, Vitamina D 5000UI',
        objetivos: 'Manutenção da energia vital e estabilização de exames laboratoriais.',
      })
      p3.set('fase', 'Em_acompanhamento')
      p3.set('aplicacoes_restantes', 0)
      p3.set('ltv', 850)
      app.save(p3)
    }

    // Carlos Eduardo Lima (Ativo, pacote 4x APP+AV, 2 restantes)
    let p4
    try {
      p4 = app.findFirstRecordByData('pacientes', 'nome', 'Carlos Eduardo Lima')
    } catch (_) {
      p4 = new Record(pacientesCol)
      p4.set('nome', 'Carlos Eduardo Lima')
      p4.set('cpf', '456.789.012-34')
      p4.set('data_nascimento', '1979-11-03 00:00:00.000Z')
      p4.set('sexo', 'Masculino')
      p4.set('telefone', '(11) 95432-1098')
      p4.set('email', 'carlos.lima@exemplo.com.br')
      p4.set('cep', '04001-001')
      p4.set('logradouro', 'Rua Domingos de Morais')
      p4.set('numero', '180')
      p4.set('complemento', '')
      p4.set('bairro', 'Vila Mariana')
      p4.set('cidade', 'São Paulo')
      p4.set('uf', 'SP')
      p4.set('observacoes', 'Protocolo atleta: antioxidante venoso + suporte muscular.')
      p4.set('anamnese', {
        como_chegou: 'Indicação de paciente',
        indicacao_profissional: '',
        comorbidades: ['Tendinite patelar bilateral'],
        alergias: ['Penicilina'],
        medicamentos: 'Magnésio Quelato, Creatina 5g, Whey isolado',
        objetivos: 'Performance em triatlo e prevenção de lesões por sobrecarga oxidativa.',
      })
      p4.set('fase', 'Ativo')
      p4.set('pacote_atual_id', pacote4APPAV.id)
      p4.set('aplicacoes_restantes', 2)
      p4.set('ltv', 2180)
      app.save(p4)
    }

    // Juliana Ferreira (Primeira_consulta)
    let p5
    try {
      p5 = app.findFirstRecordByData('pacientes', 'nome', 'Juliana Ferreira')
    } catch (_) {
      p5 = new Record(pacientesCol)
      p5.set('nome', 'Juliana Ferreira')
      p5.set('cpf', '567.890.123-45')
      p5.set('data_nascimento', '1995-07-19 00:00:00.000Z')
      p5.set('sexo', 'Feminino')
      p5.set('telefone', '(11) 94321-0987')
      p5.set('email', 'juliana.ferreira@exemplo.com.br')
      p5.set('cep', '05407-002')
      p5.set('logradouro', 'Rua Teodoro Sampaio')
      p5.set('numero', '1020')
      p5.set('complemento', 'Apto 44')
      p5.set('bairro', 'Pinheiros')
      p5.set('cidade', 'São Paulo')
      p5.set('uf', 'SP')
      p5.set('observacoes', 'Primeira consulta agendada para avaliação global e exames.')
      p5.set('anamnese', {
        como_chegou: 'Instagram',
        indicacao_profissional: '',
        comorbidades: ['Insônia leve', 'Ansiedade situacional'],
        alergias: ['Nenhuma relatada'],
        medicamentos: 'Melatonina 3mg esporádico',
        objetivos: 'Equilíbrio do ciclo circadiano, redução de estresse e bem-estar geral.',
      })
      p5.set('fase', 'Primeira_consulta')
      p5.set('aplicacoes_restantes', 0)
      p5.set('ltv', 500)
      app.save(p5)
    }

    // 5. Seed Prospecções
    const prospeccoesCol = app.findCollectionByNameOrId('prospeccoes')
    try {
      app.findFirstRecordByData('prospeccoes', 'paciente_id', p2.id)
    } catch (_) {
      const prosp = new Record(prospeccoesCol)
      prosp.set('paciente_id', p2.id)
      prosp.set('canal', 'WhatsApp')
      prosp.set('prioridade', 'alta')
      prosp.set('etapa', 'proposta')
      prosp.set('data_proximo_contato', '2026-10-02 14:00:00.000Z')
      prosp.set('observacoes', 'Enviada proposta do pacote de imunidade. Aguardando retorno.')
      app.save(prosp)
    }

    // 6. Seed Atendimentos (4-5 nos próximos 7 dias)
    const atendimentosCol = app.findCollectionByNameOrId('atendimentos')
    const dNow = new Date()
    const formatIsoDate = (daysAhead, hours, mins) => {
      const d = new Date(dNow.getTime() + daysAhead * 24 * 60 * 60 * 1000)
      d.setHours(hours, mins, 0, 0)
      return d.toISOString()
    }

    const atendimentosData = [
      {
        paciente_id: p5.id,
        tipo: 'Consulta',
        profissional: 'Dr. Roberto Seleta',
        data_hora: formatIsoDate(1, 10, 0),
        status: 'Agendado',
        observacoes: 'Primeira consulta integrativa completa com bioimpedância',
      },
      {
        paciente_id: p1.id,
        tipo: 'Aplicacao_APP',
        profissional: 'Enf. Mariana Santos',
        data_hora: formatIsoDate(2, 14, 30),
        status: 'Agendado',
        observacoes: 'Aplicação 2 de 4 do protocolo mitocondrial (CoQ10 + Carnitina)',
      },
      {
        paciente_id: p4.id,
        tipo: 'Aplicacao_APP_AV',
        profissional: 'Enf. Mariana Santos',
        data_hora: formatIsoDate(3, 16, 0),
        status: 'Agendado',
        observacoes: 'Sessão 3 de 4: infusão antioxidante venosa + B12 IM',
      },
      {
        paciente_id: p3.id,
        tipo: 'Retorno',
        profissional: 'Dr. Roberto Seleta',
        data_hora: formatIsoDate(4, 11, 0),
        status: 'Agendado',
        observacoes: 'Avaliação de novos exames laboratoriais de ferritina e PCR',
      },
      {
        paciente_id: p2.id,
        tipo: 'Consulta',
        profissional: 'Dra. Gabriela Castro',
        data_hora: formatIsoDate(5, 15, 0),
        status: 'Agendado',
        observacoes: 'Consulta inicial pré-agendada condicional ao fechamento da proposta',
      },
    ]

    for (const at of atendimentosData) {
      try {
        const rec = new Record(atendimentosCol)
        rec.set('paciente_id', at.paciente_id)
        rec.set('tipo', at.tipo)
        rec.set('profissional', at.profissional)
        rec.set('data_hora', at.data_hora)
        rec.set('status', at.status)
        rec.set('observacoes', at.observacoes)
        app.save(rec)
      } catch (e) {
        console.log('Error seeding atendimento:', e)
      }
    }

    // 7. Seed Lançamentos
    const lancamentosCol = app.findCollectionByNameOrId('lancamentos')
    const lancamentosData = [
      {
        paciente_id: p1.id,
        descricao: 'Consulta Médica Integrativa Inicial',
        tipo: 'Consulta',
        valor: 500,
        status: 'Pago',
        data: formatIsoDate(-20, 10, 0),
      },
      {
        paciente_id: p1.id,
        descricao: 'Pacote 4x APP (Protocolo Mitocondrial)',
        tipo: 'Pacote',
        valor: 1280,
        status: 'Pago',
        data: formatIsoDate(-10, 15, 0),
      },
      {
        paciente_id: p4.id,
        descricao: 'Consulta Médica de Avaliação Esportiva',
        tipo: 'Consulta',
        valor: 500,
        status: 'Pago',
        data: formatIsoDate(-15, 9, 0),
      },
      {
        paciente_id: p4.id,
        descricao: 'Pacote 4x APP+AV (Performance & Antioxidante)',
        tipo: 'Pacote',
        valor: 1680,
        status: 'Pago',
        data: formatIsoDate(-8, 14, 0),
      },
      {
        paciente_id: p3.id,
        descricao: 'Consulta Médica de Retorno + Plano Suplementar',
        tipo: 'Consulta',
        valor: 500,
        status: 'Pago',
        data: formatIsoDate(-30, 11, 0),
      },
      {
        paciente_id: p3.id,
        descricao: 'Fórmula Probiótica Personalizada 60 doses',
        tipo: 'Manipulado',
        valor: 350,
        status: 'Pago',
        data: formatIsoDate(-25, 12, 0),
      },
      {
        paciente_id: p5.id,
        descricao: 'Consulta Médica Integrativa Inicial (Agendada)',
        tipo: 'Consulta',
        valor: 500,
        status: 'Pendente',
        data: formatIsoDate(1, 10, 0),
      },
    ]

    for (const l of lancamentosData) {
      try {
        const rec = new Record(lancamentosCol)
        rec.set('paciente_id', l.paciente_id)
        rec.set('descricao', l.descricao)
        rec.set('tipo', l.tipo)
        rec.set('valor', l.valor)
        rec.set('status', l.status)
        rec.set('data', l.data)
        app.save(rec)
      } catch (e) {
        console.log('Error seeding lancamento:', e)
      }
    }

    // 8. Seed Mensagens Simuladas
    const mensagensCol = app.findCollectionByNameOrId('mensagens')
    const mensagensData = [
      {
        paciente_id: p2.id,
        canal: 'WhatsApp',
        direcao: 'saida',
        template: 'Boas-vindas — primeiro contato',
        conteudo:
          'Olá João Pedro! Seja bem-vindo(a) à Clínica Seleta. Estamos à disposição para agendar sua consulta. 😊',
        status: 'enviada',
        lida: true,
        agendada_para: formatIsoDate(-2, 10, 0),
      },
      {
        paciente_id: p2.id,
        canal: 'WhatsApp',
        direcao: 'entrada',
        template: 'Manual',
        conteudo: 'Olá! Recebi sim. Qual o valor do protocolo para imunidade?',
        status: 'enviada',
        lida: false,
        agendada_para: formatIsoDate(-1, 15, 30),
      },
      {
        paciente_id: p1.id,
        canal: 'WhatsApp',
        direcao: 'saida',
        template: 'Confirmação de aplicação APP',
        conteudo:
          'Olá Maria Fernanda, sua aplicação APP será amanhã às 14:30. Confirma? Responda SIM para confirmar.',
        status: 'enviada',
        lida: true,
        agendada_para: formatIsoDate(1, 9, 0),
      },
      {
        paciente_id: p1.id,
        canal: 'WhatsApp',
        direcao: 'entrada',
        template: 'Manual',
        conteudo: 'SIM, confirmado! Estarei aí às 14:30 pontualmente.',
        status: 'enviada',
        lida: true,
        agendada_para: formatIsoDate(1, 9, 15),
      },
      {
        paciente_id: p4.id,
        canal: 'Email',
        direcao: 'saida',
        template: 'Envio de nota fiscal',
        conteudo:
          'Olá Carlos Eduardo, segue sua nota fiscal em anexo referente ao Pacote 4x APP+AV. Agradecemos a preferência! — Equipe Seleta',
        status: 'enviada',
        lida: false,
        agendada_para: formatIsoDate(-8, 14, 5),
      },
      {
        paciente_id: p3.id,
        canal: 'Email',
        direcao: 'saida',
        template: 'Feedback e próximos passos',
        conteudo:
          'Olá Ana Beatriz, por gentileza, conte como foi sua experiência em nossa clínica na última consulta. Responda este e-mail. — Equipe Seleta',
        status: 'enviada',
        lida: true,
        agendada_para: formatIsoDate(-28, 10, 0),
      },
    ]

    for (const m of mensagensData) {
      try {
        const rec = new Record(mensagensCol)
        rec.set('paciente_id', m.paciente_id)
        rec.set('canal', m.canal)
        rec.set('direcao', m.direcao)
        rec.set('template', m.template)
        rec.set('conteudo', m.conteudo)
        rec.set('status', m.status)
        rec.set('lida', m.lida)
        rec.set('agendada_para', m.agendada_para)
        app.save(rec)
      } catch (e) {
        console.log('Error seeding mensagem:', e)
      }
    }
  },
  (app) => {
    // down logic is optional/no-op for seed
  },
)
