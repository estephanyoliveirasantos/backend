const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const { authenticate } = require('./middleware/authenticate');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const routerUsuario = require('./route/routeUsuario');
const routerFuncionario = require('./route/routeFuncionario');
const routerProduto = require('./route/routeProduto');
const routerCategoria = require('./route/routeCategoria');
const routerCliente = require('./route/routeCliente');
const routerFornecedor = require('./route/routeFornecedor');
const routerEstoque = require('./route/routeEstoque');
const routerEntrada = require('./route/routeEntrada');
const routerSaida = require('./route/routeSaida');
const routerMovimentacao = require('./route/routeMovimentacao');
const routerPedido = require('./route/routePedido');
const routerHistoricoPrecos = require('./route/routeHistoricoPrecos');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

app.use('/usuario', (req, res, next) => {
    if (req.method === 'POST' && req.path === '/login') {
        return next();
    }
    authenticate(req, res, next);
}, routerUsuario);
app.use('/funcionario/funcionarios', authenticate, routerFuncionario);
app.use('/funcionarios', authenticate, routerFuncionario);
app.use('/produtos', authenticate, routerProduto);
app.use('/categorias', authenticate, routerCategoria);
app.use('/clientes', authenticate, routerCliente);
app.use('/fornecedores', authenticate, routerFornecedor);
app.use('/estoque', authenticate, routerEstoque);
app.use('/entradas', authenticate, routerEntrada);
app.use('/saidas', authenticate, routerSaida);
app.use('/movimentacoes', authenticate, routerMovimentacao);
app.use('/pedidos', authenticate, routerPedido);
app.use('/produtos/:id/historico-precos', authenticate, routerHistoricoPrecos);

app.get('/teste', (req, res) => {
    res.status(200).send({
        mensagem: 'Tudo OK'
    });
});

// Tratamento de erros
app.use((req, res, next) => {
    const erro = new Error("Não encontrado!");
    erro.status = 404;
    next(erro);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    return res.json({
        erro: {
            mensagem: error.message
        }
    });
});

module.exports = app;