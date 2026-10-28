const express = require('express');
const { pool } = require('../mysql');

const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
    pool.query(
        `SELECT id_historico, id_produto, preco, vigencia
         FROM historico_precos
         WHERE id_produto = ?
         ORDER BY vigencia DESC, id_historico DESC`,
        [req.params.id],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar histórico de preços' });
            }
            res.json(results);
        }
    );
});

module.exports = router;
