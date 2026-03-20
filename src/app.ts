import { init_db } from './db/index.js'
import { createServer } from './server.js'

const app = async () => {
  try {
    console.log('----------- Mellinet-API ------------')
    await init_db()
    console.log('Base de données initialisée ✅')
    console.log("✨ Pour lancer le seed, exécutez 'npm run seed' ✨")
    console.log('Lancement du serveur.. 🚀')
    console.log('-------------------------------------')
    
    const fastify = await createServer()

    const port = Number(fastify.config.PORT)

    await fastify.listen({ port })
    fastify.log.info(`⚡️ Listening on ${port}... ⚡️`)
  } catch (error) {
    console.error('Erreur au démarrage ❌', error)
    process.exit(1)
  }
}

app()
