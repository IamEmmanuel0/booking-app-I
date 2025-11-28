require('dotenv').config();
const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.is_blocked, u.created_at,
             d.specialization, d.experience, d.rating
      FROM users u
      LEFT JOIN doctors d ON u.id = d.user_id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block/unblock user
router.put('/users/:id/block', async (req, res) => {
  try {
    const { isBlocked } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_blocked = $1 WHERE id = $2 RETURNING id, name, email, is_blocked',
      [isBlocked, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;