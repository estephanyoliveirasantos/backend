const createCrudRouter = require('./crudRouter');

module.exports = createCrudRouter({
    table: 'clientes',
    idColumn: 'id_cliente',
    fields: ['nome', 'email', 'contato', 'ativo'],
    requiredFields: ['nome', 'email'],
    resource: 'Cliente'
});
