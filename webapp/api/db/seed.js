import 'dotenv/config'
import bcrypt from 'bcrypt'
import pool from '../src/config/db.js'

const { ADMIN_LOGIN, ADMIN_PASSWORD } = process.env

if (!ADMIN_LOGIN || !ADMIN_PASSWORD ) {
	console.error('ADMIN_LOGIN and ADMIN_PASSWORD must be set in .env')
	process.exit(1)
}

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
const adminLogin = ADMIN_LOGIN.toLowerCase()

const client = await pool.connect()

try {
	await client.query('BEGIN')

	const employee = await client.query(
		`INSERT INTO employees (name, job_title, department, corporate_email, wage, cpf)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`,
		['Admin', 'Administrator', 'IT', adminLogin, 1,  '99999999999']
	)
	const employeeId = employee.rows[0].id

	await client.query(
		`INSERT INTO users (employee_id, login, password_hash, role)
		VALUES ($1, $2, $3, $4)`,
		[employeeId, adminLogin, passwordHash, 'admin' ]
	)

	await client.query('COMMIT')
	console.log('Admin created')
} catch(err) {
	await client.query('ROLLBACK')
	if (err.code === '23505') {
		console.error('Seed failed: admin already exists')
	} else {
		console.error('Seed failed:', err.message)
	}
} finally {
	client.release()
	await pool.end()
}
