import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import pool from '../config/db.js'
import redis from '../config/redis.js'
import authenticate from '../middleware/auth.js'
import { internalServerErrorMSG, internalServerErrorResponse, missingFieldsResponse, invalidCredentialsResponse, loggedOutResponse } from '../config/messages.js'

const router = Router()
const tokenTtl = 3600
const dummyHash = await bcrypt.hash('not-a-real-password', 12)

router.post('/login', async (req, res) => {
	const { login, password } = req.body

	if (typeof login !== 'string' || typeof password !== 'string' || !login || !password) {
		return res.status(400).json({ error: missingFieldsResponse})
	}

	try {
		const result = await pool.query(
			`SELECT id, employee_id, password_hash, role
			FROM users
			WHERE login = $1`,
			[login.toLowerCase()]
		)

		const user = result.rows[0]
		const hash = user ? user.password_hash : dummyHash
		const passwordOk = await bcrypt.compare(password, hash)

		if (!user || !passwordOk) {
			console.log('Failed login attempt from', req.ip)
			return res.status(401).json({ error: invalidCredentialsResponse })
		}

		const jti = randomUUID()
		const token = jwt.sign(
			{ sub: String(user.id), role: user.role, employeeId: user.employee_id },
			process.env.JWT_SECRET,
			{ algorithm: 'HS256', expiresIn: tokenTtl, jwtid: jti }
		)

		await redis.set(`token:${jti}`, String(user.id), { EX: tokenTtl })

		res.json({ token })
	} catch(err) {
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

router.post('/logout', authenticate, async (req, res) => {
	try {
		await redis.del(`token:${req.user.jti}`)
		console.log('User logged out, id:', req.user.id)
		res.json({ message: loggedOutResponse})
	} catch(err) {
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
})

export default router
