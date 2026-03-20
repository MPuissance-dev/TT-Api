import { db } from '../../db/index.js'
import { encounters } from '../../db/schemas/index.js'
import { eq } from 'drizzle-orm'

export const searchEncounters = async (dayNumber?: number) => {
  return db.query.encounters.findMany({
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
}

export type SearchEncounterRow = Awaited<ReturnType<typeof searchEncounters>>[number]
