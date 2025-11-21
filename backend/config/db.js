require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_POST,
});

const initDB = async () => {
  const query = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient',
    phone VARCHAR(20),
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL,
    bio TEXT,
    experience INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    available_slots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
  `;

  try {
    await pool.query(query);
    console.log("DB init....");
  } catch (err) {
    console.error("DB init error:", err);
  }
};

initDB();

async function createAdmin() {
  try {
    const existingAdmin = await pool.query(
      'SELECT * FROM users WHERE email = $1', [process.env.ADMIN_EMAIL]
    )

    if (existingAdmin.rows.length < 1) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
      await pool.query(
        `
          INSERT INTO users (name, email, password, role)
          VALUES ($1, $2, $3, $4)
        `,
        [process.env.ADMIN_NAME, process.env.ADMIN_EMAIL, hashedPassword, 'admin']
      )
      console.log("Admin created successfully");
    }
  } catch (err) {
    console.error("Error while creating admin:", err.message);
  }
}
createAdmin()

module.exports = { pool }
