const express = require('express');
const { pool } = require('../mysql');

function createCrudRouter({ table, idColumn, fields, requiredFields, resource }) {
    const router = express.Router();
    const columns = [idColumn, ...fields].join(', ');

    router.get('/', (req, res) => {
        pool.query(`SELECT ${columns} FROM ${table}`, (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: `Erro ao buscar ${resource}` });
            }
            res.json(results);
        });
    });

    router.get('/:id', (req, res) => {
        pool.query(
            `SELECT ${columns} FROM ${table} WHERE ${idColumn} = ?`,
            [req.params.id],
            (error, results) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: `Erro ao buscar ${resource}` });
                }
                if (results.length === 0) {
                    return res.status(404).json({ erro: `${resource} não encontrado(a)` });
                }
                res.json(results[0]);
            }
        );
    });

    router.post('/', (req, res) => {
        const body = req.body || {};
        const missingFields = requiredFields.filter(
            field => body[field] === undefined || body[field] === null
        );
        if (missingFields.length > 0) {
            return res.status(400).json({
                erro: 'Campos obrigatórios ausentes',
                campos: missingFields
            });
        }

        const providedFields = fields.filter(field =>
            Object.prototype.hasOwnProperty.call(body, field)
        );
        if (providedFields.length === 0) {
            return res.status(400).json({ erro: 'Nenhum campo válido informado' });
        }

        const values = providedFields.map(field => body[field]);
        const placeholders = providedFields.map(() => '?').join(', ');
        pool.query(
            `INSERT INTO ${table} (${providedFields.join(', ')}) VALUES (${placeholders})`,
            values,
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: `Erro ao criar ${resource}` });
                }
                res.status(201).json({ id: result.insertId });
            }
        );
    });

    router.patch('/:id', (req, res) => {
        const body = req.body || {};
        const providedFields = fields.filter(field =>
            Object.prototype.hasOwnProperty.call(body, field)
        );
        if (providedFields.length === 0) {
            return res.status(400).json({ erro: 'Nenhum campo válido informado' });
        }

        const assignments = providedFields.map(field => `${field} = ?`).join(', ');
        const values = providedFields.map(field => body[field]);
        pool.query(
            `UPDATE ${table} SET ${assignments} WHERE ${idColumn} = ?`,
            [...values, req.params.id],
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: `Erro ao atualizar ${resource}` });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ erro: `${resource} não encontrado(a)` });
                }
                res.json({ mensagem: `${resource} atualizado(a) com sucesso` });
            }
        );
    });

    router.delete('/:id', (req, res) => {
        pool.query(
            `DELETE FROM ${table} WHERE ${idColumn} = ?`,
            [req.params.id],
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: `Erro ao excluir ${resource}` });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ erro: `${resource} não encontrado(a)` });
                }
                res.json({ mensagem: `${resource} removido(a) com sucesso` });
            }
        );
    });

    return router;
}

module.exports = createCrudRouter;
