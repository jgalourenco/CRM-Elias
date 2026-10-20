# MedX — Validação do Prontuário e da Ficha do Paciente

Data: 20/10/2026. Paciente real aberto para leitura (identificação omitida neste documento).
Complementa o [medx-mapeamento-completo.md](medx-mapeamento-completo.md), seção 4 e prontuário.

## Regras desta validação

- Foram abertas telas e painéis, lidos rótulos e campos, e clicados controles de **visualização e
  navegação**.
- **Não foram executados**: salvar, excluir, finalizar consulta ou fatura, enviar campanha, abrir arquivo do
  paciente, iniciar telemedicina, upload, nem qualquer envio de dados do paciente para a IA (R1).
- Não houve gravação de dados. Comportamento de regras (validação de campos, efeitos de salvar) continua
  **inferido** pelos rótulos e campos.

## 1. Prontuário (`pages_prontuario/prontuario.html`)

### 1.1 Cabeçalho e alertas
- Título do painel de agente ativo ("R1 · Agente Obesidade") e **alerta de alergia** em destaque no topo
  (texto com o medicamento do paciente; não reproduzido aqui).
- Atalhos: Ajustes e Suporte (menu).

### 1.2 Painel de notas clínicas (campos de texto)
Campos: **diagnósticos principais**, **história patológica pregressa**, **medicamentos em uso**,
**alergias**, **observações importantes**. Botões:
- **Salvar** (`postInformacaoImportante`): **não clicado** (grava no prontuário).
- **Salvar no histórico** (`salvaEvolucao`): **não clicado** (grava evolução).
- **Cancelar** (`limparDivEdicao`): clicado dentro de um overlay de faturamento, sem efeito de salvar. O overlay
  não fechou, então o comportamento completo não foi confirmado.

### 1.3 Documentos e histórico
- **23 links de documentos** visíveis (receitas manipuladas 60/90 dias, receitas Exodus, exames laboratoriais,
  solicitações, resultados com datas de 2022 a 2025, "Arquivo interpretado de exames").
- Cada item abre o arquivo via `getFileUrl(...)` (armazenamento em nuvem, blob com token temporário).
  **Não aberto**, porque abriria dado pessoal e possivelmente baixaria arquivo.
- **Questionários via web/tablet** (7 entradas): botão abre gráfico `abrirGraficoQuestionario`.
  **Validado**: o gráfico renderiza (108 elementos de canvas/SVG) dentro do painel do agente.

### 1.4 Agentes R1 (IA)
- Painel lateral **R1 I.A** com seleção de agente:
  - **R1 · Agente Obesidade** (`selecionarAgente('obesidade')`): **aberto e validado**. Mostra campos de
    texto, botões de análise e chat.
  - **R1 · Assistente do Prontuário**: visível, **não aberto**.
- Botões de análise, todos **não clicados** (enviam dados do paciente ao modelo):
  - Análise Completa
  - Análogos de GLP-1
  - Anfetamínicos e Dopaminérgicos
  - Anticonvulsivantes
  - Fenótipos
  - Fitoterapicos
  - Outros medicamentos
- **Iniciar novo chat** (`recomecar`) e seta de envio (`handlePostAgenteObesidade('conversacional')`): **não clicados**.
- Busca no prontuário ("Escreva aqui o texto que deseja buscar"): visível, não usada.
- **Evolução Inteligente** (`redirectR1`): **não clicado** (redireciona para outro módulo de IA).
- **Sugerir Campanhas de Marketing**: **não clicado** (dispara campanha).
- **Adicionar arquivos** (`cloud_upload`): **não clicado** (upload).

### 1.5 Módulos e faturamento
- **Finalizar Consulta** (`abrirPopUpFinalizar`): **aberto e validado** como modal **"Criar Fatura"**:
  - seleção de procedimento (campo "Buscar Procedimentos");
  - dois campos de seleção (provavelmente unidade e forma de pagamento);
  - ~16 campos numéricos (quantidades e valores por item);
  - botão de confirmação **"Finalizar Consulta"**: **não clicado** (cria fatura).
- **Ortomolecular**: abre o **Receituário** com "Meus Documentos", "Farmácias", "Ortomolecular", "Injetáveis",
  Imprimir, **Imprimir Controlado**, **Receituário Eletrônico**, "Últimos documentos", "Nova Fórmula",
  "Nova versão" e **Memed** (integração de receita eletrônica). Validado em visualização.
- Módulos Fisiologia Hormonal, Nutrologia e Estética: estão na lista do painel, mas não foram localizados
  como clicáveis após o Receituário. Não validado.
- **Todos Módulos** (`voltarEscolherModulos`): não clicado.
- **Telemedicina** (`abrirTelemedicina`): **não clicado** (inicia sessão de vídeo).

### 1.6 Suporte
- Widget de suporte (Tiflux) carregado no rodapé. Não usado.

## 2. Ficha do paciente (`pages_front_Desk/contatoedit.html`)

### 2.1 Navegação e ações
| Botão | Handler | Situação |
|---|---|---|
| Voltar | `redirecionaPagina('contatos')` | Não clicado |
| Buscar Endereço | `buscaCep()` | Não clicado (consulta de CEP que preenche o endereço) |
| Salvar | `resolveSalvarContato(dadosFicha)` | **Não clicado** (grava) |
| Excluir | `excluipaciente(dadosFicha)` | **Não clicado** (exclusão, irreversível) |
| Histórico | `redirecionaPagina('historico')` | Clicado: **não mudou de rota**; exibiu "Gerando Análise" |
| Documentos | `redirecionaPagina('documentos')` | Clicado: **não mudou de rota** |
| Telefonemas | `redirecionaPagina('telelefonemas')` | Clicado: **não mudou de rota** |

**Atenção:** o handler de Telefonemas está escrito `telelefonemas` (letra a mais). Se a rota for usada,
é um bug de digitação a corrigir na nova versão. Não confirmado porque a navegação não ocorreu.

**Atenção:** clicar em Histórico, Documentos e Telefonemas exibiu o texto "Gerando Análise" na tela,
sem indicação de qual análise foi disparada. Vale verificar se essas abas disparam chamadas de IA.

Atalhos no topo: Prontuário, Faturamento (`financas_faturamento`) e Agenda filtrada pelo paciente.

### 2.2 Abas de dados (seções do formulário)
Seções: **Dados de Convênio**, **Dados de Contato**, **Dados de Endereço**, **Dados Complementares 1** e
**Dados Complementares 2**. Campos marcados com `*` são obrigatórios.

| Seção | Campos |
|---|---|
| Identificação | Nome* (texto completo), Nome Social, Nascimento*, Sexo*, CPF/CNPJ, RG, Código, Nº do prontuário, Tipo, Tags |
| Marketing | Marketing (checkbox), VIP, Excluir do Marketing, Mala-direta |
| Convênio | Convênio, Matrícula, Número CNS |
| Contato | 1º telefone residencial, 2º telefone residencial, Celular, Telefone comercial, Contato (nome para celular), Email |
| Endereço | CEP (com busca), Endereço, Complemento, Bairro, Cidade, Estado, Região |
| Complementares 1 | Empresa, Referência, Conheceu por (lista), Indicado por (lista), Estado civil, Profissão, Escolaridade, Religião |
| Complementares 2 | Pai, Mãe, Acompanhante, Filhos, Cônjuge, Observações (texto livre) |

Observação: o campo de observações fica por último, mas é o texto livre mais importante para o atendimento.

### 2.3 Regras e validações inferidas (não testadas)
- Nome, nascimento e sexo são obrigatórios (marcados com `*`).
- Telefones e email não aparecem como obrigatórios.
- Busca de CEP preenche o endereço automaticamente.
- Acompanhante, filhos e cônjuge são campos separados, sugerindo cadastro familiar.

## 3. Resumo do que faltou validar

1. **Salvar / Salvar no histórico / Finalizar Consulta / Excluir / Enviar campanha**: gravam dados ou disparam
   ações irreversíveis. Só devem ser testados em conta ou paciente de teste.
2. **Análises da IA (R1)**: enviam dados do paciente a um modelo. Precisa da sua autorização explícita para testar,
   e o efeito de cada análise não foi observado.
3. **Abertura de documentos** (23 arquivos): precisa de autorização, por envolver dado pessoal de saúde.
4. **Histórico, Documentos e Telefonemas da ficha**: não foi possível confirmar a navegação, e a aba de
   Telefonemas tem handler com erro de digitação.
5. **Telemedicina, Upload e Memed**: exigem integração externa e não foram acionados.

## 4. Pontos de atenção para o novo CRM

- Dados de saúde (alergias, diagnósticos, documentos) e dados financeiros convivem na mesma tela. Considerar
  perfis de acesso por setor.
- Análises de IA enviam o prontuário inteiro. Precisa de consentimento e log de uso (já existe o extrato R1 em
  Configurações).
- Ficha com muitos campos de texto livre e família. Vale separar contato, endereço e dados clínicos.
- Erros de digitação em handlers (`telelefonemas`) indicam que o legado não tem testes de navegação.
