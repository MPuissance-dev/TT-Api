import {
  countChampionshipDayDates,
  findEncounter,
  searchEncounters,
  type CountChampionshipDayDates,
  type FindEncounter,
  type SearchEncounters,
} from './modules/encounters/db.js'
import {
  findPlayerDetails,
  type FindPlayerDetails,
} from './modules/players/db.js'
import { findTeamDetails, type FindTeamDetails } from './modules/teams/db.js'
import { createFfttClient, type FfttClient } from './modules/fftt/client.js'
import {
  createFfttSynchronizer,
  type FfttSynchronizer,
} from './modules/fftt/index.js'

export interface AppServices {
  encounters: {
    searchEncounters: SearchEncounters
    countChampionshipDayDates: CountChampionshipDayDates
    findEncounter: FindEncounter
  }
  teams: {
    findTeamDetails: FindTeamDetails
  }
  players: {
    findPlayerDetails: FindPlayerDetails
  }
  fftt: FfttClient
  ffttSynchronization: FfttSynchronizer
  graphics: {
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
    countChampionshipDayDates,
    findEncounter,
  },
  teams: {
    findTeamDetails,
  },
  players: {
    findPlayerDetails,
  },
  fftt: unconfiguredClient,
  ffttSynchronization: createFfttSynchronizer(unconfiguredClient),
  graphics: {},
}
