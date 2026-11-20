/**
 * Migration 0013 — Corrige flag `interno` dos alertas internos
 *
 * A migration 0011 criou os alertas internos com `interno = false` (a referência
 * da collection usada no `new Record` estava obsoleta, sem o campo recém-criado).
 * Aqui garantimos, idempotentemente, `interno = true` nas duas automações cujo
 * destinatário é a EQUIPE (não o paciente).
 */
migrate(
  (app) => {
    const nomes = [
      'Alerta interno — paciente não chegou (5 min antes)',
      'Alerta interno — agendar retorno na clínica',
    ]
    for (const nome of nomes) {
      try {
        const rec = app.findFirstRecordByData('automacoes', 'nome', nome)
        if (rec && rec.get('interno') !== true) {
          rec.set('interno', true)
          app.save(rec)
        }
      } catch (_) {
        // registro ainda não existe — nada a fazer
      }
    }
  },
  (app) => {
    // down: sem operação
  },
)
