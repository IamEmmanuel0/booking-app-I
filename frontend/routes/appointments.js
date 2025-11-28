require('dotenv').config();
const express = require('express');
const { pool } = require('../config/db');
const { authorizeRole } = require('../middleware');
const { sendEmail } = require('../config/email');
const router = express.Router();

router.post('/', authorizeRole('patient'), async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, notes } = req.body;
    if (!doctorId || !appointmentDate || !appointmentTime || !notes) {
      return res.status(400).json({ error: "DoctorId, AppointmentDate, notes and AppointmentTime are required" })
    }
    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *
      `,
      [req.user.id, doctorId, appointmentDate, appointmentTime, notes]
    )
    // sending email
    const user = await pool.query(
      'SELECT u.email, u.name FROM users u JOIN doctors d ON u.id = d.user_id WHERE d.id = $1',
      [doctorId]
    )
    if (user.rows.length > 0) {
      await sendEmail(
        user.rows[0].email, 'New Appointment Request',
        `<div>
          <h3>Hello ${user.rows[0].name}</h3>
          <h2>New Appointment Request</h2>
          <p>${appointmentDate}</p>
          <p>${appointmentTime}</p>
          <p>${notes}</p>
          <p>Please log in to your dashboard to review ${req.user.name}'s appointment.</p>
        </div>`
      )
    }
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
})

// Get appointments
router.get('/', async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'patient') {
      query = `
        SELECT a.*, d.specialization, u.name as doctor_name, u.phone as doctor_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.patient_id = $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'doctor') {
      const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }
      query = `
        SELECT a.*, u.name as patient_name, u.phone as patient_phone, u.email as patient_email
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        WHERE a.doctor_id = $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [doctorResult.rows[0].id];
    } else if (req.user.role === 'admin') {
      query = `
        SELECT a.*, 
               u1.name as patient_name, u1.email as patient_email,
               u2.name as doctor_name, d.specialization
        FROM appointments a
        JOIN users u1 ON a.patient_id = u1.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u2 ON d.user_id = u2.id
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [];
    }
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update appointment status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const appointmentId = req.params.id;
    if (!['pending', 'approved', 'declined', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    let query, params;
    if (req.user.role === 'doctor') {
      const doctorResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doctorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }
      query = 'UPDATE appointments SET status = $1 WHERE id = $2 AND doctor_id = $3 RETURNING *';
      params = [status, appointmentId, doctorResult.rows[0].id];
    } else if (req.user.role === 'patient') {
      query = 'UPDATE appointments SET status = $1 WHERE id = $2 AND patient_id = $3 RETURNING *';
      params = [status, appointmentId, req.user.id];
    } else {
      query = 'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *';
      params = [status, appointmentId];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized' });
    }
    // Send email notification
    if (req.user.role === 'doctor' && process.env.EMAIL_USER) {
      const patientData = await pool.query(
        'SELECT u.email, u.name FROM users u JOIN appointments a ON u.id = a.patient_id WHERE a.id = $1',
        [appointmentId]
      );
      if (patientData.rows.length > 0) {
        await sendEmail(
          patientData.rows[0].email, `Appointment ${status}`,
          `<div>
          <h3>Hello ${patientData.rows[0].name}</h3>
          <h3>Appointment Update</h3>
          <p>Your appointment has been <strong>${status}</strong>.</p>
        </div>`
        )
      }
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate appointment
router.put('/:id/rate', authorizeRole('patient'), async (req, res) => {
  const client = await pool.connect()
  try {
    const { rating } = req.body;
    const appointmentId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify appointment belongs to patient and is completed
    const appointmentCheck = await client.query(
      'SELECT * FROM appointments WHERE id = $1 AND patient_id = $2 AND status = $3',
      [appointmentId, req.user.id, 'completed']
    );

    if (appointmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or not eligible for rating' });
    }

    const appointment = appointmentCheck.rows[0];
    await client.query('BEGIN')
    // Update appointment with rating
    await client.query(
      'UPDATE appointments SET rating = $1 WHERE id = $2',
      [rating, appointmentId]
    );

    // Update doctor's average rating
    const docRating = await client.query(
      `SELECT rating FROM doctors WHERE id = $1`,
      [appointment.doctor_id]
    );

    await client.query(
      'UPDATE doctors SET rating = $1 WHERE id = $2',
      [
        ((+(docRating.rows[0].rating || rating) + rating) / 2).toFixed(1),
        appointment.doctor_id
      ]
    );

    await client.query('COMMIT')

    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    (await client).release();
  }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'patient') {
      query = 'DELETE FROM appointments WHERE id = $1 AND patient_id = $2 RETURNING *';
      params = [req.params.id, req.user.id];
    } else if (req.user.role === 'admin') {
      query = 'DELETE FROM appointments WHERE id = $1 RETURNING *';
      params = [req.params.id];
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;