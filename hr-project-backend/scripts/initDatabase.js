import 'dotenv/config';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';

const schema = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
});

try {
    await connection.query(schema);
    console.log(`Database ${process.env.DB_NAME || 'moderntech_hr'} initialized from schema.sql.`);
} finally {
    await connection.end();
}