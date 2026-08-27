import {
  searchEncounters,
  type SearchEncounters,
} from './modules/encounters/db.js'
import { createFfttClient, type FfttClient } from './modules/fftt/client.js'
import {
  createFfttSynchronizer,
  type FfttSynchronizer,
} from './modules/fftt/index.js'

export interface AppServices {
  encounters: {
    searchEncounters: SearchEncounters
  }
  fftt: FfttClient
  ffttSynchronization: FfttSynchronizer
  /** FFTT number of the club the API is built for, used to flag its own teams. */
  followedClubNumber?: string | undefined
}

const unconfiguredClient = createFfttClient({})

export const services: AppServices = {
  encounters: {
    searchEncounters,
  },
  fftt: unconfiguredClient,
  ffttSynchronization: createFfttSynchronizer(unconfiguredClient),
}
