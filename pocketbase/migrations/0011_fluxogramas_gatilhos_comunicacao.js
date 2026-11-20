/**
 * Migration 0011 — Fluxogramas de gatilhos de comunicação (Clínica Elias Mansur)
 *
 * 1. Adiciona novos valores ao select `fase_roadmap` da collection `automacoes`
 *    (Primeira_consulta_v1, Pos_primeira_consulta, Antes_retorno, Pos_retorno),
 *    alinhados aos 5 fluxos desenhados pelo usuário.
 * 2. Adiciona campo `interno` (bool) em `automacoes` — mensagens destinadas à
 *    equipe (não aparecem nas caixas de entrada simuladas do paciente).
 * 3. Cria as novas automações da régua (CSAT, exames D+5, confirmação D-4 da
 *    1ª consulta, manipulados D+5 pós-retorno, alerta interno D-0 5min antes).
 * 4. Correção idempotente de marca: qualquer "Seleta" em textos persistidos
 *    (automacoes, mensagens, pacientes) passa a ser "Clínica Elias Mansur".
 */
migrate(
  (app) => {
    const automacoesCol = app.findCollectionByNameOrId('automacoes')

    // 1. Novos valores no select fase_roadmap
    const faseField = automacoesCol.fields.getByName('fase_roadmap')
    const novosValores = [
      'Primeira_consulta_v1',
      'Pos_primeira_consulta',
      'Antes_retorno',
      'Pos_retorno',
    ]
    let valuesAlterados = false
    for (const v of novosValores) {
      if (!faseField.values.includes(v)) {
        faseField.values.push(v)
        valuesAlterados = true
      }
    }
    if (valuesAlterados) {
      app.save(automacoesCol)
    }

    // 2. Campo `interno` (bool) em automacoes
    if (!automacoesCol.fields.getByName('interno')) {
      const col = app.findCollectionByNameOrId('automacoes')
      col.fields.add(
        new BoolField({
          name: 'interno',
        }),
      )
      app.save(col)
    }

    // 3. Novas automações da régua
    const novasAutomacoes = [
      {
        // FLUXO 2 — D-4 da 1ª consulta (dia útil anterior, mín. 4 dias antes)
        nome: 'Confirmação da 1ª consulta (D-4)',
        fase_roadmap: 'Primeira_consulta_v1',
        canal: 'WhatsApp',
        gatilho: '4 dias antes da 1ª consulta (dia útil anterior, mín. 4 dias)',
        atraso_minutos: -5760,
        template:
          'Olá {nome}! Sua primeira consulta na Clínica Elias Mansur está marcada para {data} às {hora}. Podemos confirmar sua presença? Responda SIM para confirmar ou REAGENDAR se precisar de outra data. 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 3 — CSAT no dia da 1ª consulta
        nome: 'CSAT — pesquisa de satisfação (1ª consulta)',
        fase_roadmap: 'Pos_primeira_consulta',
        canal: 'WhatsApp',
        gatilho: 'No dia da 1ª consulta (após o atendimento)',
        atraso_minutos: 0,
        template:
          'Olá {nome}! Como foi sua primeira consulta na Clínica Elias Mansur? De 0 a 10, quanto você recomendaria nossa clínica para um amigo? Sua resposta ajuda muito a melhorarmos. 🙏',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 3 — Alerta interno: retorno na data (equipe agenda retorno)
        nome: 'Alerta interno — agendar retorno na clínica',
        fase_roadmap: 'Pos_primeira_consulta',
        canal: 'WhatsApp',
        gatilho: 'No dia da 1ª consulta, se houver retorno marcado para a mesma data',
        atraso_minutos: 0,
        template:
          'ALERTA INTERNO — {nome} retornou na data combinada. Equipe Clínica Elias Mansur: agende o retorno na clínica com o paciente antes que ele deixe a unidade.',
        ativo: true,
        interno: true,
      },
      {
        // FLUXO 3 — D+5 pós 1ª consulta: lembrete de exames
        nome: 'Lembrete de exames (D+5)',
        fase_roadmap: 'Pos_primeira_consulta',
        canal: 'WhatsApp',
        gatilho: '5 dias após a 1ª consulta, se houver exames pendentes na ficha',
        atraso_minutos: 7200,
        template:
          'Olá {nome}! Passando para lembrar dos exames solicitados na sua consulta. Quando ficar pronto, traga o resultado na Clínica Elias Mansur para a próxima consulta. Qualquer dúvida, fale com a gente! 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 4 — D-4 do retorno
        nome: 'Confirmação de retorno (D-4)',
        fase_roadmap: 'Antes_retorno',
        canal: 'WhatsApp',
        gatilho: '4 dias antes do retorno (dia útil anterior, mín. 4 dias)',
        atraso_minutos: -5760,
        template:
          'Olá {nome}! Seu retorno na Clínica Elias Mansur está próximo: {data} às {hora}. Podemos confirmar sua presença? Responda SIM para confirmar. 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 4 — D-1 do retorno mencionando resultado/exames
        nome: 'Lembrete de retorno com resultado/exames (D-1)',
        fase_roadmap: 'Antes_retorno',
        canal: 'WhatsApp',
        gatilho: '1 dia antes do retorno agendado (mencionando resultado/exames)',
        atraso_minutos: -1440,
        template:
          'Olá {nome}! Seu retorno é amanhã às {hora}. Se já tiver o resultado dos seus exames, traga-o para avaliarmos junto. Equipe Clínica Elias Mansur. 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 4 — D-0, 5 minutos antes, "está chegando?"
        nome: 'Está chegando? (D-0, 5 min antes)',
        fase_roadmap: 'Antes_retorno',
        canal: 'WhatsApp',
        gatilho: '5 minutos antes do horário do retorno',
        atraso_minutos: -5,
        template:
          'Olá {nome}! Seu retorno é hoje às {hora}. Está chegando para a Clínica Elias Mansur? Se estiver a caminho, avise a gente — a equipe já prepara sua recepção. 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 5 — D+5 pós retorno: manipulados
        nome: 'Manipulados — fazer os manipulados (D+5 pós-retorno)',
        fase_roadmap: 'Pos_retorno',
        canal: 'WhatsApp',
        gatilho: '5 dias após o retorno da consulta',
        atraso_minutos: 7200,
        template:
          'Olá {nome}! Passando para lembrar: está na hora de fazer os manipulados prescritos na sua consulta. A farmácia de manipulação da Clínica Elias Mansur fica à disposição para preparar o seu. Qualquer dúvida, chame a gente! 😊',
        ativo: true,
        interno: false,
      },
      {
        // FLUXO 2 — ALERTA INTERNO: D-0, 5min antes, sem status "Chegou"
        nome: 'Alerta interno — paciente não chegou (5 min antes)',
        fase_roadmap: 'D1',
        canal: 'WhatsApp',
        gatilho: '5 minutos antes do horário da consulta, sem marcação de chegada',
        atraso_minutos: -5,
        template:
          'ALERTA INTERNO — {nome} tem consulta hoje às {hora} e ainda não chegou. Equipe Clínica Elias Mansur: ligue para o paciente e confirme se está a caminho.',
        ativo: true,
        interno: true,
      },
    ]

    for (const item of novasAutomacoes) {
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
        rec.set('ativo', item.ativo !== false)
        rec.set('interno', !!item.interno)
        app.save(rec)
      }
    }

    // 4. Correção idempotente de marca em textos persistidos
    const corrigirMarca = (collection, filtros, campos) => {
      for (const filtro of filtros) {
        try {
          const registros = app.findRecordsByFilter(collection, filtro, '', 0, 0)
          for (const r of registros) {
            let mudou = false
            for (const campo of campos) {
              const original = String(r.get(campo) || '')
              const corrigido = original.replaceAll('Seleta', 'Clínica Elias Mansur')
              if (corrigido !== original) {
                r.set(campo, corrigido)
                mudou = true
              }
            }
            if (mudou) {
              app.save(r)
            }
          }
        } catch (e) {
          console.log(`Aviso ao corrigir marca em ${collection}:`, e)
        }
      }
    }
    corrigirMarca('automacoes', ['template ~ "Seleta"'], ['template', 'nome', 'gatilho'])
    corrigirMarca('mensagens', ['conteudo ~ "Seleta"', 'template ~ "Seleta"'], [
      'conteudo',
      'template',
    ])
    corrigirMarca('pacientes', ['nome ~ "Seleta"', 'observacoes ~ "Seleta"'], ['nome', 'observacoes'])
    corrigirMarca('prospeccoes', ['observacoes ~ "Seleta"'], ['observacoes'])
    corrigirMarca('atendimentos', ['observacoes ~ "Seleta"'], ['observacoes'])
    corrigirMarca('lancamentos', ['descricao ~ "Seleta"'], ['descricao'])
    corrigirMarca('exames_laboratoriais', ['observacoes ~ "Seleta"'], ['observacoes'])
  },
  (app) => {
    // down: sem operação (seeds e correção de marca são idempotentes e mantidos)
  },
)
