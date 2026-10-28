const express = require('express');
const { pool } = require('../mysql');

const router = express.Router();

router.get('/', (req, res) => {
    const sql = `SELECT e.id_estoque, e.id_produto, p.nome AS produto,
        e.quantidade, e.estoque_minimo, e.estoque_maximo, e.localizacao
        FROM estoque e
        JOIN produtos p ON p.id_produto = e.id_produto`;
    pool.query(sql, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ erro: 'Erro ao buscar estoque' });
        }
        res.json(results);
    });
});

router.get('/:produtoId', (req, res) => {
    const sql = `SELECT e.id_estoque, e.id_produto, p.nome AS produto,
        e.quantidade, e.estoque_minimo, e.estoque_maximo, e.localizacao
        FROM estoque e
        JOIN produtos p ON p.id_produto = e.id_produto
        WHERE e.id_produto = ?`;
    pool.query(sql, [req.params.produtoId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ erro: 'Erro ao buscar estoque' });
        }
        if (results.length === 0) {
            return res.status(404).json({ erro: 'Estoque do produto não encontrado' });
        }
        res.json(results[0]);
    });
});

router.patch('/:produtoId', (req, res) => {
    const fields = ['estoque_minimo', 'estoque_maximo', 'localizacao']
        .filter(field => Object.prototype.hasOwnProperty.call(req.body || {}, field));
    if (fields.length === 0) {
        return res.status(400).json({ erro: 'Informe estoque_minimo, estoque_maximo ou localizacao' });
    }

    const assignments = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => req.body[field]);
    pool.query(
        `UPDATE estoque SET ${assignments} WHERE id_produto = ?`,
        [...values, req.params.produtoId],
        (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao atualizar estoque' });
            }
            if (result.affectedRows === 0) {
                return pool.query(
                    'SELECT id_estoque FROM estoque WHERE id_produto = ?',
                    [req.params.produtoId],
                    (lookupError, results) => {
                        if (lookupError) {
                            console.error(lookupError);
                            return res.status(500).json({ erro: 'Erro ao atualizar estoque' });
                        }
                        if (results.length === 0) {
                            return res.status(404).json({ erro: 'Estoque do produto não encontrado' });
                        }
                        res.json({ mensagem: 'Estoque atualizado com sucesso' });
                    }
                );
            }
            res.json({ mensagem: 'Estoque atualizado com sucesso' });
        }
    );
});

module.exports = router;
