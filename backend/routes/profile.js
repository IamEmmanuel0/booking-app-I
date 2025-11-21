require('dotenv').config();
const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

// Update user profile
router.put('/', async (req, res) => {
  try {
    const { name, phone } = req.body;

    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING id, name, email, role, phone',
      [name, phone, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at, d.*
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       WHERE u.id = $1`,
      [req.user.id]
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