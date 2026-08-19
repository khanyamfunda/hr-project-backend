import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Aphiwelukhobija@1',
    database: process.env.DB_NAME || 'moderntech_hr',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
