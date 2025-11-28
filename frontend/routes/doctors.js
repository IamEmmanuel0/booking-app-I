require('dotenv').config();
const express = require('express');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware');
const router = express.Router();

// get all doctors
router.get('/', async (req, res) => {
  try {
    const { specialization } = req.query
    let query = `
      SELECT d.id, u.name, d.specialization, d.bio, d.experience, d.rating,
        d.consultation_fee, d.available_slots, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE u.is_blocked = FALSE
    `
    const params = []
    if (specialization) {
      query += ' AND d.specialization ILIKE $1';
      params.push(`%${specialization}%`)
    }
    query += ' ORDER BY d.rating DESC, d.id';
    const result = await pool.query(query, params)
    res.json(result.rows)
    
  } catch (error) {
    console.error(error)
    res.status(500).json({  error: "Server error"})
  }
})

// get doctor profile
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name, u.email, u.phone
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1
      `,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({error: "Doctor not found"})
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({  error: "Server error"})
  }
})

// update doctor availability
router.put("/availability", authenticateToken, authorizeRole('doctor'), async (req, res) => {
  try {
    const { availableSlots } = req.body;

    const doctorResult = await pool.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    )

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({error: "Doctor profile not found"})
    }

    await pool.query(
      'UPDATE doctors SET available_slots = $1 WHERE user_id = $2',
      [JSON.stringify(availableSlots), req.user.id]
    )

    res.json({message: 'Availability updated successfully'})
  } catch (error) {
    console.error(error)
    res.status(500).json({  error: "Server error"})
  }
})

module.exports = router;