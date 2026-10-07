# CRM Clínica Seleta — Resumo do Projeto

## Visão geral

Sistema online de CRM e gestão de atendimento para a **Clínica Seleta** (medicina integrativa), criado para substituir o MedX. Centraliza tudo que envolve o paciente, do primeiro contato até a recompra.

## Jornada do paciente

Prospecção → 1ª consulta → Retorno → Tratamento (manipulado e/ou aplicações) → Reavaliação → Novo ciclo.

## Fases do roadmap (todas construídas no MVP 1–5)

Prospecção · 1ª consulta · Retorno · Manipulado · Aplicação (APP) · APP+AV · D-1 · NF · No-show · LTV.

## Principais funcionalidades

- **Autenticação** completa: login, cadastro com verificação de e-mail, recuperação e redefinição de senha (e-mails transacionais simulados no banco).
- **Dashboard**: agenda do dia em primeiro plano, pacientes ativos, prospecções abertas, consultas da semana, receita dos últimos 30 dias, faturamento por semana e funil de conversão.
- **Pacientes**: ficha completa com anamnese integrativa, atendimentos, prospecções, faturamento e histórico de conversas (WhatsApp e e-mail). Campos de identificadores: ID do Cliente, ID da Assinatura, ID do Convênio e Convênio. Telefone é opcional.
- **Agenda**: visões Hoje (lista cronológica do dia com próximo atendimento destacado), mensal e semanal, com alerta de saldo insuficiente no pacote ao agendar aplicações.
- **Funil Kanban**: arrastar e soltar entre 6 etapas; cada movimento dispara a automação da fase.
- **Régua de Atendimento**: 19 automações em 9 fases (confirmações, lembretes, follow-ups, pesquisas), com ligar/desligar e botão "Executar agora".
- **Caixas simuladas** de WhatsApp e e-mail, com badge de não lidas.
- **Pacotes configuráveis** (ex.: "4x"), com cálculo de economia e venda direta na ficha do paciente.
- **Importador MedX**: upload de planilha, mapeamento de colunas, validação e importação como prospecções (telefone opcional; campos de convênio/IDs mapeáveis).

## Decisões de produto

- Orçamento "4x": pacote de 4 aplicações (número configurável por pacote).
- Canais: WhatsApp (API oficial da Meta, planejado) + e-mail transacional.
- **No build atual, a régua roda em caixa simulada** — mensagens registradas no banco e visíveis na interface, sem integração real.

## Pendências

- Conectar WhatsApp real (API da Meta + templates aprovados).
- Ajustar textos dos templates das 19 automações.
- Testar o importador com a base real do MedX (incluindo pacientes sem telefone).
