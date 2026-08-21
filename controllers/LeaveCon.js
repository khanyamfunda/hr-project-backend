import pool from '../config/db.js'

// Get leave requests for the logged-in user
export const getMyLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.user.employee_id || req.user.id
    const [rows] = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Submit a new leave request
export const requestLeave = async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body
  const employeeId = req.user.employee_id || req.user.id
  try {
    const [result] = await pool.query(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, "Pending")',
      [employeeId, leave_type, start_date, end_date, reason]
    )
    res.status(201).json({ message: 'Leave request submitted', id: result.insertId })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get all leave requests (Admin)
export const getAllLeaveRequests = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_requests ORDER BY created_at DESC')
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Update leave request status (Admin approval/rejection)
export const updateLeaveStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    await pool.query('UPDATE leave_requests SET status = ? WHERE id = ?', [status, id])
    res.json({ message: 'Leave request updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}