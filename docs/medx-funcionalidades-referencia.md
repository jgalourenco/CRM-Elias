# MedX (care-app65) — Referência de funcionalidades

Fonte: https://care-app65.medx.med.br/pages_front_Desk/hoje.html
Levantamento: REA (CDP passivo) na tela "Hoje", logada pelo usuário, em 20/10/2026.

**Escopo desta versão:** só a tela "Hoje" foi observada. O REA não executa cliques nem navegação
no modo passivo, então fluxos internos (cadastros, edição, financeiro, relatórios) ainda não foram
mapeados. A seção "Lacunas" lista o que falta.

## 1. Estrutura técnica observada

| Item | Evidência | Implicação para o CRM |
|---|---|---|
| SPA com AngularJS (`ng-app`) | atributo no `<html>`, `angular.min.js` | Padrão de controllers e services; equivalente no projeto atual é React |
| Kendo UI (`kendo.all.min.js`, pt-BR) | scripts e CSS | Componentes de grade, calendário e formulários prontos |
| Bootstrap + Material Icons | `bootstrap.min.css`, `material-icons.css` | Layout em grid e ícones |
| Dexie (IndexedDB) | `js/dexie/dist/dexie.js` | Cache local; a tela pode funcionar com dados parciais |
| ngStorage | `js/ngStorage.min.js` | Persistência de sessão no navegador |
| Criptografia no cliente (RSA, SHA1, BigInt) | `System.Security.Cryptography.*.js` | Dados sensíveis são criptografados antes de sair do navegador. Ver nota de segurança |
| Tour guiado | `js/tutorial-tour/tour.js` + `tutoriais/hoje.js` | Onboarding por tutorial passo a passo |
| Toasts | `toastr.min.js` | Feedback de ações |
| Versionamento por query string | `?version=20261017c` | Controle de cache de assets |

Serviços e módulos de aplicação (arquivos próprios do MedX):

- `menuController.js`: menu principal e navegação
- `funcoes.js`: utilitários gerais
- `services/httpServicesMEDX.js`: camada central de chamadas HTTP à API
- `services/usuario.js`: dados e perfil do usuário logado
- `services/newChat.js`: chat interno
- `services/tutoriais.js`: conteúdo dos tutoriais
- `pages_front_Desk/controllers/hoje.js`: lógica da tela "Hoje" (~80 KB)
- `filters/dataFilters.js`, `filters/statusFilters.js`, `filters/htmlFilters.js`: formatação de datas, status e HTML

## 2. Funcionalidades da tela "Hoje" (observadas)

Confirmadas pela árvore de acessibilidade ou pelos recursos carregados:

1. **Agenda do dia**
   - Aba "Ver agenda 20/10/2026" (data atual no título da aba).
2. **Pacientes atendidos**
   - Aba "Ver pacientes atendidos" com a lista do dia.
3. **Calendário mensal**
   - Cabeçalho "outubro 2026" com botões Previous/Next e grade de dias.
4. **Notas (cadastro de notas)**
   - Cartão "Notas" com botão "Ver cadastro de notas".
5. **Notificações**
   - Cartão "Notificações" com contador (0 no momento da captura).
6. **Espaço patrocinado / destaque**
   - Cartão "Patrocinado" com link "Ver todos". Confirma que a tela tem um espaço de destaque
     ou comunicação, além dos dados operacionais.

Inferidas pelos recursos carregados (precisam de confirmação ao navegar):

7. **Atendimento por ticket** (`ticket.css`) — fila ou senha de atendimento.
8. **Popup de preços** (`popupPreco.css`) — consulta de tabela de preços.
9. **Cobrança**: ícones de boleto e cartão de crédito (`icones_boleto.png`, `credit-card-icon.png`).
10. **Contato por WhatsApp** (`img/whatsapp.png`).
11. **Evolução inteligente** (`evolucaointeligente_popup.png`) — popup de evolução clínica; o nome sugere
    apoio por IA, a confirmar.
12. **Gamificação / ranking** — imagens de medalhas ouro, prata e bronze (`goldmedal.png`,
    `silvermedal.png`, `bronzemedal.png`). Pode ser metas ou ranking de equipe, a confirmar.
13. **Chat interno** (`newChat.js`).
14. **Tutoriais e tour** (`tutoriais.js`, `tour.js`).
15. **Modo offline parcial** (Dexie).

## 3. Lacunas (não observado ainda)

O REA em modo passivo captura só o estado inicial da tela. Para documentar os itens 7 a 15 e os
fluxos abaixo, é preciso navegar em cada seção e capturar de novo:

- Cadastro e ficha do paciente (anamnese, histórico, documentos)
- Agenda completa (dia, semana, mês), criação e remarcação de horário, bloqueios e status de consulta
- Atendimento / evolução clínica e prescrições
- Financeiro: cobranças, boleto, cartão, recebimentos, caixa, comissões
- Estoque e produtos, se houver
- Relatórios e indicadores
- Configurações: usuários, perfis, preços, convênios
- Chat e notificações: origem, tipos e fluxo de leitura

## 4. Nota de segurança

Scripts de RSA e SHA1 rodam no navegador. Isso indica criptografia de payload ou de senha no cliente.
Vale checar no CRM novo se credenciais e dados sensíveis trafegam com TLS e hash/criptografia
adequados no servidor, já que criptografia no cliente não substitui essas proteções.

## 5. Próximos passos sugeridos

1. Navegar, na janela do Chrome de depuração, nas seções principais (Pacientes, Agenda, Financeiro,
   Notas, Configurações) e avisar para cada uma. Eu rodo o REA em cada tela e acrescento o levantamento.
2. Se for permitido, exportar o `hoje.js` e os services para análise de regras de negócio (status,
   permissões, cálculos). Sem isso, as regras ficam como inferência.
3. Mapear o resultado contra o `RESUMO.md` do CRM atual para separar o que já existe do que falta.
