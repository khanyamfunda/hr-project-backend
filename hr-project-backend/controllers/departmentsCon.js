import pool from '../config/db.js';

// Helper function to fetch a single department by its ID
async function fetchDepartmentById(id) {
    const [rows] = await pool.query(
        'SELECT department_id AS id, department_name AS name FROM departments WHERE department_id = ?',
        [id]
    );
    return rows[0];
}

// @desc    Get all departments
// @route   GET /api/departments
export const getAllDepartments = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT department_id AS id, department_name AS name FROM departments ORDER BY department_name ASC'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Create a new department
// @route   POST /api/departments
export const createDepartment = async (req, res) => {
    try {
        const departmentName = (req.body.name || req.body.department_name || '').trim();

        if (!departmentName) {
            return res.status(400).json({ error: 'Department name is required.' });
        }

        const [existing] = await pool.query(
            'SELECT department_id FROM departments WHERE department_name = ?',
            [departmentName]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Department already exists.' });
        }

        const [result] = await pool.query(
            'INSERT INTO departments (department_name) VALUES (?)',
            [departmentName]
        );

        const newDepartment = await fetchDepartmentById(result.insertId);
        res.status(201).json(newDepartment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Update a department name
// @route   PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
    try {
        const departmentId = Number(req.params.id);
        const departmentName = (req.body.name || req.body.department_name || '').trim();

        if (!departmentName) {
            return res.status(400).json({ error: 'Department name is required.' });
        }

        const [duplicateCheck] = await pool.query(
            'SELECT department_id FROM departments WHERE department_name = ? AND department_id != ?',
            [departmentName, departmentId]
        );

        if (duplicateCheck.length > 0) {
            return res.status(409).json({ error: 'Another department already has this name.' });
        }

        const [result] = await pool.query(
            'UPDATE departments SET department_name = ? WHERE department_id = ?',
            [departmentName, departmentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found.' });
        }

        const updatedDepartment = await fetchDepartmentById(departmentId);
        res.json(updatedDepartment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
    try {
        const departmentId = Number(req.params.id);
        const [result] = await pool.query(
            'DELETE FROM departments WHERE department_id = ?',
            [departmentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found.' });
        }

        res.json({ message: 'Department deleted successfully.', id: departmentId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};