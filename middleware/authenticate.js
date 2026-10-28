const crypto = require('crypto');

const TOKEN_LIFETIME_SECONDS = 60 * 60;

function getTokenSecret() {
    const secret = process.env.AUTH_TOKEN_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error('AUTH_TOKEN_SECRET deve ter pelo menos 32 bytes');
    }
    return secret;
}

function createToken(userId) {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: String(userId),
        iat: now,
        exp: now + TOKEN_LIFETIME_SECONDS
    })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', getTokenSecret())
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
}

function verifyToken(token) {
    if (typeof token !== 'string') {
        return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [payload, signature] = parts;
    const expectedSignature = crypto
        .createHmac('sha256', getTokenSecret())
        .update(payload)
        .digest();
    const receivedSignature = Buffer.from(signature, 'base64url');
    if (
        receivedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
        return null;
    }

    try {
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        return typeof claims.sub === 'string' &&
            claims.sub.length > 0 &&
            Number.isInteger(claims.exp) &&
            claims.exp > now
            ? claims
            : null;
    } catch (error) {
        return null;
    }
}

function authenticate(req, res, next) {
    try {
        getTokenSecret();
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ erro: 'Autenticação não configurada no servidor' });
    }

    const authorization = req.get('Authorization') || '';
    const match = authorization.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
        return res.status(401).json({ erro: 'Autenticação necessária' });
    }

    try {
        const claims = verifyToken(match[1]);
        if (!claims) {
            return res.status(401).json({ erro: 'Token inválido ou expirado' });
        }
        req.auth = { userId: claims.sub };
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao validar autenticação' });
    }

    next();
}

module.exports = { authenticate, createToken };
