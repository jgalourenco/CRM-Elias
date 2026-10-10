# Guia de Integração Oficial: WhatsApp Business Platform (Meta Cloud API)

> **Documento de Engenharia e Integração Externa**  
> **Sistema:** CRM Clínica Elias Mansur  
> **API Alvo:** Meta Graph API (WhatsApp Cloud API v21.0+)  

---

## 1. Visão Geral da Arquitetura

Este documento estabelece o plano de arquitetura, homologação e transição do modo simulado atual do CRM para a API oficial do WhatsApp da Meta (Cloud API). A integração direta com a Meta assegura alta entregabilidade, selo oficial de verificação para a clínica, conformidade com a LGPD e estabilidade sem depender de navegadores abertos ou emuladores não oficiais.

```
┌───────────────────────────┐         HTTPS (Graph API)         ┌─────────────────────────────┐
│  CRM Clínica Elias Mansur │ ────────────────────────────────> │ Meta Cloud API (v21.0)      │
│  (pb_hooks / Backend)     │                                   │ (graph.facebook.com)        │
│                           │ <──────────────────────────────── │                             │
└───────────────────────────┘          Webhook Assinado         └──────────────┬──────────────┘
                                                                               │
                                                                               ▼
                                                                     Dispositivo do Paciente
```

---

## 2. Pré-requisitos e Setup no Meta Business

### 2.1 Meta Business Manager e Conta Comercial
1. Criar ou acessar o **Gerenciador de Negócios da Meta (Meta Business Manager)** da Clínica Elias Mansur.
2. Realizar a **Verificação da Empresa**:
   - Submissão de CNPJ, Contrato Social / Cartão CNPJ e comprovante de endereço.
   - Verificação de domínio oficial (`clinicaeliasmansur.com.br`).
3. Cadastrar a **Conta do WhatsApp Business (WABA - WhatsApp Business Account)**.

### 2.2 Número de Telefone Dedicado
- Número fixo ou móvel exclusivo que **não esteja associado** a nenhum aplicativo WhatsApp (nem pessoal nem WhatsApp Business convencional).
- Se já foi usado no WhatsApp móvel, a conta deve ser excluída no app antes do cadastro na API.
- Validação do número via código por SMS ou ligação de voz no painel da Meta.

### 2.3 Aplicativo no Portal Meta for Developers
1. Criar um aplicativo do tipo **Empresa (Business)** no [Meta for Developers](https://developers.facebook.com/).
2. Adicionar o produto **WhatsApp** ao aplicativo.
3. Vincular o App à WABA da Clínica Elias Mansur.

### 2.4 Usuário de Sistema e Token de Acesso Permanente
1. No Meta Business Manager, acessar **Configurações do Negócio > Usuários > Usuários do Sistema**.
2. Criar um usuário de sistema com papel de Administrador (ex.: `crm-backend-bot`).
3. Gerar um **Token de Acesso do Sistema Permanente** com as permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Armazenar o token em variável de ambiente segura no servidor backend (nunca expor no frontend).

---

## 3. Variáveis de Ambiente Necessárias

As variáveis de ambiente devem ser configuradas exclusivamente via secret manager no backend (`pb_hooks` / servidor):

| Variável | Descrição | Exemplo de Formato |
|---|---|---|
| `META_WA_API_VERSION` | Versão da Graph API | `v21.0` |
| `META_WA_PHONE_NUMBER_ID` | Identificador do número de telefone | `102938475610293` |
| `META_WA_BUSINESS_ACCOUNT_ID` | Identificador da conta WABA | `987654321098765` |
| `META_WA_ACCESS_TOKEN` | Token de sistema permanente | `EAAG...` |
| `META_WA_WEBHOOK_VERIFY_TOKEN` | Token arbitrário de validação GET | `elias_mansur_webhook_secret_2026` |
| `META_WA_APP_SECRET` | Chave secreta do App para validação HMAC | `a1b2c3d4e5f6...` |

> **Aviso de Segurança:** Nunca comitar valores reais de tokens ou chaves em repositórios de código.

---

## 4. Endpoints Graph API Utilizados

### 4.1 Envio de Mensagem de Modelo (Template)
Utilizado para iniciar conversas fora da janela de 24 horas (ex.: confirmações, lembretes de retorno, agendamentos).

- **Método:** `POST`
- **URL:** `https://graph.facebook.com/v21.0/{META_WA_PHONE_NUMBER_ID}/messages`
- **Headers:**
  - `Authorization: Bearer {META_WA_ACCESS_TOKEN}`
  - `Content-Type: application/json`

**Exemplo de Payload (Lembrete de Consulta):**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "template",
  "template": {
    "name": "lembrete_consulta_24h",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Maria Silva" },
          { "type": "text", "text": "amanhã às 14:30" },
          { "type": "text", "text": "Dr. Elias Mansur" }
        ]
      },
      {
        "type": "button",
        "sub_type": "quick_reply",
        "index": "0",
        "parameters": [
          { "type": "payload", "payload": "CONFIRMAR_PRESENCA_123" }
        ]
      }
    ]
  }
}
```

### 4.2 Envio de Mensagem de Texto Livre (Dentro da Janela de 24h)
Utilizado para respostas a mensagens enviadas pelo paciente dentro da janela aberta.

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Olá Maria! Recebemos sua mensagem. Seu retorno está confirmado para amanhã."
  }
}
```

### 4.3 Envio de Documentos e Laudos (Mídia / PDF)
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999998888",
  "type": "document",
  "document": {
    "link": "https://crm.clinicaeliasmansur.com.br/api/laudos/laudo_123.pdf",
    "caption": "Seu laudo de exames integrativos — Clínica Elias Mansur",
    "filename": "Laudo_Integrativo_MariaSilva.pdf"
  }
}
```

---

## 5. Webhook de Entrada (Recebimento de Mensagens e Status)

### 5.1 Endpoint de Verificação (`GET /api/webhook/whatsapp`)
A Meta realiza uma chamada GET para validar a titularidade da URL no momento da configuração:

```javascript
// Exemplo em pb_hooks ou rota de webhook
routerAdd('GET', '/api/webhook/whatsapp', (c) => {
  const mode = c.request().url.query().get('hub.mode');
  const token = c.request().url.query().get('hub.verify_token');
  const challenge = c.request().url.query().get('hub.challenge');

  const EXPECTED_TOKEN = $os.getenv('META_WA_WEBHOOK_VERIFY_TOKEN');

  if (mode === 'subscribe' && token === EXPECTED_TOKEN) {
    return c.string(200, challenge);
  }
  return c.string(403, 'Forbidden');
});
```

### 5.2 Endpoint de Eventos (`POST /api/webhook/whatsapp`)
Recebe notificações de:
1. **Status de Entrega:** `sent`, `delivered`, `read`, `failed` (com códigos de erro de entrega).
2. **Mensagens Recebidas:** texto, seleção de botões de resposta rápida, áudios e documentos.

**Processamento Obrigatório:**
- Validação da assinatura HMAC SHA-256 no header `X-Hub-Signature-256` utilizando o `META_WA_APP_SECRET`.
- Resposta `200 OK` imediata (dentro de 3 segundos) para evitar retentativas agressivas da Meta.
- Processamento assíncrono para atualizar a coleção `mensagens` do CRM e registrar status do paciente.

---

## 6. Mapeamento dos 19 Templates da Régua de Atendimento

Cada uma das 19 automações clínicas mapeadas no CRM deve ser submetida e aprovada no painel da Meta antes do disparo oficial:

| # | Identificador do CRM | Nome do Template Meta | Categoria | Variáveis |
|---|---|---|---|---|
| 1 | Boas-vindas — primeiro contato | `boas_vindas_lead` | MARKETING | `{{1}}`: Nome do paciente |
| 2 | Lembrete de consulta (24h antes) | `lembrete_consulta_24h` | UTILITY | `{{1}}`: Nome, `{{2}}`: Data/Hora, `{{3}}`: Profissional |
| 3 | Lembrete de consulta (2h antes) | `lembrete_consulta_2h` | UTILITY | `{{1}}`: Nome, `{{2}}`: Hora |
| 4 | Confirmação de presença (Check-in) | `confirmacao_presenca_checkin` | UTILITY | `{{1}}`: Nome |
| 5 | Agradecimento pós-consulta integrativa | `pos_consulta_agradecimento` | UTILITY | `{{1}}`: Nome |
| 6 | Orientações pré-aplicação APP | `pre_aplicacao_app_instrucoes` | UTILITY | `{{1}}`: Nome, `{{2}}`: Procedimento |
| 7 | Orientações pré-aplicação Venosa | `pre_aplicacao_venosa_cuidados` | UTILITY | `{{1}}`: Nome |
| 8 | Lembrete de sessão semanal | `lembrete_sessao_injetavel` | UTILITY | `{{1}}`: Nome, `{{2}}`: Sessão X de Y |
| 9 | Acompanhamento pós-aplicação (24h) | `pos_aplicacao_followup_24h` | UTILITY | `{{1}}`: Nome |
| 10 | Alerta de finalização de pacote | `alerta_final_pacote_tratamento` | UTILITY | `{{1}}`: Nome, `{{2}}`: Protocolo |
| 11 | Proposta de renovação de protocolo | `proposta_renovacao_protocolo` | MARKETING | `{{1}}`: Nome, `{{2}}`: Protocolo |
| 12 | Lembrete de retorno periódico (30d) | `retorno_periodico_30_dias` | UTILITY | `{{1}}`: Nome |
| 13 | Lembrete de retorno periódico (60d) | `retorno_periodico_60_dias` | UTILITY | `{{1}}`: Nome |
| 14 | Reativação de paciente inativo (90d) | `reativacao_paciente_longevidade` | MARKETING | `{{1}}`: Nome |
| 15 | Felicitações de aniversário | `aniversario_paciente` | MARKETING | `{{1}}`: Nome |
| 16 | Solicitação de exames de controle | `solicitacao_exames_controle` | UTILITY | `{{1}}`: Nome |
| 17 | Aviso de laudo disponível | `aviso_laudo_exames_pronto` | UTILITY | `{{1}}`: Nome |
| 18 | Instruções de jejum e preparo | `instrucoes_preparo_exames` | UTILITY | `{{1}}`: Nome, `{{2}}`: Horas de jejum |
| 19 | Pesquisa de satisfação e NPS | `pesquisa_satisfacao_nps` | UTILITY | `{{1}}`: Nome |

---

## 7. Regras de Negócio e Janela de Atendimento (24 Horas)

1. **Janela de 24 Horas de Conversação Livre:**
   - Inicia quando o paciente envia qualquer mensagem para o número da clínica.
   - Dentro dessa janela, a clínica pode enviar mensagens livres e respostas personalizadas sem aprovação prévia de template.
2. **Fora da Janela de 24 Horas:**
   - Apenas mensagens baseadas em **Templates pré-aprovados** podem ser enviadas.
   - Mensagens livres são rejeitadas pela Meta com erro `131047: Re-engagement message not allowed outside of 24h window`.
3. **Opt-in e Consentimento:**
   - O paciente deve concordar em receber mensagens de agendamento e saúde no momento do cadastro (LGPD).
   - O template deve conter botão ou instrução de cancelamento caso o paciente solicite interrupção.

---

## 8. Plano de Transição do Modo Simulado para o Modo Real

Para garantir transição suave e zero downtime da operação da clínica:

1. **Fase 1 (Atual — Simulado):** Disparos registrados na coleção `mensagens` do PocketBase com visualização nas telas simuladas (`/automacao/whatsapp`).
2. **Fase 2 (Homologação com Modo Híbrido / Fallback):**
   - Configurar flag `META_WA_ENABLED=true` no backend.
   - Se a chamada à Meta falhar (ex.: número inválido ou queda de conectividade), o backend registra o status `falha_envio` e salva o log na coleção de mensagens sem travar o CRM.
3. **Fase 3 (Go-Live em Produção):**
   - Ativação definitiva com número oficial verificado.
   - Jobs agendados via cron para disparos automáticos diários (ex.: lembretes de 24h às 09:00 e felicitações de aniversário às 08:00).

---

## 9. Jobs Agendados para Disparos Automáticos

Cron jobs implementados no backend para varredura diária da base:

- **08:00 diariamente:** Varredura de aniversariantes do dia (`aniversario_paciente`).
- **09:00 diariamente:** Varredura de agendamentos de amanhã (`lembrete_consulta_24h`).
- **A cada 30 minutos:** Varredura de agendamentos das próximas 2 horas (`lembrete_consulta_2h`).
- **10:00 diariamente:** Varredura de pacientes que completaram aplicação há 24h (`pos_aplicacao_followup_24h`).
- **14:00 segundas e quintas:** Varredura de pacientes inativos há 90 dias (`reativacao_paciente_longevidade`).

---

## 10. Checklist de Validação em Produção

- [ ] Empresa verificada no Meta Business Manager com CNPJ e razão social da Clínica Elias Mansur.
- [ ] Domínio verificado no Gerenciador de Negócios.
- [ ] Número de telefone exclusivo validado e operante com status "Conectado".
- [ ] Nome de exibição (*Display Name*) "Clínica Elias Mansur" aprovado pela Meta.
- [ ] Token de sistema permanente gerado com escopos de mensagens e negócios.
- [ ] Todos os 19 templates cadastrados, com categoria correta (UTILITY / MARKETING) e aprovados.
- [ ] URL de Webhook configurada e validada via desafio GET.
- [ ] Secret do Webhook validado via assinatura HMAC SHA-256 no backend.
- [ ] Teste de ponta a ponta: envio de template -> recebimento no celular -> clique no botão -> resposta via Webhook.
- [ ] Notificação de mensagens lidas e entregues refletida em tempo real no prontuário.
