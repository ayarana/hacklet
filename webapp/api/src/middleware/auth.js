import jwt from 'jsonwebtoken'
import redis from '../config/redis.js'
import { unauthorizedResponse, internalServerErrorMSG, internalServerErrorResponse } from '../config/messages.js'

const authenticate = async (req, res, next) => {
	const authHeader = req.headers.authorization

	if (!authHeader) {
		return res.status(401).json({ error: unauthorizedResponse })
	}
	const [bearer, tokenStr] = authHeader.split(' ')
	if(bearer !== 'Bearer' || !tokenStr) {
		console.log('Bad authorization header from', req.ip)
		return res.status(401).json({ error: unauthorizedResponse})
	}

	let decoded
	try {
		decoded = jwt.verify(tokenStr, process.env.JWT_SECRET, { algorithms: ['HS256'] })
	} catch(err) {
		console.log('Invalid or expired token from', req.ip)
		return res.status(401).json({ error: unauthorizedResponse })
	}

	try {
		const inRedis = await redis.get(`token:${decoded.jti}`)

		if (!inRedis) {
			console.log('Revoked token used from', req.ip)
			return res.status(401).json({ error: unauthorizedResponse })
		}

		req.user = { id: decoded.sub, role: decoded.role, employeeId: decoded.employeeId, jti: decoded.jti }
		next()
	} catch (err) {
		res.status(500).json({ error: internalServerErrorResponse })
		console.log(internalServerErrorMSG, err)
	}
}

export default authenticate
