import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import pool from './config/db.js';
import { verifyToken, authorizeRoles } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

async function ensureEmployeeSchema() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM employees');
        const hasStartDate = columns.some((column) => column.Field === 'start_date');

        if (!hasStartDate) {
            await pool.query('ALTER TABLE employees ADD COLUMN start_date DATE NULL AFTER department_id');
            console.log('Migration: added employees.start_date column');
        }
    } catch (error) {
        console.error('Schema migration failed:', error.message);
    }
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'ModernTech HR API is running',
        endpoints: [
            '/api/auth/login',
            '/api/auth/register',
            '/api/employees',
            '/api/departments',
            '/api/payroll/summary'
        ]
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/api/payroll/summary', verifyToken, authorizeRoles('HR Staff', 'Manager'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM payroll');
        res.json({ message: 'Secure payroll records accessed.', data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

ensureEmployeeSchema();

app.listen(PORT, () => {
    console.log(`ModernTech HR Full-Stack Architecture running on http://localhost:${PORT}`);
});
