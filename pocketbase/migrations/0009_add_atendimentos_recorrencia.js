migrate((app) => {
  const col = app.findCollectionByNameOrId('atendimentos')

  if (!col.fields.getByName('serie_recorrencia_id')) {
    col.fields.add(new TextField({
      name: 'serie_recorrencia_id',
      required: false,
    }))
  }

  if (!col.fields.getByName('numero_recorrencia')) {
    col.fields.add(new NumberField({
      name: 'numero_recorrencia',
      required: false,
    }))
  }

  if (!col.fields.getByName('total_recorrencias')) {
    col.fields.add(new NumberField({
      name: 'total_recorrencias',
      required: false,
    }))
  }

  app.save(col)
}, (app) => {
  const col = app.findCollectionByNameOrId('atendimentos')
  col.fields.removeByName('serie_recorrencia_id')
  col.fields.removeByName('numero_recorrencia')
  col.fields.removeByName('total_recorrencias')
  app.save(col)
})
