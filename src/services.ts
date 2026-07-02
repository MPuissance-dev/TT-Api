import { searchEncounters, type SearchEncounters } from './modules/encounters/db.js'

export interface AppServices {
  encounters: {
    searchEncounters: SearchEncounters
  }
}

export const services: AppServices = {
  encounters: {
    searchEncounters,
  },
}
