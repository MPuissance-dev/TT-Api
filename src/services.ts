import {
  searchEncounters,
  type SearchEncounters,
} from './modules/encounters/db.js'
import { createFfttClient, type FfttClient } from './modules/fftt/client.js'
import {
  createFfttSynchronizer,
  type FfttSynchronizer,
} from './modules/fftt/index.js'
import {
  createPosterRenderer,
  type PosterRenderer,
} from './modules/graphics/renderer.js'

export interface AppServices {
  encounters: {
    searchEncounters: SearchEncounters
  }
  fftt: FfttClient
  ffttSynchronization: FfttSynchronizer
  graphics: {
    renderer: PosterRenderer
    /** Club name emphasised on generated posters. */
    highlightedClubName?: string | undefined
  }
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
  graphics: {
    renderer: createPosterRenderer(),
  },
}
