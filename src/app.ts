import { init_db } from './db/index.js'
import { createServer } from './server.js'

const app = async () => {
  await init_db(true)
  const fastify = await createServer()
  const port = Number(fastify.config.PORT)

  try {
    fastify.listen({ port }, () => {
      fastify.log.info(`Listening on ${port}...`)
    })
  } catch (error) {
    fastify.log.error(`fastify.listen: ${error}`)
    process.exit(1)
  }
}

app()
