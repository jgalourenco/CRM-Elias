# MedX — Mapeamento completo de telas e funcionalidades

Substitui o `medx-funcionalidades-referencia.md` (que cobria só a tela "Hoje").

**Levantamento:** 20/10/2026, sessão já logada pelo usuário, Chrome com depuração remota.
**Método:** REA (inspeção passiva) + leitura da árvore de elementos e do texto de cada tela, com navegação
pelo próprio menu do sistema.

**Limites do levantamento (leia antes de usar):**
- **Somente leitura.** Nenhum cadastro, edição, envio, cobrança ou exclusão foi executado. Isso significa que
  as regras de negócio (cálculos, validações de formulário, efeitos de salvar) estão **inferidas pelos campos e
  labels**, não testadas. Para validar comportamento é preciso um ambiente de teste.
- **Não clicados por segurança:** "Salvar", "Enviar", "Gerar Novo Token", "Sim, Quero" (automação de custo de
  procedimento), "Teleconsulta", chat do R1 I.A, "Consolidar Exames", ativação de campanhas, "OK" da
  redireção de Qualidade.
- **Não validado:** pré-cadastro (popup não abriu de forma confiável), prontuário e ficha de contato
  (exigem abrir um paciente real; só foi visto que existem), Portal de Apoio do Paciente (retornou 404),
  Perfil, Ajuda/Suporte, Sessões de ação (CRUD).
- **Dados de pacientes e financeiros** aparecem nas telas. Nada foi copiado para este documento.

---

## 1. Arquitetura: sistema híbrido em migração

O MedX está em transição entre duas aplicações:

| Parte | Host | Tecnologia observada | Telas |
|---|---|---|---|
| Legado | `care-app65.medx.med.br` | AngularJS + Kendo UI + Bootstrap | Hoje, Contatos, Agenda, Marketing, Finanças, Insights, Estoque, Sessões |
| Novo | `care-app.medx.med.br/app/...` | SPA com Material UI (MUI) | Configurações (`/app/configuracoes/*`) |

- A navegação do menu lateral é a mesma nos dois, mas o item **Config.** leva ao módulo novo.
- O host novo rejeita rotas do legado (404), e o legado não serve as rotas do novo. A migração não está completa.
- Há também o acesso direto ao caminho `pages_*` pelo host novo: retorna 404, então o legado só existe no host `care-app65`.

Implicação para o CRM: decidir se a migração deve ser replicada como uma aplicação só ou se é melhor redesenhar
o conjunto. Não replicar a fragmentação.

---

## 2. Navegação global (menu lateral e topo)

Itens: **Hoje, Contatos, Agenda, Marketing, Finanças, Insights, Estoque, Sessões, Config.**

Ícones/atalhos adicionais observados:
- **Buscar** (topo): popup "Buscar Paciente" com campo de texto (busca por nome ou parte do nome).
- **Pré-cadastro** (atalho na tela Hoje): "Realização de pré-cadastro de pacientes novos" (popup não validado).
- **Ajuda**: "Ajuda a utilizar o sistema" e "Acesse o comunicador (chat) entre o usuário", além de link para suporte.
- **Chat interno** entre usuários.
- Cabeçalho do usuário: "Assinante GOLD", "Trocar Senha", "Sync Agenda", "Sair (logout)". Exibe o último login.

---

## 3. Tela "Hoje" (página inicial)

- Calendário mensal (outubro 2026) com navegação anterior/próximo.
- Abas **"Ver agenda [data]"** e **"Ver pacientes atendidos"**.
- Cartão **Notas**: lista de notas por paciente (ex.: "Ver exames", com há quanto tempo) e botão **Ver cadastro de notas**.
- Cartão **Notificações** com contador.
- Espaço **Patrocinado** com "Ver todos".
- Cada linha de agendamento leva a três destinos: **ficha de contato** (`contatoedit`), **prontuário** e
  **faturamento** do paciente, e à **agenda** filtrada por paciente.

---

## 4. Contatos (pacientes e contatos)

- Lista de contatos com colunas **Nº Prontuário** e **Nome**, ordenada por nome. Campo de busca e botão
  **Busca avançada** (não aberto).
- Ficha de contato (`contatoedit`), prontuário (`prontuario`) e faturamento do paciente, acessíveis pelo link
  de cada paciente (estrutura não detalhada nesta rodada).

---

## 5. Agenda

- Visão **dia** (grade de horário 07:00–21:00, filtrada por profissional, ex.: "Todos" ou "Elias Mansur") com
  cada agendamento mostrando paciente, tipo e horário (ex.: "RETORNO", "CONSULTA", "2° APP", "5° APP + AV",
  "7° TIZER").
- Ícone de cifrão em alguns agendamentos (provável indicador de pagamento/pendência; a confirmar).
- Seletor de **setor**, de **data** (mês/dia) e botão **Sync Agenda**.
- Tipos de agendamento e cores por status vêm do módulo de configurações (ver seção 9).

Não validado: criação, remarcação, status (desmarcou, compareceu, iniciou atendimento) e alertas de saldo de pacote.

---

## 6. Marketing

Hub com cinco módulos:

1. **Marketing de Relacionamento** (`marketing_campanhas`): abas **Automáticas, Recorrentes, Customizadas e
   Mensagens**. Tabela de ações com colunas *Email configurado, Envia Email, Envia SMS*, e exemplos de campanhas
   automáticas (aniversário diário, dia dos pais para pacientes masculinos, indicação, etc.). Cada ação tem
   liga/desliga por canal. **Não alterado.**
2. **Qualidade de Atendimento**: aviso de que o painel migrou para o **Dashboard do Marketing** e pergunta se o
   usuário quer ser redirecionado (OK/Cancelar). **Não confirmado.**
3. **Dashboard do Marketing** (`marketing_dashboard`): filtro de período, impressão e agendamento de envios.
   Pesquisa de qualidade com categorias: **Localização, Infraestrutura, Atendimento geral, Atendimento médico,
   Pontualidade, Informações sobre o tratamento, Custo x benefício**.
4. **Portal de Apoio do Paciente**: 404 no momento do acesso. Não validado.
5. **R1 I.A**: módulo de IA do sistema. Não usado (interação de chat).

---

## 7. Finanças

Hub com 11 módulos:

| Módulo | Página | O que foi observado |
|---|---|---|
| **Vendas & Faturamento** | `financas_faturamento` | Colunas: Data, Cliente, Guia Nº, NF, Recibo, Valor, Filial, Tabela, Fechado, Status, Observações. Busca por cliente, filial, tabela, data, guia, NF ou recibo. Status como "Fatura Pendência". |
| **Lançamentos Financeiros** | `financas_lancamentos` | Contas a pagar/receber. Filtros: unidade/filial, conta corrente, período; busca por descrição, nº de documento ou valor. Colunas: Vencimento, Descrição, Valor, Pago, Saldo, Nº Controle, Conta, Filial, Classificação. Botão **Filtrar**. |
| **Dashboard de Gestão** | `marketing_insights` | Painéis de pacientes (total, novos, por sexo, origem de conhecimento: Facebook, Email, Instagram, Indicação, Internet, etc.), agenda (agendamentos, atendidos, desmarcados) e financeiro, com comparação mês a mês e controle de zoom. |
| **Relatórios Financeiros** | `financas_relatorios` | Lista de relatórios: faturamento por período, por tipo de pagamento, por profissional (regime de competência e de caixa), por tabela, por procedimento e por paciente. |
| **Controle de Estoque** | `financas_estoque` | Itens com **Apresentação** e **Saldo Total** (219 itens na lista). Busca por item, filtro por unidade/filial, "Ver itens ocultos". |
| **Controle de Sessões** | `pages_sessoes` | Colunas: Data da venda, Paciente, Procedimento, Qtd/Sessões, Realizadas, Restam. Mostra sessões em aberto e concluídas. |
| **Pagamentos Stone** | `financas_webpagamentos` | Lista de pagamentos por cartão (Stone): Nome do Paciente, Data, Status, TID, Valor. Busca por nome. |
| **Teleconsulta** | (não acessado) | Módulo listado. Não foi clicado, por envolver sessão de vídeo. |
| **Guia TISS** | `financas_tiss` | Guias emitidas: Paciente, Convênio, Data da consulta, Data de criação, Visualizar. Botões Buscar e **Nova Guia**. |
| **R1 I.A** | (não acessado) | Módulo de IA. |
| **Nota Fiscal** | `/app/configuracoes/notaFiscal` | Ver seção 9. |

Campos e regras observados nas telas (inferidos):
- Filiais/unidades em todos os módulos financeiros.
- Vínculo entre venda → guia TISS → NF → recibo.
- Estoque conectado a procedimentos (ver seção 9, "Cadastro de Procedimentos").

---

## 8. Insights

Painel de indicadores (mesmo conteúdo do Dashboard de Gestão, em outra rota): pacientes (total, novos,
distribuição por sexo, origem), agenda (agendamentos, atendidos, desmarcados) e financeiro. Filtros: últimos 30
dias, últimos 60 dias ou personalizado.

---

## 9. Configurações (`/app/configuracoes`) — módulo novo

Tela com busca e 4 grupos de cards. Cada card abre uma rota própria.

### 9.1 Configurações da área médica
| Card | Rota | Observado |
|---|---|---|
| Documentos para Receituário | `documentosReceituario` | Modelos de texto em pastas. Botão Novo. |
| Planilha de Exames | `planilhaExames` | Exame, Grupo, Peso, Volume, Mínimo/Máximo por sexo (M e F). Botão **Consolidar Exames** (não clicado). |
| Cadastro de Alimentos | `cadastroAlimentos` | Alimento, Apresentação, Kcal, Gramas, Carboidratos, Proteínas, Gorduras, Fibras. |
| Formulários de Anamnese | `formularioAnamnese` | Editor de formulário arrastando campos: título de seção, texto/rótulo, caixa de texto, painel de check, painel de rádio. Excluir e Salvar. |
| Questionários de Apoio | `questionarioApoio` | Editor com tipos de pergunta (Frequência, Intensidade, Sim ou Não, Texto), aplicação (Ambos os sexos, etc.), relevância por peso (ex.: Peso 2). Excluir e Salvar. |

### 9.2 Configurações de gestão e finanças
| Card | Rota | Observado |
|---|---|---|
| Tabelas, Convênios e Seguradoras | `tabelasConvenios` | Tabela/Convênio e Observações. Preço de cada procedimento por convênio. |
| Cadastro de Procedimentos | `cadastroProcedimentos` | Procedimento, Preço, Custo, Nº de Sessões, Comissão %. Botões Custos, Imprimir. **Modal "Nova funcionalidade disponível"**: cálculo automático de custo a partir do estoque, com opção de autorizar (não clicado). |
| Contas Correntes | `contaCorrentes` | Conta, Tipo, Encargos %. |
| Plano de Contas | `planoContas` | Classificação e Tipo (receita/despesa). |
| Formas de Pagamento | `formasPagamento` | Forma, Máx. de parcelas, Taxa adm %, Obrigatório documento, Prazo da 1ª parcela. |
| Unidades/Filiais | `UnidadesFiliais` | Unidade, CPF/CNPJ, CNAEs, Razão social. |
| Integração Stone/Pagar.Me | `integracaoPagarme` | Dados bancários do recebedor, tipo de cadastro (PF/PJ), sócios e endereço. Saldo e link de taxas. **Dados sensíveis: não reproduzidos.** |
| Nota Fiscal | `notaFiscal` | Dados cadastrais da empresa (razão social, CNPJ, contato, endereço), regime tributário, configurações gerais. |

### 9.3 Configurações gerais
| Card | Rota | Observado |
|---|---|---|
| Setores da Agenda | `setoresAgenda` | Setor, DDD, Telefone (setores com número próprio para SMS). |
| Cores da Agenda | `coresAgenda` | Cor de cada status: DESMARCADO, COMPARECEU, INICIADO ATENDIMENTO, entre outros. |
| Tipos de Agendamento | `tiposAgendamentos` | Tipos de consulta e duração padrão, ex.: Aplicação, Aplicação + Avaliação, Aplicação com Dr., Consulta, Manutenção, Retorno, Protocolos (inverno EV/IM), Representante, Aplicação SC/IM. Lista com medicamentos e tratamentos (ex.: ferro, Bemer, RIFE, Noripurum). |
| Usuários do Sistema | `usuarios` | Usuário, Setor, Status. Permissões, horários de atendimento e carimbo. |
| Cabeçalho e Rodapé | `cabecalhoRodape` | Modelos de impressão (margens e imagens), modelo padrão. |
| Parâmetros do Sistema | `parametrosGerais` | Horário de funcionamento (início, fim, intervalo), dados da clínica (nome, país, DDD, telefone, email), módulos favoritos. Regra: o nome da clínica entra na mensagem de SMS, que tem limite de **142 caracteres** (contador "16/37"). |
| Cadastro de Farmácias | `cadastroFarmacias` | Nome, Email, Telefones, Celular. Lista de farmácias parceiras MEDX pré-carregada. |
| Minha Assinatura MEDX | `minhaAssinatura` | Plano MEDX: vigência (início/fim), dados de cobrança, contato e endereço. |
| Auditoria de Eventos | `auditoria` | Módulo, Ação, Usuário, Descrição, Data. |
| Extrato de Utilização do R1 I.A | `extratoR1` | Data, Área, Pergunta, Resposta. Consumo de R1, IA e WhatsApp. |
| Integrações e Mensagens | `integracoes` | **Token pessoal** (vinculado ao usuário, respeita permissões) e **Token da conta** (compartilhado, usado só na API antiga). Campo para token público do RD Station. Botões Gerar Novo Token e Vincular. |
| Configuração Waba | (não localizado) | Conexão do WhatsApp Business pela Meta. |

---

## 10. Padrões de interface observados

- Listas com busca no topo, colunas ordenáveis e filtros por unidade/filial.
- Botões de ação no canto superior direito: **Novo**, **Salvar**, **Excluir**, **Imprimir**, **Voltar**.
- Filtros por período: últimos 30 dias, 60 dias ou personalizado.
- Impressão e cabeçalhos/rodapés configuráveis por unidade.
- Modais de confirmação para funcionalidades novas.

---

## 11. Pontos de atenção para o novo CRM

1. **Migração incompleta** entre legado e novo: decidir o alvo único antes de replicar.
2. **Dados sensíveis** (dados bancários, tokens, prontuários, guias TISS) aparecem em telas de lista e de
   configuração. Sugerir mascaramento e controle de acesso por perfil.
3. **Auditoria existe** (seção 9.3), mas não foi validado se cobre cadastros de pacientes e financeiro.
4. **Integrações externas** a replicar ou substituir: Stone/Pagar.Me, Meta WhatsApp Business, RD Station, MEDBOT,
   InBody, emissão de NF e geração de guias TISS.
5. **Regras de negócio críticas** a validar em ambiente de teste: custo de procedimento a partir do estoque,
   comissão, pacotes de sessões (realizadas/restam), status de agendamento e cores, limite de SMS, campanhas
   automáticas e tabelas de preço por convênio.

---

## 12. Próximos passos para validação

1. Abrir um paciente de teste (não real) e documentar a ficha, o prontuário e o pré-cadastro.
2. Em ambiente de teste, validar:
   - criação e remarcação de agendamento e mudança de status;
   - lançamento financeiro e baixa de pagamento;
   - cálculo de custo a partir do estoque;
   - geração de guia TISS;
   - envio de campanha (somente em conta de teste).
3. Confirmar a rota do Portal de Apoio do Paciente e da Configuração Waba.
4. Decidir, com o usuário, se as ações de escrita devem ser testadas e em qual ambiente.
