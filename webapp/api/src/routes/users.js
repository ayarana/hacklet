import { Router } from 'express'
import bcrypt from 'bcrypt'
import pool from '../config/db.js'
import requireRole from '../middleware/rbac.js'
import {
	internalServerErrorMSG,
	internalServerErrorResponse,
	invalidIdResponse,
	missingFieldsResponse,
	notFoundResponse,
	invalidRoleResponse,
	invalidPasswordResponse,
	userExistsResponse
} from '../config/messages.js'

const router = Router()
const validRoles = ['admin', 'employee']

router.post('/', requireRole('admin'), async (req, res) => {
	const { employeeId, password, role = 'employee' } = req.body

	if (employeeId === undefined || !password) {
		return res.status(400).json({ error: missingFieldsResponse })
	}
	if(!/^\d+$/.test(String(employeeId))) {
		return res.status(400).json({ error: invalidIdResponse})
	}
	if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
		return res.status(400).json({ error: invalidPasswordResponse })
	}
	if (!validRoles.includes(role)) {
		return res.status(400).json({ error: invalidRoleResponse })
	}

	try {
		const employee = await pool.query(
			`SELECT id, corporate_email
			FROM employees
			WHERE id = $1 AND is_active = true`,
			[employeeId]
		)

		if (employee.rows.length === 0) {
			return res.status(404).json({ error: notFoundResponse })
		}

		const passwordHash = await bcrypt.hash(password, 12)
		const login = employee.rows[0].corporate_email.toLowerCase()

		const result = await pool.query(
			`INSERT INTO users (employee_id, login, password_hash, role)
			VALUES ($1, $2, $3, $4)
			RETURNING id, employee_id, login, role`,
			[employee.rows[0].id, login, passwordHash, role]
		)

		console.log('User created, id:', result.rows[0].id, '- role:', role, '- by admin id:', req.user.id)
		res.status(201).json(result.rows[0])
	} catch(err) {
		if (err.code === '23505') {
			return res.status(409).json({ error: userExistsResponse })
		}

		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

export default router
