/**
 * Migration 0012 — Ajustes finos dos fluxogramas (Clínica Elias Mansur)
 *
 * 1. Correção idempotente de duplicidade de marca ("Clínica Clínica Elias Mansur"
 *    → "Clínica Elias Mansur") em textos persistidos.
 * 2. Move o alerta interno "paciente não chegou" para a fase da 1ª consulta
 *    (Fluxo 2 — gatilhos da 1ª consulta).
 * 3. Fluxo 1: diferencia Boas-vindas v1 (Passivo — contato não cadastrado) e cria
 *    a v2 (Ativo — contato já cadastrado); transforma o reengajamento de D+5 em
 *    "Encerramento do lead" (bifurcação: encerra ou converte em agendamento).
 */
migrate(
  (app) => {
    const corrigirTexto = (collection, filtros, campos) => {
      for (const filtro of filtros) {
        try {
          const registros = app.findRecordsByFilter(collection, filtro, '', 0, 0)
          for (const r of registros) {
            let mudou = false
            for (const campo of campos) {
              const original = String(r.get(campo) || '')
              const corrigido = original
                .replaceAll('Clínica Clínica Elias Mansur', 'Clínica Elias Mansur')
                .replaceAll('Equipe Clínica Clínica', 'Equipe Clínica')
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
          console.log(`Aviso ao corrigir duplicidade de marca em ${collection}:`, e)
        }
      }
    }
    corrigirTexto('automacoes', ['template ~ "Clínica Clínica"'], ['template', 'nome', 'gatilho'])
    corrigirTexto('mensagens', ['conteudo ~ "Clínica Clínica"'], ['conteudo', 'template'])
    corrigirTexto('pacientes', ['observacoes ~ "Clínica Clínica"'], ['observacoes'])

    // 2. Alerta interno de não-chegada pertence ao Fluxo 2 (1ª consulta)
    try {
      const alerta = app.findFirstRecordByData(
        'automacoes',
        'nome',
        'Alerta interno — paciente não chegou (5 min antes)',
      )
      if (alerta && alerta.get('fase_roadmap') !== 'Primeira_consulta_v1') {
        alerta.set('fase_roadmap', 'Primeira_consulta_v1')
        app.save(alerta)
      }
    } catch (_) {
      // registro ainda não existe — nada a fazer
    }

    const automacoesCol = app.findCollectionByNameOrId('automacoes')

    // 3a. Boas-vindas v1 (Passivo) — ajusta gatilho do registro existente
    try {
      const v1 = app.findFirstRecordByData('automacoes', 'nome', 'Boas-vindas — primeiro contato')
      if (v1 && v1.get('gatilho') === 'Nova prospecção criada') {
        v1.set('gatilho', 'Contato NÃO cadastrado no CRM, via WhatsApp (Passivo)')
        app.save(v1)
      }
    } catch (_) {
      // sem o registro de boas-vindas — nada a fazer
    }

    // 3b. Boas-vindas v2 (Ativo) — contato já cadastrado
    try {
      app.findFirstRecordByData('automacoes', 'nome', 'Boas-vindas — contato já cadastrado (Ativo)')
    } catch (_) {
      const rec = new Record(automacoesCol)
      rec.set('nome', 'Boas-vindas — contato já cadastrado (Ativo)')
      rec.set('fase_roadmap', 'Prospeccao')
      rec.set('canal', 'WhatsApp')
      rec.set('gatilho', 'Contato JÁ cadastrado no CRM (prospecção ativa)')
      rec.set('atraso_minutos', 0)
      rec.set(
        'template',
        'Olá {nome}! Aqui é a Equipe Clínica Elias Mansur. Como você já é nosso contato, queremos te convidar para agendar sua consulta. Podemos reservar um horário? 😊',
      )
      rec.set('ativo', true)
      rec.set('interno', false)
      app.save(rec)
    }

    // 3c. D+5 sem agendamento → bifurcação: encerramento do lead
    try {
      const reengajar = app.findFirstRecordByData('automacoes', 'nome', 'Reengajamento final')
      if (reengajar) {
        reengajar.set('nome', 'Encerramento do lead (D+5)')
        reengajar.set(
          'gatilho',
          '5 dias sem resposta e sem agendamento (bifurcação: encerra o lead ou converte em Agendamento)',
        )
        reengajar.set(
          'template',
          'Olá {nome}! Não conseguimos falar com você por aqui, então vamos encerrar seu atendimento por agora. Quando quiser retomar, a Equipe Clínica Elias Mansur fica à disposição. Cuide-se! 🙏',
        )
        app.save(reengajar)
      }
    } catch (e) {
      console.log('Aviso ao ajustar encerramento do lead:', e)
    }
  },
  (app) => {
    // down: sem operação (ajustes idempotentes)
  },
)
