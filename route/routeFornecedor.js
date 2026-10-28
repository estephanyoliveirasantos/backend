const createCrudRouter = require('./crudRouter');

module.exports = createCrudRouter({
    table: 'fornecedores',
    idColumn: 'id_fornecedor',
    fields: ['nome', 'empresa', 'email', 'telefone', 'cidade', 'estado', 'ativo'],
    requiredFields: ['nome'],
    resource: 'Fornecedor'
});
