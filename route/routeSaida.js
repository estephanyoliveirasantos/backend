const express = require('express');
const { pool } = require('../mysql');

const router = express.Router();
const fields = ['id_produto', 'id_funcionario', 'quantidade', 'valor_unitario', 'data_saida', 'destino'];

router.get('/', (req, res) => {
    pool.query(
        `SELECT s.*, p.nome AS produto, f.nome AS funcionario
         FROM saidas s
         JOIN produtos p ON p.id_produto = s.id_produto
         JOIN funcionarios f ON f.id_funcionario = s.id_funcionario
         ORDER BY s.data_saida DESC, s.id_saida DESC`,
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar saídas' });
            }
            res.json(results);
        }
    );
});

router.get('/:id', (req, res) => {
    pool.query(
        `SELECT s.*, p.nome AS produto, f.nome AS funcionario
         FROM saidas s
         JOIN produtos p ON p.id_produto = s.id_produto
         JOIN funcionarios f ON f.id_funcionario = s.id_funcionario
         WHERE s.id_saida = ?`,
        [req.params.id],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar saída' });
            }
            if (results.length === 0) {
                return res.status(404).json({ erro: 'Saída não encontrada' });
            }
            res.json(results[0]);
        }
    );
});

router.post('/', (req, res) => {
    const body = req.body || {};
    const missing = ['id_produto', 'id_funcionario', 'quantidade', 'valor_unitario']
        .filter(field => body[field] === undefined || body[field] === null);
    const quantity = Number(body.quantidade);
    if (missing.length > 0 || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
            erro: 'Informe produto, funcionário, quantidade inteira positiva e valor_unitario',
            campos_ausentes: missing
        });
    }

    pool.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error(connectionError);
            return res.status(500).json({ erro: 'Erro ao registrar saída' });
        }

        connection.beginTransaction(transactionError => {
            if (transactionError) {
                connection.release();
                console.error(transactionError);
                return res.status(500).json({ erro: 'Erro ao registrar saída' });
            }

            connection.query(
                'SELECT quantidade FROM estoque WHERE id_produto = ? FOR UPDATE',
                [body.id_produto],
                (stockError, stockRows) => {
                    if (stockError) {
                        return rollback(stockError);
                    }
                    if (stockRows.length === 0 || stockRows[0].quantidade < quantity) {
                        return rollback(null, 409, 'Estoque insuficiente para registrar a saída');
                    }

                    const values = fields.map(field => body[field] === undefined ? null : body[field]);
                    connection.query(
                        `INSERT INTO saidas (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
                        values,
                        (insertError, result) => {
                            if (insertError) {
                                return rollback(insertError);
                            }
                            connection.commit(commitError => {
                                if (commitError) {
                                    return rollback(commitError);
                                }
                                connection.release();
                                res.status(201).json({ id_saida: result.insertId });
                            });
                        }
                    );
                }
            );
        });

        function rollback(error, status = 500, message = 'Erro ao registrar saída') {
            connection.rollback(() => {
                connection.release();
                if (error) {
                    console.error(error);
                }
                res.status(status).json({ erro: message });
            });
        }
    });
});

module.exports = router;
