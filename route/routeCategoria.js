const createCrudRouter = require('./crudRouter');

module.exports = createCrudRouter({
    table: 'categorias',
    idColumn: 'id_categoria',
    fields: ['nome', 'descricao', 'ativo'],
    requiredFields: ['nome'],
    resource: 'Categoria'
});
