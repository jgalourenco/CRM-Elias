# Especificação Técnica e Funcional do CRM — Clínica Elias Mansur

> **Documento de Engenharia de Software e Arquitetura**  
> **Versão:** 0.0.14  
> **Status:** Ativo / Produção  
> **Sistema:** CRM & Prontuário Integrativo Clínica Elias Mansur  

---

## 1. Visão Geral e Identidade

O **CRM Clínica Elias Mansur** é uma plataforma integrada de gestão médica, atendimento integrativo, prescrição, prospecção e relacionamento com pacientes. O sistema foi desenvolvido para atender às particularidades de uma clínica de medicina integrativa, longevidade e procedimentos injetáveis (soroterapia, implantes e terapias personalizadas).

- **Nome oficial do sistema:** Clínica Elias Mansur
- **Tom visual e paleta:** Verde institucional `#166A5A`, dourado premium `#C9A227`, azul acinzentado `#2E7FA3`, fundo claro `#F7F6F3` e tipografia limpa.
- **Ambiente de deploy:** SPA client-side integrada com backend PocketBase (Skip Cloud).

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend Framework** | React 18 + Vite + TypeScript | Compilação rápida, tipagem estrita com TypeScript (`strict: true`) |
| **Estilização** | Tailwind CSS + CSS Variables | Design system responsivo, paleta customizada, utilitários flex/grid |
| **Componentes de UI** | Radix UI + shadcn/ui | Modais (Dialog), abas (Tabs), menus suspensos, badges, cards, gavetas |
| **Ícones** | Lucide React | Ícones SVG semânticos e consistentes |
| **Gráficos** | Recharts | Gráficos responsivos de pizza (PieChart) e barras (BarChart) |
| **Backend & Dados** | PocketBase (Skip Cloud) | Banco SQLite reativo, autenticação nativa, RBAC, REST API e SDK JS |
| **Autenticação & 2FA** | JWT + TOTP RFC 6238 + Backup Codes | QR Code SVG em tempo real, tokens com tempo de expiração |
| **Comunicação em Tempo Real** | Server-Sent Events (PocketBase Realtime) | Subscriptions automáticas para atualizações instantâneas |

---

## 3. Autenticação, Perfis de Acesso (RBAC) e Segurança 2FA

### 3.1 Perfis de Acesso (Roles)
O CRM adota 4 níveis estritos de permissão, normalizados em `src/lib/permissions.ts`:

1. **Administrador (`admin`):** Acesso irrestrito a todas as áreas, relatórios financeiros, configurações da equipe, régua de automação e importações.
2. **Gestor / Recepção (`gestor`):** Foco em atendimento, recepção, agendamento de consultas, confirmação de presença (check-in), prospecção e cobranças.
3. **Profissional / Saúde (`profissional`):** Foco clínico em prontuários, anamnese, exames laboratoriais, evolução do paciente, conversor de unidades e prescrição.
4. **Visualização (`visualizacao`):** Modo somente leitura para auditoria e consultas sem permissão de alteração ou exclusão de dados.

### 3.2 Duplo Fator de Autenticação (2FA / TOTP)
Implementação em `src/services/mfa.ts` e `src/components/mfa/TwoFactorConfigCard.tsx`:
- Baseado no algoritmo **RFC 6238 (Time-Based One-Time Password)** com segredo Base32 de 160 bits gerado de forma criptograficamente segura.
- Suporta aplicativos autenticadores de mercado (Google Authenticator, Microsoft Authenticator, 1Password, Authy).
- Geração instantânea de **QR Code SVG client-side** (`QRCodeSVG.tsx`) sem envio de segredo para APIs externas de imagem.
- Geração de **códigos de backup (reserva)** em caso de perda do dispositivo autenticador.
- Validação no login com tolerância de drift de horário (±1 janela de 30 segundos).

---

## 4. Estrutura de Coleções (PocketBase Schema)

O banco de dados PocketBase é estruturado nas seguintes coleções principais:

1. **`users`:** Usuários do sistema, com campos de perfil, email, cargo, conselho profissional (CRM/UF) e credenciais MFA.
2. **`pacientes`:** Cadastro mestre de pacientes (nome, CPF, telefone, email, fase no CRM, convênio, ID cliente MedX legado, ID assinatura, LTV acumulado, anamnese em JSON).
3. **`atendimentos`:** Agenda e compromissos (paciente_id, tipo de atendimento, data_hora, status, profissional, hora_chegada, hora_inicio_atendimento, hora_fim_atendimento, observações).
4. **`pacotes`:** Catálogo de pacotes e planos de tratamento (nome, quantidade_aplicacoes, tipo_aplicacao, valor_total, validade_dias).
5. **`lancamentos`:** Módulo financeiro e faturamento (paciente_id, tipo, categoria, valor, data_vencimento, data_pagamento, status).
6. **`prospeccoes`:** Pipeline do funil de vendas (paciente_id, etapa, canal, valor_estimado, prioridade, data_contato, observacoes).
7. **`mensagens`:** Histórico de disparos e conversas (paciente_id, canal WhatsApp/Email, direcao, conteudo, status_envio, metadata).
8. **`automacoes`:** Régua de relacionamento (gatilho, canal, delay_minutos, ativo, template, total_disparos).
9. **`notas`:** Lembretes e recados rápidos da equipe com prazos e status de conclusão (estilo coluna lateral MedX).
10. **`exames`:** Resultados e laudos de exames laboratoriais associados a datas, pesos e volumes para evolução integrativa.
11. **`medx_importacoes`:** Histórico de auditoria de importações em lote (nome_arquivo, total, importados, erros, log de falhas em JSON, retenção de 30 dias).

---

## 5. Módulos e Telas do CRM

### 5.1 Dashboard ("Hoje" / Front Desk)
Inspirado na tela principal do Front Desk:
- **Resumo do Dia:** Contadores em tempo real de pacientes agendados, em atendimento, atendidos e faltas.
- **Agenda Diária Hora a Hora (`AgendaHojeView`):** Linhas organizadas de hora em hora (07:00 às 20:00) com intervalo configurável (1h ou 30min).
  - Cards com borda direita colorida conforme o status: Agendado (Azul), Confirmado (Dourado), Chegou (Teal), Em Atendimento (Verde pulsante), Concluído (Cinza esmaecido), No-Show (Vermelho).
  - Ações rápidas: "Chegou" (check-in de recepção), "Iniciar Consulta" (redireciona para prontuário em modo consulta), "Concluir", "No-show" e edição de agendamento em modal dedicado.
  - Slots vazios clicáveis sugerindo agendamento direto naquele horário.
- **Últimos Atendidos (`UltimosAtendidosCard`):** Lista dos pacientes que passaram recentemente por atendimento.
- **Notas e Lembretes Rápidos (`NotasLembretesCard`):** Quadro de notas com filtro por usuário responsável, classificação automática de datas (Atrasadas, Hoje, Futuras) e alternância de conclusão.

### 5.2 Agenda Geral (`/agendas`)
- **Visualização Diária Hora a Hora:** Modo padrão para acompanhamento diário minucioso.
- **Visualização Mensal:** Calendário com contagem de atendimentos diários, atalhos para agendar direto no dia e navegação de meses.
- **Visualização Semanal:** Visão de 7 dias úteis com lista cronológica e cards em fila.
- **Navegador Dia a Dia:** Botões de avanço/retrocesso de dia, botão rápido "Hoje" e seletor de data específico.
- **Modal de Criação e Edição:** Edição de paciente, tipo de procedimento, data/hora, profissional, status e observações.

### 5.3 Gestão de Pacientes & Fichas Clínicas (`/pacientes` e `/pacientes/:id`)
- **Lista Geral:** Filtro por busca de texto (nome, telefone, CPF, convênio, IDs legados), fase do CRM e tipo de pacote. Tabela com scroll horizontal responsivo e badges claros.
- **Ficha Integrativa do Paciente:**
  - **Cabeçalho:** Avatar com iniciais, fase, pacote ativo, LTV acumulado e botões rápidos (Enviar Mensagem, Editar Cadastro, Novo Lançamento, Agendar).
  - **Aba Visão Geral & Anamnese:** Origem do paciente (Instagram, Google, Indicação), profissional que indicou, comorbidades, alergias conhecidas, suplementação/medicamentos em uso e metas terapêuticas.
  - **Aba Exames por Data (`ExamesPacienteTab`):** Registro e acompanhamento de exames laboratoriais agrupados por data.
    - Conversor de unidades integrado (g, dg, cg, mg, l, dl, cl, ml).
    - Importador e interpretador de texto de laudo.
    - Visualização em tabela comparativa de evolução e alerta de valores de referência.
  - **Aba Atendimentos:** Histórico cronológico completo de consultas e aplicações.
  - **Aba Funil / Prospecção:** Status de negociação e follow-up do paciente.
  - **Aba Faturamento:** Extrato financeiro, recibos e lançamentos vinculados.
  - **Aba Caixa de Conversas:** Histórico de disparos de WhatsApp e E-mail.
  - **Mensagem Avulsa (`EnviarMensagemAvulsaModal`):** Disparo de mensagens personalizadas via WhatsApp ou E-mail com seleção de modelo padrão ou texto livre.

### 5.4 Funil de Vendas (Kanban) (`/funil`)
- Colunas interativas: *Novo Lead*, *Primeiro Contato*, *Agendamento*, *Fechamento* e *Paciente Ativo*.
- Suporte a drag-and-drop e layout adaptável com scroll horizontal em telas menores.
- Gatilho automático de eventos da Régua de Atendimento ao mover cards entre etapas.

### 5.5 Régua de Atendimento & Automações (`/automacao/regua`)
- Mapeamento de 19 automações clínicas categorizadas:
  1. *Boas-vindas — primeiro contato*
  2. *Lembrete de consulta (24h antes)*
  3. *Lembrete de consulta (2h antes)*
  4. *Confirmação de presença (Check-in)*
  5. *Agradecimento pós-consulta integrativa*
  6. *Orientações pré-aplicação APP*
  7. *Orientações pré-aplicação Venosa (APP+AV)*
  8. *Lembrete de sessão semanal de injetável*
  9. *Acompanhamento pós-aplicação (24h)*
  10. *Alerta de finalização de pacote (última sessão)*
  11. *Proposta de renovação de protocolo*
  12. *Lembrete de retorno periódico (30 dias)*
  13. *Lembrete de retorno periódico (60 dias)*
  14. *Reativação de paciente inativo (90 dias)*
  15. *Felicitações de aniversário*
  16. *Solicitação de exames de controle*
  17. *Aviso de laudo de exames disponível*
  18. *Instruções de jejum e preparo laboratorial*
  19. *Pesquisa de satisfação e qualidade (NPS)*
- Painel para alternar status ativo/inativo e simulação de teste de envio para qualquer paciente cadastrado.
- Telas de visualização simulada: WhatsApp (`/automacao/whatsapp`) e E-mail (`/automacao/email`).

### 5.6 Importações em Lote (`/config/importacao`)
- Carregamento de arquivos CSV e planilhas de contatos.
- Mapeamento flexível de colunas (Nome, Telefone, Email, CPF, Convênio, IDs legados, Observações).
- Validação prévia de inconsistências e download de arquivo de log de falhas.
- Histórico de importações com expiração visual automática de registros anteriores a 30 dias.

### 5.7 Indicadores & Métricas (`/indicadores`)
- Métricas com alternador temporal: **7 dias**, **30 dias** e **90 dias**.
- Gráficos responsivos (Recharts):
  - Taxa de comparecimento × no-shows × desmarques.
  - Novos pacientes × pacientes recorrentes.
  - Origem da prospecção ("Como conheceu a clínica").
  - Balanço estimado de faturamento e margem operacional.

### 5.8 Layout e Navegação (`Layout.tsx`)
- Menu lateral recolhível (sidebar) com seções sanfonadas / minimizáveis (Clínica, Comercial, Automações, Configurações).
- Gaveta lateral (Sheet/Drawer) nativa para dispositivos móveis com acionamento pelo botão menu no topo.
- Cabeçalho global com identificação do usuário ativo, botão de Novo Paciente e atalho para Minha Conta.

---

## 6. Responsividade e Experiência Mobile / Tablet

Todas as páginas principais foram otimizadas contra quebras e overflows:
- **Grids Adaptativos:** Grids de 3 ou 4 colunas em desktops colapsam suavemente para 1 ou 2 colunas em telas de tablet e 1 coluna em smartphones.
- **Tabelas com Contêineres de Rolagem:** Elementos tabulares extensos (Pacientes, Importações, Atendimentos, Extrato) utilizam `overflow-x-auto` com `min-width` seguro, impedindo distorção de colunas.
- **Controles de Cabeçalho Wrap:** Botões de ação e filtros utilizam `flex-wrap` e preenchimento total (`w-full sm:w-auto`) em dispositivos portáteis.
- **Gráficos com Contêiner Relativo:** Todos os gráficos Recharts estão inseridos em `ResponsiveContainer width="100%"` com alturas fixadas e dimensionamento dinâmico.
- **Modais com Rolagem Interna:** Diálogos (`DialogContent`) utilizam altura máxima proporcional (`max-h-[85vh]`) e rolagem vertical automática (`overflow-y-auto`).

---

## 7. Instruções para Reconstrução do Zero

1. **Clonar repositório:**
   ```bash
   git clone <repo-url>
   cd crm-clinica-elias-mansur
   npm install
   ```
2. **Configuração de Variáveis de Ambiente:**
   - Assegurar URL e chave da instância PocketBase ativa.
3. **Execução Local:**
   ```bash
   npm run dev
   ```
4. **Build de Produção:**
   ```bash
   npm run build
   ```
5. **Verificação de Integridade:**
   ```bash
   npm run typecheck
   ```
