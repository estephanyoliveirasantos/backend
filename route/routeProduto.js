const express = require('express');

const router = express.Router();

const { pool } = require("../mysql").pool;


// LISTAR PRODUTOS

router.get('/', (req, res) => {

    pool.getConnection((error, conn) => {

        if (error) return res.status(500).send({ error });

        conn.query("SELECT * FROM produtos", (error, resultado) => {

            conn.release();

            if (error) return res.status(500).send({ error });

            res.status(200).send({ produtos: resultado });

        });

    });

});


// BUSCAR PRODUTO PELO ID

router.get('/:id', (req, res, next) => {

    pool.getConnection((error, conn) => {

        if (error) return res.status(500).send({ error });

        conn.query(
            "SELECT * FROM produtos WHERE id_produto = ?",
            [req.params.id],

            (error, resultado) => {

                conn.release();

                if (error) return res.status(500).send({ error });

                res.status(200).send({ produto: resultado });

            }
        );

    });

});


// CADASTRAR PRODUTO

router.post('/', (req, res, next) => {

    pool.getConnection((error, conn) => {

        if (error) return res.status(500).send({ error });

        conn.query(

            "INSERT INTO produtos (nome, descricao, preco, imagem_produto, id_categoria) VALUES (?, ?, ?, ?, ?)",

            [
                req.body.nome,
                req.body.descricao,
                req.body.preco,
                req.body.imagem_produto,
                req.body.id_categoria
            ],

            (error, resultado) => {

                conn.release();

                if (error) return res.status(500).send({ error });

                res.status(201).send({

                    mensagem: "Produto criado com sucesso!",

                    id_produto: resultado.insertId

                });

            }

        );

    });

});


// ATUALIZAR PRODUTO

router.patch('/:id', (req, res, next) => {
    pool.getConnection((error, conn) => {
        if (error) return res.status(500).send({ error });

        const fields = ['nome', 'descricao', 'preco', 'imagem_produto', 'id_categoria']
            .filter(field => Object.prototype.hasOwnProperty.call(req.body || {}, field));
        if (fields.length === 0) {
            conn.release();
            return res.status(400).json({ erro: 'Nenhum campo válido informado' });
        }
        const assignments = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => req.body[field]);
        conn.query(
            `UPDATE produtos SET ${assignments} WHERE id_produto = ?`,
            [...values, req.params.id],
            (updateError, result) => {
                conn.release();
                if (updateError) return res.status(500).send({ error: updateError });
                if (result.affectedRows === 0) {
                    return pool.query(
                        'SELECT id_produto FROM produtos WHERE id_produto = ?',
                        [req.params.id],
                        (lookupError, rows) => {
                            if (lookupError) return res.status(500).send({ error: lookupError });
                            if (rows.length === 0) {
                                return res.status(404).json({ erro: 'Produto não encontrado' });
                            }
                            res.status(200).json({ mensagem: 'Produto atualizado com sucesso!' });
                        }
                    );
                }
                res.status(200).json({ mensagem: 'Produto atualizado com sucesso!' });
            }
        );
    });
});


// EXCLUIR PRODUTO

router.delete('/:id', (req, res, next) => {

    pool.getConnection((error, conn) => {

        if (error) return res.status(500).send({ error });

        conn.query(

            "DELETE FROM produtos WHERE id_produto = ?",

            [req.params.id],

            (error, resultado) => {

                conn.release();

                if (error) return res.status(500).send({ error });

                res.status(202).send({

                    mensagem: "Produto removido com sucesso!"

                });

            }

        );

    });

});


module.exports = router;