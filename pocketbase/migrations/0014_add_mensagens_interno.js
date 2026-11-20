// Migration 0014 — adiciona o campo `interno` (bool) à collection `mensagens`.
// Mensagens internas da equipe (disparadas por automações com interno = true)
// devem ser marcadas com essa flag para serem filtradas das caixas de
// entrada simuladas de WhatsApp e E-mail.
//
// Não-required e sem default explícito no schema (bool não usa default no
// PocketBase): registros antigos leem como false, e o backfill abaixo grava
// false explicitamente para consistência.

migrate((app) => {
  const col = app.findCollectionByNameOrId("mensagens");

  if (!col.fields.getByName("interno")) {
    col.fields.add(new BoolField({ name: "interno" }));
    app.save(col);
  }

  // Backfill idempotente: toda mensagem existente passa a ter interno = false.
  app.db()
    .newQuery("UPDATE mensagens SET interno = false WHERE interno IS NULL")
    .execute();
}, (app) => {
  const col = app.findCollectionByNameOrId("mensagens");
  if (col.fields.getByName("interno")) {
    col.fields.removeByName("interno");
    app.save(col);
  }
});
