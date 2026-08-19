import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const router = express.Router();


router.post('/register', async (req, res) => {
    try {
        const { employee_id, username, password, role } = req.body;

        // 1. Check if username or profile already has login credentials
        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE username = ? OR employee_id = ?', 
            [username, employee_id]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Username or employee profile already registered!" });
        }

        // 2. Implement bcrypt password hashing (Deliverable requirement)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Save clean user instance into the moderntech_hr database
        await pool.query(
            'INSERT INTO users (employee_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
            [employee_id, username, hashedPassword, role || 'Employee']
        );

        res.status(201).json({ message: "Secure user account created successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Registration engine failure: " + err.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Search for user entry inside the database
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid username or password!" });
        }

        const user = users[0];

        // 2. Safe comparison of typed password against the stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password!" });
        }

        // 3. Generate secure signed access control token (JWT)
        const token = jwt.sign(
            { user_id: user.user_id, employee_id: user.employee_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '4h' } // Token auto-expires in 4 hours for security
        );

        // 4. Return success to your Vue.js application frontend
        res.json({
            message: "Login authorized!",
            token: token,
            role: user.role,
            username: user.username
        });
    } catch (err) {
        res.status(500).json({ error: "Login engine transaction failure: " + err.message });
    }
});

export default router;
