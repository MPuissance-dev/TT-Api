import Fastify from 'fastify'
import env from '@fastify/env'
import { encountersRouter } from './modules/encounters/router.js'

const schema = {
  type: 'object',
  required: ['PORT', 'DATABASE_URL'],
  properties: {
    PORT: {
      type: 'string',
      default: 3000,
    },
    DATABASE_URL: {
      type: 'string',
    },
  },
}

const options = {
  schema: schema,
  dotenv: true,
}

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string
      DATABASE_URL: string
    }
  }
}

const fastify = Fastify({
  logger: true,
})

export const createServer = async () => {

  await fastify.register(env, options).after()

  fastify.register(encountersRouter, { prefix: '/api/encounters'})

  return fastify
}
