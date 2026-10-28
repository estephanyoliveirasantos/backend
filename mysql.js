require('dotenv').config();
const mysql = require("mysql");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err);
        return;
    }

    console.log("Conexão com MySQL estabelecida!");

    connection.release();
});

exports.pool = pool;