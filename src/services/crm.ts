import pb from '@/lib/pocketbase/client'
import {
  Paciente,
  Pacote,
  Atendimento,
  Lancamento,
  Mensagem,
  Automacao,
  Prospeccao,
  MedXImportacao,
  Usuario,
  Nota,
  ExameLaboratorial,
  Procedimento,
  TabelaConvenio,
  ContaCorrente,
  PlanoConta,
  FormaPagamento,
  Unidade,
  SetorAgenda,
  TipoAgendamento,
  Farmacia,
  CatalogoExame,
  Alimento,
  ModeloDocumento,
  CabecalhoRodape,
  Parametro,
  FormularioAnamnese,
  QuestionarioApoio,
  QuestionarioResposta,
  EstoqueItem,
  EstoqueMovimento,
  SessaoVenda,
  Fatura,
  ContaLancamento,
  EvolucaoProntuario,
  DocumentoPaciente,
  PesquisaQualidade,
  AuditoriaEvento,
  IaExtrato,
  ProcedimentoInsumo,
} from '@/types/crm'

export const pacientesService = {
  async list(page = 1, perPage = 50, filter = '', sort = '-created') {
    return await pb.collection('pacientes').getList<Paciente>(page, perPage, {
      filter,
      sort,
      expand: 'pacote_atual_id',
    })
  },
  async getById(id: string) {
    return await pb.collection('pacientes').getOne<Paciente>(id, {
      expand: 'pacote_atual_id',
    })
  },
  async create(data: Partial<Paciente>) {
    return await pb.collection('pacientes').create<Paciente>(data)
  },
  async update(id: string, data: Partial<Paciente>) {
    return await pb.collection('pacientes').update<Paciente>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('pacientes').delete(id)
  },
}

export const pacotesService = {
  async list(filter = '', sort = 'quantidade_aplicacoes') {
    return await pb.collection('pacotes').getFullList<Pacote>({
      filter,
      sort,
    })
  },
  async create(data: Partial<Pacote>) {
    return await pb.collection('pacotes').create<Pacote>(data)
  },
  async update(id: string, data: Partial<Pacote>) {
    return await pb.collection('pacotes').update<Pacote>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('pacotes').delete(id)
  },
}

export const atendimentosService = {
  async list(filter = '', sort = 'data_hora') {
    return await pb.collection('atendimentos').getFullList<Atendimento>({
      filter,
      sort,
      expand: 'paciente_id',
    })
  },
  async create(data: Partial<Atendimento>) {
    return await pb.collection('atendimentos').create<Atendimento>(data)
  },
  async update(id: string, data: Partial<Atendimento>) {
    return await pb.collection('atendimentos').update<Atendimento>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('atendimentos').delete(id)
  },
  async deleteSerie(serieId: string) {
    const records = await pb.collection('atendimentos').getFullList<Atendimento>({
      filter: `serie_recorrencia_id = "${serieId}"`,
    })
    for (const r of records) {
      await pb.collection('atendimentos').delete(r.id)
    }
    return records.length
  },
}

export const lancamentosService = {
  async list(filter = '', sort = '-data') {
    return await pb.collection('lancamentos').getFullList<Lancamento>({
      filter,
      sort,
      expand: 'paciente_id',
    })
  },
  async create(data: Partial<Lancamento>) {
    return await pb.collection('lancamentos').create<Lancamento>(data)
  },
  async update(id: string, data: Partial<Lancamento>) {
    return await pb.collection('lancamentos').update<Lancamento>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('lancamentos').delete(id)
  },
}

export const prospeccoesService = {
  async list(filter = '', sort = '-updated') {
    return await pb.collection('prospeccoes').getFullList<Prospeccao>({
      filter,
      sort,
      expand: 'paciente_id',
    })
  },
  async create(data: Partial<Prospeccao>) {
    return await pb.collection('prospeccoes').create<Prospeccao>(data)
  },
  async update(id: string, data: Partial<Prospeccao>) {
    return await pb.collection('prospeccoes').update<Prospeccao>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('prospeccoes').delete(id)
  },
}

export const mensagensService = {
  async list(filter = '', sort = '-created') {
    return await pb.collection('mensagens').getFullList<Mensagem>({
      filter,
      sort,
      expand: 'paciente_id',
    })
  },
  async create(data: Partial<Mensagem>) {
    return await pb.collection('mensagens').create<Mensagem>(data)
  },
  async markAsRead(id: string) {
    return await pb.collection('mensagens').update<Mensagem>(id, { lida: true })
  },
  async delete(id: string) {
    return await pb.collection('mensagens').delete(id)
  },
}

export const automacoesService = {
  async list(filter = '', sort = 'fase_roadmap') {
    return await pb.collection('automacoes').getFullList<Automacao>({
      filter,
      sort,
    })
  },
  async create(data: Partial<Automacao>) {
    return await pb.collection('automacoes').create<Automacao>(data)
  },
  async update(id: string, data: Partial<Automacao>) {
    return await pb.collection('automacoes').update<Automacao>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('automacoes').delete(id)
  },
}

export const usuariosService = {
  async list() {
    return await pb.collection('users').getFullList<Usuario>({
      sort: 'name',
    })
  },
  async update(id: string, data: Partial<Usuario>) {
    return await pb.collection('users').update<Usuario>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('users').delete(id)
  },
  async adminResetPassword(userId: string, newPassword: string, precisaTrocarSenha = true) {
    return await pb.send<{ success: boolean; message: string; precisa_trocar_senha?: boolean }>(
      '/backend/v1/admin/reset-password',
      {
        method: 'POST',
        body: { userId, newPassword, precisaTrocarSenha },
      },
    )
  },
  async trocarSenhaPrimeiroAcesso(currentPassword: string, newPassword: string) {
    return await pb.send<{ success: boolean; message: string; user?: Usuario }>(
      '/backend/v1/auth/primeiro-acesso',
      {
        method: 'POST',
        body: { currentPassword, newPassword },
      },
    )
  },
}

export const medxImportacoesService = {
  async list(filter = '', sort = '-created') {
    return await pb.collection('medx_importacoes').getFullList<MedXImportacao>({
      filter,
      sort,
    })
  },
  async create(data: Partial<MedXImportacao>) {
    return await pb.collection('medx_importacoes').create<MedXImportacao>(data)
  },
}

export const notasService = {
  async list(filter = '', sort = 'data') {
    return await pb.collection('notas').getFullList<Nota>({
      filter,
      sort,
      expand: 'usuario_id',
    })
  },
  async create(data: Partial<Nota>) {
    return await pb.collection('notas').create<Nota>(data)
  },
  async update(id: string, data: Partial<Nota>) {
    return await pb.collection('notas').update<Nota>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('notas').delete(id)
  },
}

export const examesService = {
  async list(filter = '', sort = '-data') {
    return await pb.collection('exames_laboratoriais').getFullList<ExameLaboratorial>({
      filter,
      sort,
      expand: 'paciente_id',
    })
  },
  async getById(id: string) {
    return await pb.collection('exames_laboratoriais').getOne<ExameLaboratorial>(id, {
      expand: 'paciente_id',
    })
  },
  async create(data: Partial<ExameLaboratorial>) {
    return await pb.collection('exames_laboratoriais').create<ExameLaboratorial>(data)
  },
  async update(id: string, data: Partial<ExameLaboratorial>) {
    return await pb.collection('exames_laboratoriais').update<ExameLaboratorial>(id, data)
  },
  async delete(id: string) {
    return await pb.collection('exames_laboratoriais').delete(id)
  },
}

// Automation Dispatcher Helper
export async function dispatchAutomacao(
  templateNameOrFase: string,
  paciente: { id: string; nome: string; telefone?: string; email?: string },
  variables: Record<string, string> = {},
) {
  try {
    // Find matching automacao
    let automacao: Automacao | null = null
    try {
      const records = await pb.collection('automacoes').getFullList<Automacao>({
        filter: `nome = "${templateNameOrFase}" || fase_roadmap = "${templateNameOrFase}"`,
        limit: 1,
      })
      if (records.length > 0) {
        automacao = records[0]
      }
    } catch {
      /* intentionally ignored */
    }

    let conteudo = automacao ? automacao.template : templateNameOrFase
    const canal = automacao ? automacao.canal : 'WhatsApp'

    // Replace variables
    const preCadastroUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/questionario` : '/questionario'
    const allVars: Record<string, string> = {
      nome: paciente.nome,
      hora: variables.hora || '14:00',
      data: variables.data || new Date().toLocaleDateString('pt-BR'),
      link_questionario: preCadastroUrl,
      ...variables,
    }

    for (const [key, value] of Object.entries(allVars)) {
      conteudo = conteudo.replace(new RegExp(`{${key}}`, 'g'), value)
    }

    // Create simulated message
    return await pb.collection('mensagens').create<Mensagem>({
      paciente_id: paciente.id,
      canal: canal,
      direcao: 'saida',
      template: automacao ? automacao.nome : 'Manual',
      conteudo: conteudo,
      status: 'enviada',
      lida: false,
      agendada_para: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Erro ao disparar automação:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Fase 1 — serviços genéricos para as coleções novas
// ---------------------------------------------------------------------------

/**
 * Fábrica de serviço CRUD para uma coleção do PocketBase.
 * `data` aceita FormData (necessário para campos de arquivo).
 */
export function crudService<T extends { id: string }>(
  collection: string,
  defaultSort = '-created',
  defaultExpand = '',
) {
  return {
    async list(filter = '', sort = defaultSort, expand = defaultExpand) {
      return await pb.collection(collection).getFullList<T>({
        filter,
        sort,
        ...(expand ? { expand } : {}),
      })
    },
    async listPage(
      page = 1,
      perPage = 50,
      filter = '',
      sort = defaultSort,
      expand = defaultExpand,
    ) {
      return await pb.collection(collection).getList<T>(page, perPage, {
        filter,
        sort,
        ...(expand ? { expand } : {}),
      })
    },
    async getById(id: string, expand = defaultExpand) {
      return await pb.collection(collection).getOne<T>(id, expand ? { expand } : {})
    },
    async create(data: Partial<T> | FormData) {
      return await pb.collection(collection).create<T>(data as Record<string, unknown>)
    },
    async update(id: string, data: Partial<T> | FormData) {
      return await pb.collection(collection).update<T>(id, data as Record<string, unknown>)
    },
    async delete(id: string) {
      return await pb.collection(collection).delete(id)
    },
  }
}

export const procedimentosService = crudService<Procedimento>('procedimentos', 'nome')
export const tabelasConveniosService = crudService<TabelaConvenio>('tabelas_convenios', 'nome')
export const contasCorrentesService = crudService<ContaCorrente>('contas_correntes', 'nome')
export const planoContasService = crudService<PlanoConta>('plano_contas', 'classificacao')
export const formasPagamentoService = crudService<FormaPagamento>('formas_pagamento', 'nome')
export const unidadesService = crudService<Unidade>('unidades', 'nome')
export const setoresAgendaService = crudService<SetorAgenda>('setores_agenda', 'nome')
export const tiposAgendamentoService = crudService<TipoAgendamento>('tipos_agendamento', 'nome')
export const farmaciasService = crudService<Farmacia>('farmacias', 'nome')
export const catalogoExamesService = crudService<CatalogoExame>('catalogo_exames', 'nome')
export const alimentosService = crudService<Alimento>('alimentos', 'nome')
export const modelosDocumentosService = crudService<ModeloDocumento>(
  'modelos_documentos',
  'pasta,titulo',
)
export const cabecalhosRodapesService = crudService<CabecalhoRodape>('cabecalhos_rodapes', 'nome')
export const formulariosAnamneseService = crudService<FormularioAnamnese>(
  'formularios_anamnese',
  'nome',
)
export const questionariosApoioService = crudService<QuestionarioApoio>(
  'questionarios_apoio',
  'nome',
)
export const questionariosRespostasService = crudService<QuestionarioResposta>(
  'questionarios_respostas',
  '-data',
)
export const estoqueItensService = crudService<EstoqueItem>('estoque_itens', 'nome')
export const estoqueMovimentosService = crudService<EstoqueMovimento>(
  'estoque_movimentos',
  '-data',
  'item_id',
)
export const sessoesVendaService = crudService<SessaoVenda>(
  'sessoes_venda',
  '-data_venda',
  'paciente_id,procedimento_id',
)
export const faturasService = crudService<Fatura>(
  'faturas',
  '-data',
  'paciente_id,forma_pagamento_id',
)
export const contasLancamentosService = crudService<ContaLancamento>(
  'contas_lancamentos',
  'vencimento',
  'conta_id,classificacao_id',
)
export const evolucoesService = crudService<EvolucaoProntuario>('prontuario_evolucoes', '-data')
export const documentosPacienteService = crudService<DocumentoPaciente>(
  'paciente_documentos',
  '-data',
)
export const pesquisasQualidadeService = crudService<PesquisaQualidade>(
  'pesquisas_qualidade',
  '-data',
  'paciente_id',
)
export const auditoriaService = crudService<AuditoriaEvento>('auditoria_eventos', '-data')
export const iaExtratoService = crudService<IaExtrato>('ia_extrato', '-data')

/** Registra um evento de auditoria. Nunca lança erro (não pode quebrar a ação principal). */
export async function registrarAuditoria(modulo: string, acao: string, descricao: string) {
  try {
    const u = pb.authStore.record
    await pb.collection('auditoria_eventos').create({
      modulo,
      acao,
      descricao,
      usuario: (u?.name as string) || (u?.email as string) || 'sistema',
      data: new Date().toISOString(),
    })
  } catch {
    /* auditoria é best-effort */
  }
}

/** Parâmetros do sistema armazenados como pares chave → JSON. */
export const parametrosService = {
  async get<T = Record<string, unknown>>(chave: string): Promise<T | null> {
    try {
      const rec = await pb
        .collection('parametros')
        .getFirstListItem<Parametro<T>>(`chave = "${chave}"`)
      return rec.valor
    } catch {
      return null
    }
  },
  async set<T = Record<string, unknown>>(chave: string, valor: T) {
    try {
      const rec = await pb
        .collection('parametros')
        .getFirstListItem<Parametro<T>>(`chave = "${chave}"`)
      return await pb.collection('parametros').update<Parametro<T>>(rec.id, { valor })
    } catch {
      return await pb.collection('parametros').create<Parametro<T>>({ chave, valor })
    }
  },
}

/**
 * Registra uma movimentação de estoque e atualiza o saldo do item.
 * Entrada soma, Saída subtrai e Ajuste define o saldo para `quantidade`.
 */
export async function movimentarEstoque(
  item: EstoqueItem,
  tipo: EstoqueMovimento['tipo'],
  quantidade: number,
  motivo = '',
  origem = '',
) {
  const saldoAtual = item.saldo || 0
  const novoSaldo =
    tipo === 'Entrada'
      ? saldoAtual + quantidade
      : tipo === 'Saída'
        ? saldoAtual - quantidade
        : quantidade
  if (novoSaldo < 0) throw new Error('Saldo insuficiente em estoque.')
  await pb.collection('estoque_movimentos').create({
    item_id: item.id,
    tipo,
    quantidade,
    motivo,
    ...(origem ? { origem } : {}),
    data: new Date().toISOString(),
  })
  const atualizado = await pb
    .collection('estoque_itens')
    .update<EstoqueItem>(item.id, { saldo: novoSaldo })
  await registrarAuditoria(
    'Estoque',
    tipo,
    `${item.nome}: ${tipo} de ${quantidade} (saldo ${novoSaldo})`,
  )
  return atualizado
}

/**
 * Marca uma sessão como realizada, conclui a venda quando zera o saldo e dá baixa
 * no estoque dos insumos do procedimento. Falta de saldo não impede a sessão:
 * os demais insumos são baixados e os problemas voltam em `avisos`.
 */
export async function registrarSessaoRealizada(
  sessao: SessaoVenda,
): Promise<{ sessao: SessaoVenda; avisos: string[] }> {
  const total = sessao.quantidade || 0
  if ((sessao.realizadas || 0) >= total) {
    return { sessao, avisos: ['Todas as sessões desta venda já foram realizadas.'] }
  }
  const realizadas = Math.min((sessao.realizadas || 0) + 1, total)
  const atualizada = await pb.collection('sessoes_venda').update<SessaoVenda>(sessao.id, {
    realizadas,
    concluida: realizadas >= total,
  })
  const avisos = await baixarInsumosDaSessao(sessao, realizadas)
  return { sessao: atualizada, avisos }
}

export const procedimentoInsumosService = crudService<ProcedimentoInsumo>(
  'procedimento_insumos',
  'created',
  'item_id,procedimento_id',
)

// ---------------------------------------------------------------------------
// Fase 2 — estoque x sessões
// ---------------------------------------------------------------------------

/** Igual a `movimentarEstoque`, mas exige a `origem` da movimentação. */
export function movimentarEstoqueComOrigem(
  item: EstoqueItem,
  tipo: EstoqueMovimento['tipo'],
  quantidade: number,
  motivo: string,
  origem: string,
) {
  return movimentarEstoque(item, tipo, quantidade, motivo, origem)
}

/** Dá baixa nos insumos do procedimento da sessão; devolve os avisos de itens sem saldo. */
async function baixarInsumosDaSessao(sessao: SessaoVenda, numero: number): Promise<string[]> {
  const avisos: string[] = []
  if (!sessao.procedimento_id) return avisos
  let insumos: ProcedimentoInsumo[] = []
  try {
    insumos = await pb.collection('procedimento_insumos').getFullList<ProcedimentoInsumo>({
      filter: `procedimento_id = "${sessao.procedimento_id}"`,
    })
  } catch {
    return ['Não foi possível consultar os insumos do procedimento; o estoque não foi baixado.']
  }
  const nomeProc = sessao.procedimento_nome || sessao.expand?.procedimento_id?.nome || 'Procedimento'
  for (const ins of insumos) {
    const qtd = Number(ins.quantidade) || 0
    if (qtd <= 0) continue
    try {
      const item = await pb.collection('estoque_itens').getOne<EstoqueItem>(ins.item_id)
      if ((item.saldo || 0) < qtd) {
        avisos.push(
          `Saldo insuficiente de "${item.nome}": necessário ${qtd}, disponível ${item.saldo || 0}. Item não baixado.`,
        )
        continue
      }
      await movimentarEstoqueComOrigem(
        item,
        'Saída',
        qtd,
        `Sessão realizada: ${nomeProc}`,
        `sessao:${sessao.id}:${numero}`,
      )
    } catch {
      avisos.push(`Não foi possível dar baixa em um insumo (id ${ins.item_id}).`)
    }
  }
  return avisos
}

/**
 * Desfaz a última sessão realizada: decrementa `realizadas`, reabre a venda e devolve ao
 * estoque (Entrada com origem `sessao:<id>:estorno`) o que foi baixado pela última sessão.
 */
export async function desfazerSessaoRealizada(
  sessao: SessaoVenda,
): Promise<{ sessao: SessaoVenda; avisos: string[] }> {
  const avisos: string[] = []
  const realizadas = Math.max((sessao.realizadas || 0) - 1, 0)
  if ((sessao.realizadas || 0) <= 0) {
    return { sessao, avisos: ['Nenhuma sessão realizada para desfazer.'] }
  }
  const atualizada = await pb.collection('sessoes_venda').update<SessaoVenda>(sessao.id, {
    realizadas,
    concluida: false,
  })
  const nomeProc = sessao.procedimento_nome || sessao.expand?.procedimento_id?.nome || 'Procedimento'
  // cada sessão tem a sua própria origem (`sessao:<id>:<nº>`), para devolver só o que ela baixou
  const origemBase = `sessao:${sessao.id}:${sessao.realizadas || 0}`
  try {
    const movs = await pb.collection('estoque_movimentos').getFullList<EstoqueMovimento>({
      filter: `origem = "${origemBase}" || origem = "${origemBase}:estorno"`,
      sort: '-data',
    })
    const porItem = new Map<string, { saidas: EstoqueMovimento[]; estornos: number }>()
    for (const m of movs) {
      const g = porItem.get(m.item_id) || { saidas: [], estornos: 0 }
      if (m.origem === `${origemBase}:estorno`) g.estornos += 1
      else if (m.tipo === 'Saída') g.saidas.push(m)
      porItem.set(m.item_id, g)
    }
    for (const [itemId, g] of porItem) {
      // saídas já estornadas são as mais recentes; a próxima é a baixa da última sessão
      const baixa = g.saidas[g.estornos]
      if (!baixa) continue
      try {
        const item = await pb.collection('estoque_itens').getOne<EstoqueItem>(itemId)
        await movimentarEstoqueComOrigem(
          item,
          'Entrada',
          baixa.quantidade,
          `Sessão desfeita: ${nomeProc}`,
          `${origemBase}:estorno`,
        )
      } catch {
        avisos.push(`Não foi possível devolver ao estoque um insumo (id ${itemId}).`)
      }
    }
  } catch {
    avisos.push('Não foi possível consultar as baixas de estoque; nada foi devolvido ao estoque.')
  }
  return { sessao: atualizada, avisos }
}
