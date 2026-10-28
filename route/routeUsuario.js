const express = require('express');
const crypto = require('crypto');
const { pool } = require('../mysql');
const { createToken } = require('../middleware/authenticate');

const router = express.Router();
const publicColumns = 'id_usu, nome, email, contato, genero, ativo, criado_em, atualizado_em';

function hashPassword(password, callback) {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) {
            return callback(error);
        }
        callback(null, `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
}

function verifyPassword(password, passwordHash, callback) {
    const parts = typeof passwordHash === 'string' ? passwordHash.split('$') : [];
    if (
        parts.length !== 3 ||
        parts[0] !== 'scrypt' ||
        !/^[a-f0-9]{32}$/i.test(parts[1]) ||
        !/^[a-f0-9]{128}$/i.test(parts[2])
    ) {
        return callback(null, false);
    }

    const salt = Buffer.from(parts[1], 'hex');
    const expectedHash = Buffer.from(parts[2], 'hex');
    crypto.scrypt(password, salt, expectedHash.length, (error, derivedKey) => {
        if (error) {
            return callback(error);
        }
        callback(null, crypto.timingSafeEqual(derivedKey, expectedHash));
    });
}

router.post('/login', (req, res) => {
    const body = req.body || {};
    if (
        typeof body.email !== 'string' ||
        body.email.trim().length === 0 ||
        typeof body.senha !== 'string' ||
        body.senha.length === 0
    ) {
        return res.status(400).json({ erro: 'Informe email e senha' });
    }

    pool.query(
        `SELECT id_usu, nome, email, senha_hash, ativo FROM usuarios WHERE email = ? LIMIT 1`,
        [body.email.trim()],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao autenticar usuário' });
            }
            if (results.length === 0 || Number(results[0].ativo) !== 1) {
                return res.status(401).json({ erro: 'Email ou senha inválidos' });
            }

            verifyPassword(body.senha, results[0].senha_hash, (verifyError, validPassword) => {
                if (verifyError) {
                    console.error(verifyError);
                    return res.status(500).json({ erro: 'Erro ao autenticar usuário' });
                }
                if (!validPassword) {
                    return res.status(401).json({ erro: 'Email ou senha inválidos' });
                }

                let token;
                try {
                    token = createToken(results[0].id_usu);
                } catch (tokenError) {
                    console.error(tokenError.message);
                    return res.status(500).json({ erro: 'Autenticação não configurada no servidor' });
                }

                res.json({
                    mensagem: 'Login realizado com sucesso',
                    token,
                    tipo: 'Bearer',
                    expira_em: 3600,
                    usuario: {
                        id_usu: results[0].id_usu,
                        nome: results[0].nome,
                        email: results[0].email
                    }
                });
            });
        }
    );
});

router.get('/', (req, res) => {
    pool.query(`SELECT ${publicColumns} FROM usuarios`, (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ erro: 'Erro ao buscar usuários' });
        }
        res.json({ usuarios: results });
    });
});

router.get('/:id', (req, res) => {
    pool.query(
        `SELECT ${publicColumns} FROM usuarios WHERE id_usu = ?`,
        [req.params.id],
        (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao buscar usuário' });
            }
            if (results.length === 0) {
                return res.status(404).json({ erro: 'Usuário não encontrado' });
            }
            res.json({ usuario: results[0] });
        }
    );
});

router.post('/', (req, res) => {
    const body = req.body || {};
    if (!body.nome || !body.email || typeof body.senha !== 'string' || body.senha.length === 0) {
        return res.status(400).json({ erro: 'Informe nome, email e senha' });
    }

    hashPassword(body.senha, (hashError, senhaHash) => {
        if (hashError) {
            console.error(hashError);
            return res.status(500).json({ erro: 'Erro ao proteger senha do usuário' });
        }
        pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, contato, genero, ativo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                body.nome, body.email, senhaHash, body.contato || null,
                body.genero || null, body.ativo === undefined ? 1 : body.ativo
            ],
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: 'Erro ao criar usuário' });
                }
                res.status(201).json({
                    mensagem: 'Usuário criado com sucesso',
                    id_usuario: result.insertId
                });
            }
        );
    });
});

router.patch('/:id', (req, res) => {
    const body = req.body || {};
    const fields = ['nome', 'email', 'contato', 'genero', 'ativo']
        .filter(field => Object.prototype.hasOwnProperty.call(body, field));
    if (typeof body.senha === 'string' && body.senha.length > 0) {
        hashPassword(body.senha, (hashError, senhaHash) => {
            if (hashError) {
                console.error(hashError);
                return res.status(500).json({ erro: 'Erro ao proteger senha do usuário' });
            }
            updateUser([...fields, 'senha_hash'], [...fields.map(field => body[field]), senhaHash]);
        });
        return;
    }
    if (fields.length === 0) {
        return res.status(400).json({ erro: 'Nenhum campo válido informado' });
    }
    updateUser(fields, fields.map(field => body[field]));

    function updateUser(updateFields, values) {
        const assignments = updateFields.map(field => `${field} = ?`).join(', ');
        pool.query(
            `UPDATE usuarios SET ${assignments} WHERE id_usu = ?`,
            [...values, req.params.id],
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ erro: 'Erro ao atualizar usuário' });
                }
                if (result.affectedRows === 0) {
                    return pool.query(
                        'SELECT id_usu FROM usuarios WHERE id_usu = ?',
                        [req.params.id],
                        (lookupError, rows) => {
                            if (lookupError) {
                                console.error(lookupError);
                                return res.status(500).json({ erro: 'Erro ao atualizar usuário' });
                            }
                            if (rows.length === 0) {
                                return res.status(404).json({ erro: 'Usuário não encontrado' });
                            }
                            res.json({ mensagem: 'Usuário atualizado com sucesso' });
                        }
                    );
                }
                res.json({ mensagem: 'Usuário atualizado com sucesso' });
            }
        );
    }
});

router.delete('/:id', (req, res) => {
    pool.query(
        'DELETE FROM usuarios WHERE id_usu = ?',
        [req.params.id],
        (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ erro: 'Erro ao remover usuário' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: 'Usuário não encontrado' });
            }
            res.json({ mensagem: 'Usuário removido com sucesso' });
        }
    );
});

module.exports = router;
