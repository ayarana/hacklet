import { Router } from 'express'
import pool from '../config/db.js'
import requireRole from '../middleware/rbac.js'
import {
	internalServerErrorMSG,
	internalServerErrorResponse,
	invalidIdResponse,
	notFoundResponse,
	noFieldsResponse,
	invalidCpfResponse,
	missingFieldsResponse,
	tooLongResponse,
	duplicateResponse
} from '../config/messages.js'

const router = Router()
const validateCpf = (value) => /^\d{11}$/.test(value)
const publicCols = 'id, name, job_title, department, corporate_email, corporate_phone'
const allCols = publicCols + ', wage, cpf, personal_phone, address, is_active'

router.get('/', async (req, res) => {
	const isAdmin = req.user.role === 'admin'
	const cols = isAdmin ? allCols : publicCols
	const onlyActive = isAdmin ? '' : 'WHERE is_active = true'

	try {
		const result = await pool.query(
			`SELECT ${cols}
			FROM employees
			${onlyActive}
			ORDER BY id`
		)
		res.json(result.rows)
	} catch(err) {
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

router.get('/:id', async (req, res) => {
	const { id } = req.params

	if (!/^\d+$/.test(id)) {
		return res.status(400).json({ error: invalidIdResponse })
	}

	const isAdmin = req.user.role === 'admin'
	const seesAll = isAdmin || Number(id) === req.user.employeeId
	const cols = seesAll ? allCols : publicCols
	const activeFilter = isAdmin ? '' : 'AND is_active = true'

	try {
		const result = await pool.query(
			`SELECT ${cols}
			FROM employees
			WHERE id = $1 ${activeFilter}`,
			[id]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: notFoundResponse})
		}
		res.json(result.rows[0])
	} catch(err) {
		res.status(500).json({ error: internalServerErrorResponse})
		console.log(internalServerErrorMSG, err)
	}
})

router.patch('/:id', requireRole('admin'), async (req, res) => {
	const { id } = req.params

	if (!/^\d+$/.test(id)) {
		console.log('Invalid id')
		return res.status(400).json({ error: invalidIdResponse })
	}

	const allowedFields = [ 'name', 'job_title', 'department', 'corporate_email', 'corporate_phone', 'wage', 'cpf', 'personal_phone', 'address' ]
	const fields = allowedFields.filter((field) => req.body[field] !== undefined)

	if (fields.length === 0) {
		return res.status(400).json({ error: noFieldsResponse })
	}

	if (fields.includes('cpf') && !validateCpf(req.body.cpf)) {
		console.log('Invalid CPF format')
		return res.status(400).json({ error: invalidCpfResponse })
	}

	try {
		const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ')
		const values = fields.map((field) => req.body[field])
		values.push(id)

		const result = await pool.query(
			`UPDATE employees
			SET ${setClause}
			WHERE id = $${fields.length + 1} AND is_active = true
			RETURNING
				id, name, job_title, department, corporate_email, corporate_phone`,
			values
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: notFoundResponse })
		}

		res.json(result.rows[0])
	} catch (err) {
		if (err.code === '22001') {
			return res.status(400).json({ error: tooLongResponse })
		}

		if (err.code === '23505') {
			return res.status(409).json({ error: duplicateResponse })
		}

		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}

})

router.patch('/:id/fire', requireRole('admin'), async (req, res) => {
	const { id } = req.params

	if (!/^\d+$/.test(id)) {
		console.log('Invalid id')
		return res.status(400).json({error: invalidIdResponse})
	}

	try {
		const result = await pool.query(
			`UPDATE employees
			SET is_active = false
			WHERE id = $1 AND is_active = true
			RETURNING id, name, is_active`,
			[id]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: notFoundResponse})
		}
		console.log('Employee fired, id:', id)
		res.json(result.rows[0])
	} catch(err) {
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

router.post('/', requireRole('admin'), async (req, res) => {
	const { name, job_title, department, corporate_email, corporate_phone, wage, cpf, personal_phone, address } = req.body

	if (!name || !job_title || !department || !corporate_email || !wage || !cpf) {
		return res.status(400).json({error: missingFieldsResponse})
	}

	if (!validateCpf(cpf)) {
		console.log('Invalid CPF format')
		return res.status(400).json({error: invalidCpfResponse})
	}

	try {
		const result = await pool.query(
			`INSERT INTO employees
				(name, job_title, department, corporate_email, corporate_phone, wage, cpf, personal_phone, address)
			VALUES
				($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING
				id, name, job_title, department, corporate_email, corporate_phone`,
			[name, job_title, department, corporate_email, corporate_phone, wage, cpf, personal_phone, address]
		)
		console.log('New user added')
		res.status(201).json(result.rows[0])

	} catch (err) {
		if (err.code === '22001') {
			return res.status(400).json({ error: tooLongResponse })
		}

		if (err.code === '23505') {
			return res.status(409).json({ error: duplicateResponse})
		}
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

export default router
