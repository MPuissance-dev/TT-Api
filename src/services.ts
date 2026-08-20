import { searchEncounters, type SearchEncounters } from './modules/encounters/db.js'
import { createFfttClient, type FfttClient } from './modules/fftt/client.js'
import { createFfttSynchronizer, type FfttSynchronizer } from './modules/fftt/synchronizer.js'

export interface AppServices {
  encounters: {
    searchEncounters: SearchEncounters
  }
  fftt: FfttClient
  ffttSynchronization: FfttSynchronizer
}

export const services: AppServices = {
  encounters: {
    searchEncounters,
  },
  fftt: createFfttClient({}),
  ffttSynchronization: createFfttSynchronizer(createFfttClient({})),
}
