import Fastify from 'fastify'
import env from '@fastify/env'
import { createEncountersRouter } from './modules/encounters/router.js'
import { createFfttRouter } from './modules/fftt/router.js'
import { createFfttClient } from './modules/fftt/client.js'
import { createFfttSynchronizer } from './modules/fftt/synchronizer.js'
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
    FFTT_APPILICATION_CODE: {
      type: 'string',
    },
    FFTT_PWD: {
      type: 'string',
    },
    FFTT_SERIE: {
      type: 'string',
    },
  },
}

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: string
      DATABASE_URL: string
      FFTT_APPILICATION_CODE?: string
      FFTT_PWD?: string
      FFTT_SERIE?: string
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

  const configuredFftt = createFfttClient({
    applicationCode: fastify.config.FFTT_APPILICATION_CODE,
    password: fastify.config.FFTT_PWD,
    serie: fastify.config.FFTT_SERIE,
  })
  const configuredServices: AppServices = {
    ...appServices,
    fftt: configuredFftt,
    ffttSynchronization: createFfttSynchronizer(configuredFftt, undefined, (message, context) =>
      fastify.log.warn(context, message)
    ),
  }

  await fastify.register(createEncountersRouter(configuredServices), { prefix: '/api/encounters' })
  await fastify.register(createFfttRouter(configuredServices), { prefix: '/api/fftt' })

  return fastify
}
