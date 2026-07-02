import Fastify from 'fastify'
import env from '@fastify/env'
import { createEncountersRouter } from './modules/encounters/router.js'
import { services as defaultServices, type AppServices } from './services.js'

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

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string
      DATABASE_URL: string
    }
  }
}

interface ServerConfig {
  [key: string]: string
  PORT: string
  DATABASE_URL: string
}

interface CreateServerOptions {
  logger?: boolean
  config?: ServerConfig
  services?: AppServices
}
export const createServer = async ({
  logger = true,
  config,
  services: appServices = defaultServices,
}: CreateServerOptions = {}) => {
  const fastify = Fastify({
    logger: logger
      ? {
          level: 'info',
        }
      : false,
  })

  if (config === undefined) {
    await fastify
      .register(env, {
        schema,
        dotenv: true,
      })
      .after()
  } else {
    await fastify
      .register(env, {
        schema,
        data: { ...config },
      })
      .after()
  }

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url,
      },
      'request failed'
    )

    reply.status(500).send({ error: 'Internal server error' })
  })

  await fastify.register(createEncountersRouter(appServices), { prefix: '/api/encounters' })

  return fastify
}
