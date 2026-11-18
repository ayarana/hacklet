import fs from 'node:fs'
import path from 'node:path'

const logFile = path.resolve(process.env.LOG_FILE || 'logs/access.log')
fs.mkdirSync(path.dirname(logFile), { recursive: true })

const logStream = fs.createWriteStream(logFile, { flags: 'a' })
logStream.on('error', (err) => console.error('Log file error:', err.message))

const requestLogger = (req, res, next ) => {
	
	const startedAt = Date.now()

	res.on('finish', () => {
		const entry = {
			time: new Date().toISOString(),
			ip: req.ip,
			user: req.user ? req.user.id : null,
			role: req.user ? req.user.role : null,
			method: req.method,
			route: req.route ? req.baseUrl + req.route.path : null,
			path: req.originalUrl.split('?')[0],
			status: res.statusCode,
			ms: Date.now() - startedAt,
			agent: (req.get('user-agent') || '').slice(0, 200)
		}
		logStream.write(JSON.stringify(entry) + '\n')
	})

	next()
}

export default requestLogger
