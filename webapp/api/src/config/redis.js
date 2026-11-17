import 'dotenv/config'
import { createClient } from 'redis'

const client = createClient({
	socket: {
		host: process.env.REDIS_HOST,
		port: Number(process.env.REDIS_PORT)
	},
	password: process.env.REDIS_PASSWORD
})

client.on('error', (err) => console.error('Redis error:', err.message))

await client.connect()

export default client
