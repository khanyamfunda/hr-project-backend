import bcrypt from 'bcrypt';
import pool from '../config/db.js';

// Data mapper helper to normalize column names to camelCase for the frontend UI
const toEmployeeResponse = (row) => ({
    id: row.employee_id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    departmentId: row.department_id,
    department: row.department_name || '',
    role: row.job_title,
    salary: Number(row.salary),
    history: row.employment_history || '',
    startDate: row.start_date || null,
    createdAt: row.created_at || null
});

// @desc    Get all employees
// @route   GET /api/employees
export const getAllEmployees = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.salary,
                   e.employment_history, e.department_id, e.start_date,
                   d.department_name
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            ORDER BY e.employee_id ASC
        `);
        res.json(rows.map(toEmployeeResponse));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get single employee by ID
// @route   GET /api/employees/:id
export const getEmployeeById = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const isPrivileged = ['HR Staff', 'Manager'].includes(req.user.role);

        if (!isPrivileged && req.user.employee_id !== employeeId) {
            return res.status(403).json({ error: 'You can only view your own employee profile.' });
        }

        const [rows] = await pool.query(`
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.salary,
                   e.employment_history, e.department_id, e.start_date,
                   d.department_name
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            WHERE e.employee_id = ?
        `, [employeeId]);

        if (!rows.length) {
            return res.status(404).json({ error: 'Employee not found.' });
        }
        res.json(toEmployeeResponse(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Create a new employee
// @route   POST /api/employees
export const createEmployee = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            departmentId,
            department,
            role,
            salary,
            history,
            startDate
        } = req.body || {};

        const cleanFirstName = String(firstName || '').trim();
        const cleanLastName = String(lastName || '').trim();
        const cleanEmail = String(email || '').trim();
        const cleanRole = String(role || '').trim();
        const cleanDepartmentName = String(department || '').trim();
        const cleanHistory = String(history || '').trim();
        const cleanSalary = Number(salary);
        const cleanStartDate = startDate ? String(startDate) : null;

        if (!cleanFirstName || !cleanLastName) {
            return res.status(400).json({ error: 'First name and last name are required.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
            return res.status(400).json({ error: 'A valid work email is required.' });
        }
        if (!cleanRole) {
            return res.status(400).json({ error: 'Role is required.' });
        }
        if (!Number.isFinite(cleanSalary) || cleanSalary < 120000) {
            return res.status(400).json({ error: 'Salary must be at least R120,000.' });
        }
        if (!cleanStartDate) {
            return res.status(400).json({ error: 'Start date is required.' });
        }

        let resolvedDepartmentId = Number(departmentId);

        if (!resolvedDepartmentId && cleanDepartmentName) {
            const [departmentRows] = await pool.query(
                'SELECT department_id FROM departments WHERE department_name = ? LIMIT 1',
                [cleanDepartmentName]
            );

            if (departmentRows.length) {
                resolvedDepartmentId = departmentRows[0].department_id;
            } else {
                const [departmentResult] = await pool.query(
                    'INSERT INTO departments (department_name) VALUES (?)',
                    [cleanDepartmentName]
                );
                resolvedDepartmentId = departmentResult.insertId;
            }
        }

        if (!resolvedDepartmentId) {
            return res.status(400).json({ error: 'Department is required.' });
        }

        const [emailCheck] = await pool.query(
            'SELECT employee_id FROM employees WHERE email = ?',
            [cleanEmail]
        );
        if (emailCheck.length > 0) {
            return res.status(409).json({ error: 'Employee email already exists.' });
        }

        const [result] = await pool.query(
            `INSERT INTO employees (first_name, last_name, email, job_title, salary, employment_history, department_id, start_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [cleanFirstName, cleanLastName, cleanEmail, cleanRole, cleanSalary, cleanHistory || 'Added through HR portal.', resolvedDepartmentId, cleanStartDate]
        );

        await pool.query(
            'INSERT INTO payroll (employee_id, hours_worked, leave_deductions, final_salary) VALUES (?, 0, 0, ?)',
            [result.insertId, cleanSalary / 12]
        );

        const generatedPasswordHash = await bcrypt.hash(`${cleanEmail}:${process.env.JWT_SECRET || 'moderntech'}`, 10);
        await pool.query(
            'INSERT INTO users (employee_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
            [result.insertId, cleanEmail, generatedPasswordHash, 'Employee']
        );

        const [rows] = await pool.query(`
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.salary,
                   e.employment_history, e.department_id, e.start_date, d.department_name
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            WHERE e.employee_id = ?
        `, [result.insertId]);

        res.status(201).json(toEmployeeResponse(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Update an employee profile
// @route   PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const {
            firstName,
            lastName,
            email,
            departmentId,
            department,
            role,
            salary,
            history,
            startDate
        } = req.body || {};

        const cleanFirstName = String(firstName || '').trim();
        const cleanLastName = String(lastName || '').trim();
        const cleanEmail = String(email || '').trim();
        const cleanRole = String(role || '').trim();
        const cleanDepartmentName = String(department || '').trim();
        const cleanHistory = String(history || '').trim();
        const cleanSalary = Number(salary);
        const cleanStartDate = startDate ? String(startDate) : null;

        if (!cleanFirstName || !cleanLastName) {
            return res.status(400).json({ error: 'First name and last name are required.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
            return res.status(400).json({ error: 'A valid work email is required.' });
        }
        if (!cleanRole) {
            return res.status(400).json({ error: 'Role is required.' });
        }
        if (!Number.isFinite(cleanSalary) || cleanSalary < 120000) {
            return res.status(400).json({ error: 'Salary must be at least R120,000.' });
        }
        if (!cleanStartDate) {
            return res.status(400).json({ error: 'Start date is required.' });
        }

        const [existingEmployee] = await pool.query(
            'SELECT employee_id FROM employees WHERE employee_id = ?',
            [employeeId]
        );
        if (existingEmployee.length === 0) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        const [emailConflictCheck] = await pool.query(
            'SELECT employee_id FROM employees WHERE email = ? AND employee_id != ?',
            [cleanEmail, employeeId]
        );
        if (emailConflictCheck.length > 0) {
            return res.status(409).json({ error: 'Email is already assigned to another employee.' });
        }

        let resolvedDepartmentId = Number(departmentId);

        if (!resolvedDepartmentId && cleanDepartmentName) {
            const [departmentRows] = await pool.query(
                'SELECT department_id FROM departments WHERE department_name = ? LIMIT 1',
                [cleanDepartmentName]
            );

            if (departmentRows.length) {
                resolvedDepartmentId = departmentRows[0].department_id;
            } else {
                const [departmentResult] = await pool.query(
                    'INSERT INTO departments (department_name) VALUES (?)',
                    [cleanDepartmentName]
                );
                resolvedDepartmentId = departmentResult.insertId;
            }
        }

        if (!resolvedDepartmentId) {
            return res.status(400).json({ error: 'Department is required.' });
        }

        await pool.query(`
            UPDATE employees
            SET first_name = ?, last_name = ?, email = ?, job_title = ?, salary = ?, employment_history = ?, department_id = ?, start_date = ?
            WHERE employee_id = ?
        `, [cleanFirstName, cleanLastName, cleanEmail, cleanRole, cleanSalary, cleanHistory, resolvedDepartmentId, cleanStartDate, employeeId]);

        await pool.query(
            'UPDATE payroll SET final_salary = ? WHERE employee_id = ?',
            [cleanSalary / 12, employeeId]
        );

        const [rows] = await pool.query(`
            SELECT e.employee_id, e.first_name, e.last_name, e.email, e.job_title, e.salary,
                   e.employment_history, e.department_id, e.start_date, d.department_name
            FROM employees e
            LEFT JOIN departments d ON d.department_id = e.department_id
            WHERE e.employee_id = ?
        `, [employeeId]);

        res.json(toEmployeeResponse(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete an employee profile
// @route   DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
    try {
        const employeeId = Number(req.params.id);
        const [result] = await pool.query('DELETE FROM employees WHERE employee_id = ?', [employeeId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Employee not found.' });
        }
        res.json({ message: 'Employee profile deleted successfully.', id: employeeId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};