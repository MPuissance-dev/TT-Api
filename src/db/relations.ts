import { relations } from 'drizzle-orm'
import {
  encounters,
  pools,
  divisions,
  teams,
  encounter_lineup,
  encounter_matches,
  players,
  clubs,
  seasons,
} from './schemas/index.js'

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  pool: one(pools, { fields: [encounters.pool_id], references: [pools.id] }),
  homeTeam: one(teams, {
    fields: [encounters.home_team],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [encounters.away_team],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  lineup: many(encounter_lineup),
  matches: many(encounter_matches),
}))

export const poolsRelations = relations(pools, ({ one }) => ({
  division: one(divisions, {
    fields: [pools.divisionId],
    references: [divisions.id],
  }),
}))

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  season: one(seasons, {
    fields: [divisions.seasonId],
    references: [seasons.id],
  }),
  pools: many(pools),
}))

export const seasonsRelations = relations(seasons, ({ many }) => ({
  divisions: many(divisions),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  club: one(clubs, { fields: [teams.clubId], references: [clubs.id] }),
  homeEncounters: many(encounters, { relationName: 'homeTeam' }),
  awayEncounters: many(encounters, { relationName: 'awayTeam' }),
}))

export const encounterLineupRelations = relations(
  encounter_lineup,
  ({ one }) => ({
    encounter: one(encounters, {
      fields: [encounter_lineup.encounter_id],
      references: [encounters.id],
    }),
    player: one(players, {
      fields: [encounter_lineup.player_id],
      references: [players.id],
    }),
    team: one(teams, {
      fields: [encounter_lineup.team_id],
      references: [teams.id],
    }),
  })
)

export const encounterMatchesRelations = relations(
  encounter_matches,
  ({ one }) => ({
    encounter: one(encounters, {
      fields: [encounter_matches.encounter_id],
      references: [encounters.id],
    }),
    homePlayer: one(players, {
      fields: [encounter_matches.home_player_id],
      references: [players.id],
      relationName: 'homePlayer',
    }),
    homePlayer2: one(players, {
      fields: [encounter_matches.home_player2_id],
      references: [players.id],
      relationName: 'homePlayer2',
    }),
    awayPlayer: one(players, {
      fields: [encounter_matches.away_player_id],
      references: [players.id],
      relationName: 'awayPlayer',
    }),
    awayPlayer2: one(players, {
      fields: [encounter_matches.away_player2_id],
      references: [players.id],
      relationName: 'awayPlayer2',
    }),
  })
)
