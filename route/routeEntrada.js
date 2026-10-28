const express = require('express');
const { pool } = require('../mysql');

const router = express.Router();
const fields = ['id_produto', 'id_fornecedor', 'quantidade', 'valor_unitario', 'data_entrada', 'observacao'];

router.get('/', (req, res) => {
    pool.query(
        `SELECT e.*, p.nome AS produto, f.nome AS fornecedor
         FROM entradas e
         JOIN produtos p ON p.id_produto = e.id_produto
         JOIN fornecedores f ON f.id_fornecedor = e.id_fornecedor
         ORDER BY e.data_entrada DESC, e.id_entrada DESC`,
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar entradas' });
            }
            res.json(results);
        }
    );
});

router.get('/:id', (req, res) => {
    pool.query(
        `SELECT e.*, p.nome AS produto, f.nome AS fornecedor
         FROM entradas e
         JOIN produtos p ON p.id_produto = e.id_produto
         JOIN fornecedores f ON f.id_fornecedor = e.id_fornecedor
         WHERE e.id_entrada = ?`,
        [req.params.id],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar entrada' });
            }
            if (results.length === 0) {
                return res.status(404).json({ erro: 'Entrada não encontrada' });
            }
            res.json(results[0]);
        }
    );
});

router.post('/', (req, res) => {
    const body = req.body || {};
    const missing = ['id_produto', 'id_fornecedor', 'quantidade', 'valor_unitario']
        .filter(field => body[field] === undefined || body[field] === null);
    if (missing.length > 0 || !Number.isInteger(Number(body.quantidade)) || Number(body.quantidade) <= 0) {
        return res.status(400).json({
            erro: 'Informe produto, fornecedor, quantidade inteira positiva e valor_unitario',
            campos_ausentes: missing
        });
    }

    const values = fields.map(field => body[field] === undefined ? null : body[field]);
    pool.query(
        `INSERT INTO entradas (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
        values,
        (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao registrar entrada' });
            }
            res.status(201).json({ id_entrada: result.insertId });
        }
    );
});

module.exports = router;
