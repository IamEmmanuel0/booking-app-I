require('dotenv').config();
const express = require('express')
const cors = require('cors');
const authRouter = require('./routes/auth')
const adminRouter = require('./routes/admin')
const profileRouter = require('./routes/profile');
const doctorRouter = require('./routes/doctors');
const appointmentRouter = require('./routes/appointments');
const { authenticateToken, authorizeRole } = require('./middleware');

const app = express()
const port = process.env.PORT || 3000;

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => res.json({ "message": "Server up is running... " }))
app.use('/api/auth', authRouter)
app.use('/api/doctors', doctorRouter)
app.use('/api/admin',  authenticateToken, authorizeRole('admin'), adminRouter)
app.use('/api/profile', authenticateToken, profileRouter)
app.use('/api/appointments', authenticateToken, appointmentRouter)

app.listen(port, () => {
 console.log(`Server running on port ${port}`);
})