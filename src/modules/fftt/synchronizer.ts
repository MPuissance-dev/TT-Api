import { createHash } from 'node:crypto'
import { db, type Database } from '../../db/index.js'
import {
  clubs,
  divisions,
  encounter_lineup,
  encounters,
  players,
  pool_team,
  pools,
  teams,
} from '../../db/schemas/index.js'
import type {
  FfttClub,
  FfttEncounter,
  FfttLicense,
  FfttPool,
} from './models.js'
import type { FfttClient } from './client.js'

export interface FfttSynchronizationOptions {
  clubNumber: string
  verifyAccess?: boolean
}

export type FfttSynchronizationLogger = (message: string, context: Record<string, unknown>) => void

export interface FfttSynchronizationSummary {
  clubNumber: string
  divisions: number
  pools: number
  clubs: number
  teams: number
  players: number
  encounters: number
  lineups: number
  skippedEncounters: number
  skippedEncounterReasons: {
    missingTeams: number
    missingDate: number
  }
}

const parseFfttDate = (value: string | undefined): Date | undefined => {
  if (value === undefined || value.length === 0) {
    return undefined
  }

  const europeanDate = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/)
  const normalized = europeanDate === null ? value : `${europeanDate[3]}-${europeanDate[2]}-${europeanDate[1]}`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const getEncounterStatus = (encounter: FfttEncounter): 'played' | 'scheduled' =>
  encounter.homeScore !== undefined &&
  encounter.awayScore !== undefined &&
  (encounter.homeScore !== 0 || encounter.awayScore !== 0)
    ? 'played'
    : 'scheduled'

const extractDivisionId = (link: string | undefined): string | undefined => {
  if (link === undefined) {
    return undefined
  }

  return new URLSearchParams(link.replace(/^.*\?/, '')).get('D1') ?? undefined
}

const extractPoolId = (link: string | undefined): string | undefined => {
  if (link === undefined) {
    return undefined
  }

  return new URLSearchParams(link.replace(/^.*\?/, '')).get('cx_poule') ?? undefined
}

const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const derivedTeamExternalId = (clubNumber: string, teamLabel: string): string =>
  `derived:${createHash('sha1').update(`${clubNumber}:${normalizeName(teamLabel)}`).digest('hex').slice(0, 24)}`

const findLicense = (label: string, licenses: FfttLicense[]): FfttLicense | undefined => {
  const normalizedLabel = normalizeName(label)
  return licenses.find((license) =>
    [normalizeName(`${license.firstName} ${license.lastName}`), normalizeName(`${license.lastName} ${license.firstName}`)].includes(
      normalizedLabel
    )
  )
}

const upsertClub = async (database: Database, club: FfttClub) => {
  const [row] = await database
    .insert(clubs)
    .values({
      ffttId: club.externalId,
      name: club.name,
      numero: club.number,
    })
    .onConflictDoUpdate({
      target: clubs.ffttId,
      set: { name: club.name, numero: club.number },
    })
    .returning({ id: clubs.id })

  if (row === undefined) {
    throw new Error(`Unable to upsert FFTT club ${club.number}`)
  }

  return row.id
}

const upsertDivision = async (database: Database, divisionId: string, level: string) => {
  const [row] = await database
    .insert(divisions)
    .values({ ffttId: divisionId, name: level, level })
    .onConflictDoUpdate({
      target: divisions.ffttId,
      set: { level },
    })
    .returning({ id: divisions.id })

  if (row === undefined) {
    throw new Error(`Unable to upsert FFTT division ${divisionId}`)
  }

  return row.id
}

const upsertPool = async (database: Database, pool: FfttPool, divisionId: string) => {
  const [row] = await database
    .insert(pools)
    .values({
      ffttId: pool.externalId,
      divisionId,
      name: pool.label,
    })
    .onConflictDoUpdate({
      target: pools.ffttId,
      set: { divisionId, name: pool.label },
    })
    .returning({ id: pools.id })

  if (row === undefined) {
    throw new Error(`Unable to upsert FFTT pool ${pool.externalId}`)
  }

  return row.id
}

const upsertTeam = async (database: Database, teamId: string, clubId: string) => {
  const [row] = await database
    .insert(teams)
    .values({ ffttId: teamId, clubId })
    .onConflictDoUpdate({
      target: teams.ffttId,
      set: { clubId },
    })
    .returning({ id: teams.id })

  if (row === undefined) {
    throw new Error(`Unable to upsert FFTT team ${teamId}`)
  }

  return row.id
}

const upsertPlayer = async (database: Database, license: FfttLicense, clubId: string) => {
  const [row] = await database
    .insert(players)
    .values({
      ffttId: license.externalId,
      firstName: license.firstName,
      lastName: license.lastName,
      points: license.points ?? 0,
      clubId,
    })
    .onConflictDoUpdate({
      target: players.ffttId,
      set: {
        firstName: license.firstName,
        lastName: license.lastName,
        points: license.points ?? 0,
        clubId,
      },
    })
    .returning({ id: players.id })

  if (row === undefined) {
    throw new Error(`Unable to upsert FFTT player ${license.licenseNumber}`)
  }

  return row.id
}

const parseEncounterId = (encounter: FfttEncounter, poolId: string): string => {
  if (encounter.detailsLink !== undefined) {
    const externalId = new URLSearchParams(encounter.detailsLink.replace(/^.*\?/, '')).get('renc_id')
    if (externalId !== null && externalId.length > 0) {
      return externalId
    }
  }

  const source = [
    poolId,
    encounter.label,
    encounter.homeTeamLabel,
    encounter.awayTeamLabel,
    encounter.plannedDate ?? encounter.actualDate ?? '',
  ].join('|')

  return `derived:${createHash('sha256').update(source).digest('hex')}`
}

export const createFfttSynchronizer = (
  client: FfttClient,
  database: Database = db,
  logger: FfttSynchronizationLogger = (message, context) => console.warn(message, context)
) => ({
  async synchronizeClub(options: FfttSynchronizationOptions): Promise<FfttSynchronizationSummary> {
    if (!/^\d+$/.test(options.clubNumber)) {
      throw new Error('The FFTT club number must contain only digits')
    }

    logger('FFTT synchronization started', { clubNumber: options.clubNumber })

    if (options.verifyAccess === true) {
      const initialization = await client.initialize()
      if (!initialization.applicationAuthorized) {
        throw new Error(initialization.message ?? 'FFTT application is not authorized')
      }
    }

    const mainClub = await client.searchClubs({ number: options.clubNumber })
    const sourceClub = mainClub[0]
    if (sourceClub === undefined) {
      throw new Error(`FFTT club not found: ${options.clubNumber}`)
    }

    const mainClubId = await upsertClub(database, sourceClub)
    const sourceTeams = await client.listTeams(options.clubNumber)
    const divisionLinks = [...new Set(sourceTeams.map((team) => team.divisionLink).filter((link): link is string => link !== undefined))]
    logger('FFTT club loaded', {
      clubNumber: options.clubNumber,
      teamCount: sourceTeams.length,
      divisionCount: divisionLinks.length,
    })
    const summary: FfttSynchronizationSummary = {
      clubNumber: options.clubNumber,
      divisions: 0,
      pools: 0,
      clubs: 1,
      teams: 0,
      players: 0,
      encounters: 0,
      lineups: 0,
      skippedEncounters: 0,
      skippedEncounterReasons: {
        missingTeams: 0,
        missingDate: 0,
      },
    }

    const licensesByClub = new Map<string, FfttLicense[]>()
    const clubIds = new Map([[options.clubNumber, mainClubId]])
    const teamIds = new Map<string, string>()
    const teamIdsByPoolAndLabel = new Map<string, string>()
    const clubNumbersByPoolAndLabel = new Map<string, string>()

    const mainLicenses = await client.listLicensesByClub(options.clubNumber)
    licensesByClub.set(options.clubNumber, mainLicenses)
    for (const license of mainLicenses) {
      await upsertPlayer(database, license, mainClubId)
      summary.players += 1
    }
    logger('FFTT club players synchronized', { count: summary.players })

    for (const link of divisionLinks) {
      const divisionId = extractDivisionId(link)
      if (divisionId === undefined) {
        continue
      }

      const divisionLabel =
        sourceTeams.find((team) => team.divisionLink === link)?.divisionLabel ?? divisionId
      const localDivisionId = await upsertDivision(database, divisionId, divisionLabel)
      summary.divisions += 1
      const sourcePools = await client.listPools(divisionId)
      logger('FFTT division loaded', {
        divisionId,
        divisionLabel,
        poolCount: sourcePools.length,
      })
      const clubPoolIds = new Set(
        sourceTeams
          .filter((team) => team.divisionLink === link)
          .map((team) => extractPoolId(team.divisionLink))
          .filter((poolId): poolId is string => poolId !== undefined)
      )

      for (const sourcePool of sourcePools) {
        const sourcePoolId = extractPoolId(sourcePool.link) ?? sourcePool.externalId
        const rankings = await client.listPoolRankings(divisionId, sourcePoolId)

        const belongsToClub =
          clubPoolIds.has(sourcePoolId) || rankings.some((ranking) => ranking.clubNumber === options.clubNumber)
        if (!belongsToClub) {
          continue
        }

        const localPoolId = await upsertPool(database, sourcePool, localDivisionId)
        summary.pools += 1

        for (const ranking of rankings) {
          const clubNumber = ranking.clubNumber

          let localClubId = clubIds.get(clubNumber)
          if (localClubId === undefined) {
            const clubsFound = await client.searchClubs({ number: clubNumber })
            const opponent = clubsFound[0]
            if (opponent === undefined) {
              continue
            }
            localClubId = await upsertClub(database, opponent)
            clubIds.set(clubNumber, localClubId)
            summary.clubs += 1
          }

          const teamExternalId = ranking.teamExternalId ?? derivedTeamExternalId(clubNumber, ranking.teamLabel)
          const localTeamId = await upsertTeam(database, teamExternalId, localClubId)
          teamIds.set(`${clubNumber}:${normalizeName(ranking.teamLabel)}`, localTeamId)
          teamIdsByPoolAndLabel.set(`${localPoolId}:${normalizeName(ranking.teamLabel)}`, localTeamId)
          clubNumbersByPoolAndLabel.set(`${localPoolId}:${normalizeName(ranking.teamLabel)}`, clubNumber)
          await database
            .insert(pool_team)
            .values({ pool_id: localPoolId, team_id: localTeamId })
            .onConflictDoNothing()
          summary.teams += 1

          if (!licensesByClub.has(clubNumber)) {
            const licenses = await client.listLicensesByClub(clubNumber)
            licensesByClub.set(clubNumber, licenses)
            for (const license of licenses) {
              await upsertPlayer(database, license, localClubId)
              summary.players += 1
            }
          }
        }

        const encountersToSync = await client.listPoolEncounters(divisionId, sourcePoolId)
        for (const encounter of encountersToSync) {
          const homeTeamKey = `${localPoolId}:${normalizeName(encounter.homeTeamLabel)}`
          const awayTeamKey = `${localPoolId}:${normalizeName(encounter.awayTeamLabel)}`
          const homeTeamId =
            teamIds.get(`${encounter.homeClubNumber}:${normalizeName(encounter.homeTeamLabel)}`) ??
            teamIdsByPoolAndLabel.get(`${localPoolId}:${normalizeName(encounter.homeTeamLabel)}`)
          const awayTeamId =
            teamIds.get(`${encounter.awayClubNumber}:${normalizeName(encounter.awayTeamLabel)}`) ??
            teamIdsByPoolAndLabel.get(`${localPoolId}:${normalizeName(encounter.awayTeamLabel)}`)
          const homeClubNumber = encounter.homeClubNumber ?? clubNumbersByPoolAndLabel.get(homeTeamKey)
          const awayClubNumber = encounter.awayClubNumber ?? clubNumbersByPoolAndLabel.get(awayTeamKey)
          if (homeClubNumber !== options.clubNumber && awayClubNumber !== options.clubNumber) {
            continue
          }
          const playedAt = parseFfttDate(encounter.actualDate ?? encounter.plannedDate)
          const status = getEncounterStatus(encounter)
          if (homeTeamId === undefined || awayTeamId === undefined) {
            summary.skippedEncounters += 1
            summary.skippedEncounterReasons.missingTeams += 1
            continue
          }
          if (playedAt === undefined) {
            summary.skippedEncounters += 1
            summary.skippedEncounterReasons.missingDate += 1
            continue
          }

          const [localEncounter] = await database
            .insert(encounters)
            .values({
              ffttId: parseEncounterId(encounter, localPoolId),
              pool_id: localPoolId,
              home_team: homeTeamId,
              away_team: awayTeamId,
              played_at: playedAt,
              championship_day_number: encounter.championshipDayNumber,
              home_score: encounter.homeScore,
              away_score: encounter.awayScore,
              status,
            })
            .onConflictDoUpdate({
              target: encounters.ffttId,
              set: {
                played_at: playedAt,
                championship_day_number: encounter.championshipDayNumber,
                home_score: encounter.homeScore,
                away_score: encounter.awayScore,
                status,
              },
            })
            .returning({ id: encounters.id })

          if (localEncounter === undefined) {
            throw new Error(`Unable to upsert FFTT encounter ${encounter.label}`)
          }

          if (encounter.detailsLink !== undefined) {
            const detailsQuery = new URLSearchParams(encounter.detailsLink.replace(/^.*\?/, ''))
            const details = await client.getEncounterDetails({
              isReturn: detailsQuery.get('is_retour') ?? '',
              phase: detailsQuery.get('phase') ?? '',
              result1: detailsQuery.get('res_1') ?? '',
              result2: detailsQuery.get('res_2') ?? '',
              encounterId: detailsQuery.get('renc_id') ?? '',
              team1: detailsQuery.get('equip_1') ?? '',
              team2: detailsQuery.get('equip_2') ?? '',
              teamId1: detailsQuery.get('equip_id1') ?? '',
              teamId2: detailsQuery.get('equip_id2') ?? '',
            })

            for (const pair of details.players) {
              const homeLicense = findLicense(pair.homePlayerLabel, licensesByClub.get(homeClubNumber ?? '') ?? [])
              const awayLicense = findLicense(pair.awayPlayerLabel, licensesByClub.get(awayClubNumber ?? '') ?? [])
              for (const [license, teamId] of [
                [homeLicense, homeTeamId],
                [awayLicense, awayTeamId],
              ] as const) {
                if (license === undefined) {
                  continue
                }
                const playerId = await upsertPlayer(database, license, clubIds.get(license.clubNumber) ?? mainClubId)
                await database
                  .insert(encounter_lineup)
                  .values({ encounter_id: localEncounter.id, player_id: playerId, team_id: teamId })
                  .onConflictDoNothing()
                summary.lineups += 1
              }
            }
          }
          summary.encounters += 1
        }
      }
    }

    logger('FFTT club synchronization completed', { ...summary })
    return summary
  },
})

export type FfttSynchronizer = ReturnType<typeof createFfttSynchronizer>
