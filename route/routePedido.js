const express = require('express');
const { pool } = require('../mysql');

const router = express.Router();

router.get('/', (req, res) => {
    pool.query(
        `SELECT p.*, c.nome AS cliente
         FROM pedidos p
         LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
         ORDER BY p.data_pedido DESC, p.id_pedido DESC`,
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar pedidos' });
            }
            res.json(results);
        }
    );
});

router.get('/:id', (req, res) => {
    pool.query(
        `SELECT p.*, c.nome AS cliente
         FROM pedidos p
         LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
         WHERE p.id_pedido = ?`,
        [req.params.id],
        (error, orders) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar pedido' });
            }
            if (orders.length === 0) {
                return res.status(404).json({ erro: 'Pedido não encontrado' });
            }
            pool.query(
                `SELECT i.*, p.nome AS produto
                 FROM pedido_itens i
                 LEFT JOIN produtos p ON p.id_produto = i.id_produto
                 WHERE i.id_pedido = ?
                 ORDER BY i.id_item`,
                [req.params.id],
                (itemsError, items) => {
                    if (itemsError) {
                        console.error(itemsError);
                        return res.status(500).json({ erro: 'Erro ao buscar itens do pedido' });
                    }
                    res.json({ ...orders[0], itens: items });
                }
            );
        }
    );
});

router.post('/', (req, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
        return res.status(400).json({ erro: 'Informe ao menos um item no pedido' });
    }
    const invalidItem = body.itens.some(item =>
        !item || item.id_produto === undefined ||
        !Number.isInteger(Number(item.quantidade)) || Number(item.quantidade) <= 0
    );
    if (invalidItem) {
        return res.status(400).json({ erro: 'Cada item deve conter produto e quantidade inteira positiva' });
    }

    pool.getConnection((connectionError, connection) => {
        if (connectionError) {
            console.error(connectionError);
            return res.status(500).json({ erro: 'Erro ao criar pedido' });
        }
        connection.beginTransaction(transactionError => {
            if (transactionError) {
                connection.release();
                console.error(transactionError);
                return res.status(500).json({ erro: 'Erro ao criar pedido' });
            }

            connection.query(
                'INSERT INTO pedidos (status, data_pedido, id_cliente) VALUES (?, ?, ?)',
                [body.status === undefined ? 1 : body.status, body.data_pedido || null, body.id_cliente || null],
                (orderError, orderResult) => {
                    if (orderError) {
                        return rollback(orderError);
                    }

                    insertItem(0, orderResult.insertId);
                }
            );

            function insertItem(index, orderId) {
                if (index === body.itens.length) {
                    return connection.commit(commitError => {
                        if (commitError) {
                            return rollback(commitError);
                        }
                        connection.release();
                        res.status(201).json({ id_pedido: orderId });
                    });
                }

                const item = body.itens[index];
                connection.query(
                    'SELECT preco FROM produtos WHERE id_produto = ?',
                    [item.id_produto],
                    (productError, products) => {
                        if (productError) {
                            return rollback(productError);
                        }
                        if (products.length === 0) {
                            return rollback(null, 400, `Produto ${item.id_produto} não encontrado`);
                        }
                        const unitPrice = item.valor_unitario === undefined
                            ? products[0].preco
                            : Number(item.valor_unitario);
                        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                            return rollback(null, 400, 'O valor_unitario deve ser um número não negativo');
                        }
                        connection.query(
                            `INSERT INTO pedido_itens
                             (id_pedido, id_produto, quantidade, valor_unitario, subtotal)
                             VALUES (?, ?, ?, ?, ROUND(? * ?, 2))`,
                            [
                                orderId, item.id_produto, Number(item.quantidade),
                                unitPrice, Number(item.quantidade), unitPrice
                            ],
                            insertError => {
                                if (insertError) {
                                    return rollback(insertError);
                                }
                                insertItem(index + 1, orderId);
                            }
                        );
                    }
                );
            }

            function rollback(error, status = 500, message = 'Erro ao criar pedido') {
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
});

router.patch('/:id', (req, res) => {
    const fields = ['status', 'data_pedido', 'id_cliente']
        .filter(field => Object.prototype.hasOwnProperty.call(req.body || {}, field));
    if (fields.length === 0) {
        return res.status(400).json({ erro: 'Informe status, data_pedido ou id_cliente' });
    }
    const assignments = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => req.body[field]);
    pool.query(
        `UPDATE pedidos SET ${assignments} WHERE id_pedido = ?`,
        [...values, req.params.id],
        (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao atualizar pedido' });
            }
            if (result.affectedRows === 0) {
                return pool.query(
                    'SELECT id_pedido FROM pedidos WHERE id_pedido = ?',
                    [req.params.id],
                    (lookupError, rows) => {
                        if (lookupError) {
                            console.error(lookupError);
                            return res.status(500).json({ erro: 'Erro ao atualizar pedido' });
                        }
                        if (rows.length === 0) {
                            return res.status(404).json({ erro: 'Pedido não encontrado' });
                        }
                        res.json({ mensagem: 'Pedido atualizado com sucesso' });
                    }
                );
            }
            res.json({ mensagem: 'Pedido atualizado com sucesso' });
        }
    );
});

module.exports = router;
