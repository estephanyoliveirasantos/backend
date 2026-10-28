const createCrudRouter = require('./crudRouter');

module.exports = createCrudRouter({
    table: 'funcionarios',
    idColumn: 'id_funcionario',
    fields: ['nome', 'cargo', 'salario', 'telefone', 'email', 'data_admissao', 'ativo'],
    requiredFields: ['nome', 'cargo', 'salario'],
    resource: 'Funcionário'
});
