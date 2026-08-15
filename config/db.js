import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Aphiwelukhobija@1', // Your exact MySQL password
    database: 'moderntech_hr',     // Your exact database name
    port: 3307,                    // Your exact MySQL port
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;
