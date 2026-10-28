const express = require('express');
const { pool } = require('../mysql');

const router = express.Router();

router.get('/', (req, res) => {
    pool.query(
        `SELECT m.*, p.nome AS produto
         FROM movimentacoes m
         LEFT JOIN produtos p ON p.id_produto = m.id_produto
         ORDER BY m.data_movimentacao DESC, m.id_movimentacao DESC`,
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar movimentações' });
            }
            res.json(results);
        }
    );
});

router.get('/:id', (req, res) => {
    pool.query(
        `SELECT m.*, p.nome AS produto
         FROM movimentacoes m
         LEFT JOIN produtos p ON p.id_produto = m.id_produto
         WHERE m.id_movimentacao = ?`,
        [req.params.id],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar movimentação' });
            }
            if (results.length === 0) {
                return res.status(404).json({ erro: 'Movimentação não encontrada' });
            }
            res.json(results[0]);
        }
    );
});

module.exports = router;
