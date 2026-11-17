import 'dotenv/config'
import express from 'express'
import pool from './config/db.js'
import employeesRouter from './routes/employees.js'

const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use('/employees', employeesRouter)

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
