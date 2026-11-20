// Migration 0015 — correção final de marca ("Seleta" → "Clínica Elias Mansur")
// nos dados persistidos. A migration 0011 corrigiu textos de automações,
// mensagens, pacientes, observações etc., mas não cobria o nome do
// profissional em `atendimentos` (seed "Dr. Roberto Seleta").
//
// A troca do nome do profissional usa regex para respeitar a forma
// "Dr. Roberto Seleta" → "Dr. Roberto Clínica Elias Mansur"? NÃO — o nome do
// profissional é um nome próprio: substituímos o sobrenome "Seleta" pelo da
// clínica apenas quando ele aparece isolado em textos livres. Para o campo
// `profissional`, trocamos pelo nome correto do profissional da clínica.

migrate((app) => {
  // 1. `atendimentos.profissional`: "Dr. Roberto Seleta" → "Dr. Roberto Elias Mansur"
  try {
    const registros = app.findRecordsByFilter(
      'atendimentos',
      'profissional ~ "Seleta"',
      '',
      0,
      0,
    )
    for (const r of registros) {
      const original = String(r.get('profissional') || '')
      // Remove o sobrenome de marca e mantém o nome do profissional
      const corrigido = original
        .replace(/^(Dr\.?\s*)Roberto\s+Seleta$/i, 'Dr. Roberto Elias Mansur')
        .replaceAll('Seleta', 'Clínica Elias Mansur')
      if (corrigido !== original) {
        r.set('profissional', corrigido)
        app.save(r)
      }
    }
  } catch (e) {
    console.log('Aviso ao corrigir profissional em atendimentos:', e)
  }

  // 2. Varredura genérica idempotente em campos de texto das collections
  //    (mesma estratégia da 0011, agora incluindo campos antes não cobertos).
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

  corrigirMarca('atendimentos', ['observacoes ~ "Seleta"'], ['observacoes'])
  corrigirMarca('lancamentos', ['descricao ~ "Seleta"'], ['descricao'])
  corrigirMarca('pacientes', ['nome ~ "Seleta"', 'observacoes ~ "Seleta"'], ['nome', 'observacoes'])
  corrigirMarca('prospeccoes', ['observacoes ~ "Seleta"'], ['observacoes'])
  corrigirMarca('exames_laboratoriais', ['observacoes ~ "Seleta"'], ['observacoes'])
  corrigirMarca('automacoes', ['template ~ "Seleta"'], ['template', 'nome', 'gatilho'])
  corrigirMarca('mensagens', ['conteudo ~ "Seleta"', 'template ~ "Seleta"'], [
    'conteudo',
    'template',
  ])
  corrigirMarca('notas', ['memo ~ "Seleta"'], ['memo'])
}, (app) => {
  // down: sem operação — correção de marca idempotente
})
