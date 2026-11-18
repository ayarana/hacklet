import 'dotenv/config'
import express from 'express'
import pool from './config/db.js'
import employeesRouter from './routes/employees.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import authenticate from './middleware/auth.js'
import requestLogger from './middleware/logger.js'

const app = express()
const PORT = process.env.PORT

app.use(requestLogger)
app.use(express.json())
app.use('/employees', authenticate, employeesRouter)
app.use('/auth', authRouter)
app.use('/users', authenticate, usersRouter)

app.get('/health', (req, res) => {
    res.json({ status: 'ok'})
})

try {
	const result = await pool.query('SELECT now()')
	console.log('The result is:', result.rows[0])
} catch(err) {
	console.error(err.message)
}

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`)
})
