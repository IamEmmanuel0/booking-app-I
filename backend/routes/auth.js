require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();

// User registration
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, phone, specialization, bio, experience, consultationFee } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, Email, and Password are required" })
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      // db code here
      const userResult = await client.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
        [name, email, hashedPassword, role || 'patient', phone]
      )

      const user = userResult.rows[0];

      if (role === 'doctor') {
        if (!bio || !experience) {
          return res.status(400).json({ error: "Bio, and experience are required" })
        }

        (await client).query(
          'INSERT INTO doctors (user_id, specialization, bio, experience, consultation_fee) VALUES ($1, $2, $3, $4, $5)',
          [user.id, specialization || 'General', bio, experience, consultationFee || 0]
        )
      }

      await client.query('COMMIT')

      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.status(201).json({ user, token })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      (await client).release();
    }
  } catch (error) {
    console.error(error)
    if (error.code === "23505") {
      res.status(400).json({ error: 'Email already exists' })
    } else {
      res.status(500).json({ error: 'Server error' })
    }
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked. Contact admin.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;