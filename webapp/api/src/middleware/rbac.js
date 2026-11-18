import { forbiddenResponse } from '../config/messages.js'

const requireRole = (role) => {
	return (req, res, next) => {
		if(req.user.role !== role) {
			console.log('Forbidden:', req.method, req.originalUrl, '- user', req.user.id, 'from', req.ip)
			return res.status(403).json({ error: forbiddenResponse})
		}

		next()
	}
}

export default requireRole
