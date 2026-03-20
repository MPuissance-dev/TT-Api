import { relations } from 'drizzle-orm'
import { encounters, pools, divisions, teams, encounter_lineup, players, clubs } from './schemas/index.js'

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  pool: one(pools, { fields: [encounters.pool_id], references: [pools.id] }),
  homeTeam: one(teams, { fields: [encounters.home_team], references: [teams.id], relationName: 'homeTeam' }),
  awayTeam: one(teams, { fields: [encounters.away_team], references: [teams.id], relationName: 'awayTeam' }),
  lineup: many(encounter_lineup),
}))

export const poolsRelations = relations(pools, ({ one }) => ({
  division: one(divisions, { fields: [pools.divisionId], references: [divisions.id] }),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, { fields: [teams.clubId], references: [clubs.id] }),
  homeEncounters: many(encounters, { relationName: 'homeTeam' }),
  awayEncounters: many(encounters, { relationName: 'awayTeam' }),
}))

export const encounterLineupRelations = relations(encounter_lineup, ({ one }) => ({
  encounter: one(encounters, { fields: [encounter_lineup.encounter_id], references: [encounters.id] }),
  player: one(players, { fields: [encounter_lineup.player_id], references: [players.id] }),
  team: one(teams, { fields: [encounter_lineup.team_id], references: [teams.id] }),
}))


