import pool from '../config/db.js';

const toReview = (row) => ({
    id: row.review_id,
    employeeId: row.employee_id,
    period: row.review_date,
    rating: Number(row.score),
    summary: row.feedback_notes
});

export const getReviews = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT review_id, employee_id, review_date, score, feedback_notes FROM performance_reviews ORDER BY review_date DESC');
        res.json(rows.map(toReview));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createReview = async (req, res) => {
    try {
        const { employeeId, period, rating, summary } = req.body || {};
        const reviewerId = req.user.employee_id || req.user.id;
        if (!employeeId || !period || !rating || !summary) return res.status(400).json({ error: 'All review fields are required.' });
        const periodMatch = /^Q([1-4])\s+(\d{4})$/i.exec(String(period).trim());
        const reviewDate = periodMatch ? `${periodMatch[2]}-${String((Number(periodMatch[1]) - 1) * 3 + 1).padStart(2, '0')}-01` : period;
        const [result] = await pool.query('INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, score, feedback_notes) VALUES (?, ?, ?, ?, ?)', [employeeId, reviewerId, reviewDate, rating, summary]);
        const [rows] = await pool.query('SELECT review_id, employee_id, review_date, score, feedback_notes FROM performance_reviews WHERE review_id = ?', [result.insertId]);
        res.status(201).json(toReview(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateReview = async (req, res) => {
    try {
        const { rating, summary } = req.body || {};
        const [result] = await pool.query('UPDATE performance_reviews SET score = ?, feedback_notes = ? WHERE review_id = ?', [rating, summary, req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Review not found.' });
        res.json({ message: 'Review updated.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};