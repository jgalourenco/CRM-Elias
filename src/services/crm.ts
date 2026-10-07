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
  async update(id: string, data: Partial<Automacao>) {
    return await pb.collection('automacoes').update<Automacao>(id, data)
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
}

export const medxImportacoesService = {
  async list() {
    return await pb.collection('medx_importacoes').getFullList<MedXImportacao>({
      sort: '-created',
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
    const allVars: Record<string, string> = {
      nome: paciente.nome,
      hora: variables.hora || '14:00',
      data: variables.data || new Date().toLocaleDateString('pt-BR'),
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
