import { db, type Database } from '../../db/index.js'
import { encounters } from '../../db/schemas/index.js'
import { eq } from 'drizzle-orm'

export const buildSearchEncounters = (database: Database) => async (dayNumber?: number) =>
  database.query.encounters.findMany({
    where: dayNumber !== undefined ? eq(encounters.championship_day_number, dayNumber) : undefined,
    with: {
      pool: {
        with: { division: true },
      },
      homeTeam: {
        with: { club: true },
      },
      awayTeam: {
        with: { club: true },
      },
      lineup: {
        with: { player: true, team: true },
      },
    },
  })

export type SearchEncounters = ReturnType<typeof buildSearchEncounters>

export const searchEncounters = buildSearchEncounters(db)

export type SearchEncounterRow = Awaited<ReturnType<typeof searchEncounters>>[number]
