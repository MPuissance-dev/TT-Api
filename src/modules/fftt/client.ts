import { createHash, createHmac } from 'node:crypto'
import { XMLParser } from 'fast-xml-parser'
import type {
  FfttClub,
  FfttClubDetails,
  FfttClubSearch,
  FfttDivision,
  FfttEncounter,
  FfttEncounterDetails,
  FfttEncounterDetailsQuery,
  FfttEvent,
  FfttEventCategory,
  FfttEventType,
  FfttInitialization,
  FfttLicense,
  FfttLicenseDetails,
  FfttOrganization,
  FfttOrganizationType,
  FfttPlayerSummary,
  FfttPool,
  FfttTeam,
  FfttTeamRanking,
  FfttTeamType,
} from './models.js'

const defaultBaseUrl = 'https://www.fftt.com/mobile/pxml'
const requestTimeoutMs = 10_000

export interface FfttClientConfig {
  applicationCode?: string | undefined
  password?: string | undefined
  serie?: string | undefined
  baseUrl?: string | undefined
  endpoint?: string | undefined
}

interface FfttRequestParameters {
  serie: string
  tm: string
  tmc: string
  id: string
}

type XmlNode = Record<string, unknown>

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  isArray: (name) =>
    ['organisme', 'epreuve', 'division', 'equipe', 'poule', 'tour', 'classement', 'joueur', 'partie'].includes(
      name
    ),
})

const requiredConfig = (name: string, value: string | undefined): string => {
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing FFTT configuration: ${name}`)
  }

  return value
}

const formatTimestamp = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value
      return result
    }, {})

  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}${String(
    date.getMilliseconds()
  ).padStart(3, '0')}`
}

const createRequestParameters = (config: FfttClientConfig, date = new Date()): FfttRequestParameters => {
  const password = requiredConfig('FFTT_PWD', config.password)
  const timestamp = formatTimestamp(date)
  const passwordHash = createHash('md5').update(password).digest('hex')

  return {
    serie: requiredConfig('FFTT_SERIE', config.serie),
    tm: timestamp,
    tmc: createHmac('sha1', passwordHash).update(timestamp).digest('hex'),
    id: requiredConfig('FFTT_APPILICATION_CODE', config.applicationCode),
  }
}

const findNodes = (value: unknown, name: string): XmlNode[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findNodes(item, name))
  }

  if (typeof value !== 'object' || value === null) {
    return []
  }

  const object = value as XmlNode
  const nodes = object[name]
  const matches = Array.isArray(nodes)
    ? nodes.filter((node): node is XmlNode => typeof node === 'object' && node !== null)
    : typeof nodes === 'object' && nodes !== null
      ? [nodes as XmlNode]
      : []
  const nested = Object.entries(object)
    .filter(([key]) => key !== name)
    .flatMap(([, child]) => findNodes(child, name))

  return [...matches, ...nested]
}

const text = (node: XmlNode, field: string): string | undefined => {
  const value = node[field]
  const scalarValue = Array.isArray(value) ? value[0] : value

  if (typeof scalarValue === 'number') {
    return String(scalarValue)
  }

  return typeof scalarValue === 'string' && scalarValue.length > 0 ? scalarValue : undefined
}

const requiredText = (node: XmlNode, field: string): string => {
  const value = text(node, field)
  if (value === undefined) {
    throw new Error(`Missing FFTT response field: ${field}`)
  }

  return value
}

const numberValue = (node: XmlNode, field: string): number | undefined => {
  const value = text(node, field)
  if (value === undefined) {
    return undefined
  }

  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric FFTT response field ${field}: ${value}`)
  }

  return parsed
}

const mapClub = (node: XmlNode): FfttClub => ({
  externalId: requiredText(node, 'idclub'),
  number: requiredText(node, 'numero'),
  name: requiredText(node, 'nom'),
  ...(text(node, 'validation') === undefined ? {} : { validationDate: text(node, 'validation') }),
})

const mapClubDetails = (node: XmlNode): FfttClubDetails => ({
  externalId: requiredText(node, 'idclub'),
  number: requiredText(node, 'numero'),
  ...(text(node, 'nomsalle') === undefined ? {} : { roomName: text(node, 'nomsalle') }),
  ...(text(node, 'adressesalle1') === undefined ? {} : { address1: text(node, 'adressesalle1') }),
  ...(text(node, 'adressesalle2') === undefined ? {} : { address2: text(node, 'adressesalle2') }),
  ...(text(node, 'adressesalle3') === undefined ? {} : { address3: text(node, 'adressesalle3') }),
  ...(text(node, 'codepsalle') === undefined ? {} : { postalCode: text(node, 'codepsalle') }),
  ...(text(node, 'villesalle') === undefined ? {} : { city: text(node, 'villesalle') }),
  ...(text(node, 'web') === undefined ? {} : { website: text(node, 'web') }),
  ...(numberValue(node, 'latitude') === undefined ? {} : { latitude: numberValue(node, 'latitude') }),
  ...(numberValue(node, 'longitude') === undefined ? {} : { longitude: numberValue(node, 'longitude') }),
})

const mapOrganization = (node: XmlNode): FfttOrganization => ({
  externalId: requiredText(node, 'id'),
  label: requiredText(node, 'libelle'),
  code: requiredText(node, 'code'),
  ...(text(node, 'idpere') === undefined ? {} : { parentExternalId: text(node, 'idpere') }),
})

const mapEvent = (node: XmlNode, type: FfttEventType): FfttEvent => ({
  externalId: requiredText(node, 'idepreuve'),
  organizationExternalId: requiredText(node, 'idorga'),
  label: requiredText(node, 'libelle'),
  type,
  category: requiredText(node, 'typepreuve') as FfttEventCategory,
})

const mapDivision = (node: XmlNode, organizationExternalId: string, eventExternalId: string): FfttDivision => ({
  externalId: requiredText(node, 'iddivision'),
  organizationExternalId,
  eventExternalId,
  label: requiredText(node, 'libelle'),
})

const mapTeam = (node: XmlNode): FfttTeam => ({
  label: requiredText(node, 'libequipe'),
  divisionLabel: requiredText(node, 'libdivision'),
  ...(text(node, 'liendivision') === undefined ? {} : { divisionLink: text(node, 'liendivision') }),
  ...(text(node, 'idepr') === undefined ? {} : { eventExternalId: text(node, 'idepr') }),
  ...(text(node, 'libepr') === undefined ? {} : { eventLabel: text(node, 'libepr') }),
})

const mapPool = (node: XmlNode, divisionExternalId: string): FfttPool => ({
  externalId: requiredText(node, 'lien'),
  divisionExternalId,
  label: requiredText(node, 'libelle'),
  link: requiredText(node, 'lien'),
})

const extractChampionshipDayNumber = (label: string | undefined): number | undefined => {
  const match = label?.match(/\btour\s+n\D*(\d+)/i)
  return match === undefined || match === null ? undefined : Number(match[1])
}

const mapEncounter = (node: XmlNode): FfttEncounter => ({
  label: requiredText(node, 'libelle'),
  homeTeamLabel: requiredText(node, 'equa'),
  awayTeamLabel: requiredText(node, 'equb'),
  ...(numberValue(node, 'scorea') === undefined ? {} : { homeScore: numberValue(node, 'scorea') }),
  ...(numberValue(node, 'scoreb') === undefined ? {} : { awayScore: numberValue(node, 'scoreb') }),
  ...(text(node, 'dateprevue') === undefined ? {} : { plannedDate: text(node, 'dateprevue') }),
  ...(text(node, 'datereelle') === undefined ? {} : { actualDate: text(node, 'datereelle') }),
  ...(text(node, 'lien') === undefined ? {} : { detailsLink: text(node, 'lien') }),
  ...(text(node, 'ncluba') === undefined ? {} : { homeClubNumber: text(node, 'ncluba') }),
  ...(text(node, 'nclubb') === undefined ? {} : { awayClubNumber: text(node, 'nclubb') }),
  ...(text(node, 'poule') === undefined ? {} : { poolExternalId: text(node, 'poule') }),
  ...(extractChampionshipDayNumber(text(node, 'libelle')) === undefined
    ? {}
    : { championshipDayNumber: extractChampionshipDayNumber(text(node, 'libelle')) }),
  isLive: text(node, 'live') === '1',
})

const mapRanking = (node: XmlNode, fallbackPoolLabel: string): FfttTeamRanking => ({
  poolLabel: text(node, 'poule') ?? fallbackPoolLabel,
  rank: numberValue(node, 'clt') ?? 0,
  teamLabel: requiredText(node, 'equipe'),
  matchesPlayed: numberValue(node, 'joue') ?? 0,
  matchPoints: numberValue(node, 'pts') ?? 0,
  clubNumber: requiredText(node, 'numero'),
  ...(text(node, 'idequipe') === undefined ? {} : { teamExternalId: text(node, 'idequipe') }),
  ...(text(node, 'idclub') === undefined ? {} : { clubExternalId: text(node, 'idclub') }),
  wins: numberValue(node, 'vic') ?? 0,
  losses: numberValue(node, 'def') ?? 0,
  draws: numberValue(node, 'nul') ?? 0,
  penalties: numberValue(node, 'pf') ?? 0,
  gamesWon: numberValue(node, 'pg') ?? 0,
  gamesLost: numberValue(node, 'pp') ?? 0,
})

const mapLicense = (node: XmlNode): FfttLicense => ({
  externalId: requiredText(node, 'idlicence'),
  licenseNumber: requiredText(node, 'licence'),
  firstName: requiredText(node, 'prenom'),
  lastName: requiredText(node, 'nom'),
  clubNumber: requiredText(node, 'numclub'),
  clubName: requiredText(node, 'nomclub'),
  ...(text(node, 'sexe') === undefined ? {} : { gender: text(node, 'sexe') as 'M' | 'F' }),
  ...(text(node, 'type') === undefined ? {} : { type: text(node, 'type') as 'T' | 'P' }),
  ...(text(node, 'certif') === undefined ? {} : { medicalCertificate: text(node, 'certif') }),
  ...(text(node, 'validation') === undefined ? {} : { validationDate: text(node, 'validation') }),
  ...(text(node, 'echelon') === undefined ? {} : { echelon: text(node, 'echelon') }),
  ...(numberValue(node, 'place') === undefined ? {} : { nationalRank: numberValue(node, 'place') }),
  ...(numberValue(node, 'point') === undefined ? {} : { points: numberValue(node, 'point') }),
  ...(text(node, 'cat') === undefined ? {} : { ageCategory: text(node, 'cat') }),
})

const mapLicenseDetails = (node: XmlNode): FfttLicenseDetails => ({
  ...mapLicense(node),
  ...(numberValue(node, 'pointm') === undefined ? {} : { monthlyPoints: numberValue(node, 'pointm') }),
  ...(numberValue(node, 'apointm') === undefined ? {} : { previousMonthlyPoints: numberValue(node, 'apointm') }),
  ...(numberValue(node, 'initm') === undefined ? {} : { initialPoints: numberValue(node, 'initm') }),
  ...(text(node, 'mutation') === undefined ? {} : { mutationDate: text(node, 'mutation') }),
  ...(text(node, 'natio') === undefined ? {} : { nationality: text(node, 'natio') }),
  ...(text(node, 'arb') === undefined ? {} : { refereeGrade: text(node, 'arb') }),
  ...(text(node, 'ja') === undefined ? {} : { umpireGrade: text(node, 'ja') }),
  ...(text(node, 'tech') === undefined ? {} : { technicianGrade: text(node, 'tech') }),
  ...(text(node, 'naissance') === undefined ? {} : { birthDate: text(node, 'naissance') }),
})

const mapPlayerSummary = (node: XmlNode): FfttPlayerSummary => ({
  licenseNumber: requiredText(node, 'licence'),
  firstName: requiredText(node, 'prenom'),
  lastName: requiredText(node, 'nom'),
  clubName: requiredText(node, 'nclub'),
  clubNumber: requiredText(node, 'club'),
  ...(text(node, 'clast') === undefined ? {} : { ranking: text(node, 'clast') }),
})

export const createFfttClient = (config: FfttClientConfig) => {
  const request = async (script: string, params: Record<string, string>): Promise<unknown> => {
    const query = new URLSearchParams({
      ...createRequestParameters(config),
      ...params,
    })
    const endpoint =
      config.endpoint !== undefined && script === 'xml_liste_joueur_o.php'
        ? config.endpoint
        : `${config.baseUrl ?? defaultBaseUrl}/${script}`
    const response = await fetch(`${endpoint}?${query.toString()}`, {
      signal: AbortSignal.timeout(requestTimeoutMs),
    })

    if (!response.ok) {
      throw new Error(`FFTT API request failed with status ${response.status}`)
    }

    const parsed = parser.parse(await response.text())
    const errors = findNodes(parsed, 'erreur')
    if (errors.length > 0) {
      throw new Error(`FFTT API returned an error: ${JSON.stringify(errors[0])}`)
    }

    return parsed
  }

  const nodes = async (script: string, node: string, params: Record<string, string>): Promise<XmlNode[]> =>
    findNodes(await request(script, params), node)

  return {
    async initialize(): Promise<FfttInitialization> {
      const result = (await request('xml_initialisation.php', {})) as Record<string, unknown>
      const initialization = findNodes(result, 'initialisation')[0]
      if (initialization === undefined) {
        throw new Error('Missing FFTT initialization response')
      }

      return {
        applicationAuthorized: text(initialization, 'appli') === '1',
        ...(text(initialization, 'message') === undefined ? {} : { message: text(initialization, 'message') }),
      }
    },

    async listClubsByDepartment(department: string): Promise<FfttClub[]> {
      return (await nodes('xml_club_dep2.php', 'club', { dep: department })).map(mapClub)
    },

    async searchClubs(search: FfttClubSearch): Promise<FfttClub[]> {
      const entries = Object.entries({
        dep: search.department,
        ville: search.city,
        numero: search.number,
        code: search.postalCode,
      }).filter(([, value]) => value !== undefined)
      if (entries.length !== 1) {
        throw new Error('FFTT club search requires exactly one search criterion')
      }

      return (await nodes('xml_club_b.php', 'club', Object.fromEntries(entries) as Record<string, string>)).map(mapClub)
    },

    async getClubDetails(clubNumber: string, teamId?: string): Promise<FfttClubDetails> {
      const result = (await nodes('xml_club_detail.php', 'club', {
        club: clubNumber,
        ...(teamId === undefined ? {} : { idequipe: teamId }),
      }))[0]
      if (result === undefined) {
        throw new Error(`FFTT club not found: ${clubNumber}`)
      }

      return mapClubDetails(result)
    },

    async listOrganizations(type: FfttOrganizationType, parentId?: string): Promise<FfttOrganization[]> {
      return (
        await nodes('xml_organisme.php', 'organisme', {
          type,
          ...(parentId === undefined ? {} : { pere: parentId }),
        })
      ).map(mapOrganization)
    },

    async listEvents(organizationId: string, type: FfttEventType): Promise<FfttEvent[]> {
      return (await nodes('xml_epreuve.php', 'epreuve', { organisme: organizationId, type })).map((node) =>
        mapEvent(node, type)
      )
    },

    async listDivisions(organizationId: string, eventId: string, type: FfttEventType): Promise<FfttDivision[]> {
      return (
        await nodes('xml_division.php', 'division', {
          organisme: organizationId,
          epreuve: eventId,
          type,
        })
      ).map((node) => mapDivision(node, organizationId, eventId))
    },

    async listTeams(clubNumber: string, type: FfttTeamType = ''): Promise<FfttTeam[]> {
      return (await nodes('xml_equipe.php', 'equipe', { numclu: clubNumber, type })).map(mapTeam)
    },

    async listPools(divisionId: string): Promise<FfttPool[]> {
      return (await nodes('xml_result_equ.php', 'poule', { action: 'poule', auto: '1', D1: divisionId })).map((node) =>
        mapPool(node, divisionId)
      )
    },

    async listPoolRankings(divisionId: string, poolId?: string): Promise<FfttTeamRanking[]> {
      const initialRankings = await nodes('xml_result_equ.php', 'classement', {
          action: 'initial',
          auto: '1',
          D1: divisionId,
          ...(poolId === undefined ? {} : { cx_poule: poolId }),
        })
      if (initialRankings.length > 0 || poolId === undefined) {
        return initialRankings.map((node) => mapRanking(node, poolId ?? divisionId))
      }

      const alternateRankings = await nodes('xml_result_equ.php', 'classement', {
        action: 'classement',
        auto: '1',
        D1: divisionId,
        ...(poolId === undefined ? {} : { cx_poule: poolId }),
      })
      return alternateRankings.map((node) => mapRanking(node, poolId))
    },

    async listPoolEncounters(divisionId: string, poolId?: string): Promise<FfttEncounter[]> {
      return (
        await nodes('xml_result_equ.php', 'tour', {
          action: '',
          auto: '1',
          D1: divisionId,
          ...(poolId === undefined ? {} : { cx_poule: poolId }),
        })
      ).map(mapEncounter)
    },

    async listEncounters(poolIds: string[]): Promise<FfttEncounter[]> {
      if (poolIds.length === 0) {
        return []
      }

      return (await nodes('xml_rencontre_equ.php', 'tour', { poule: poolIds.join('|') })).map(mapEncounter)
    },

    async getEncounterDetails(query: FfttEncounterDetailsQuery): Promise<FfttEncounterDetails> {
      const result = (await request('xml_chp_renc.php', {
        is_retour: query.isReturn,
        phase: query.phase,
        res_1: query.result1,
        res_2: query.result2,
        renc_id: query.encounterId,
        equip_1: query.team1,
        equip_2: query.team2,
        equip_id1: query.teamId1,
        equip_id2: query.teamId2,
      })) as Record<string, unknown>
      const resultNode = findNodes(result, 'resultat')[0]
      if (resultNode === undefined) {
        throw new Error(`FFTT encounter not found: ${query.encounterId}`)
      }

      return {
        homeTeamLabel: requiredText(resultNode, 'equa'),
        awayTeamLabel: requiredText(resultNode, 'equb'),
        ...(numberValue(resultNode, 'resa') === undefined ? {} : { homeScore: numberValue(resultNode, 'resa') }),
        ...(numberValue(resultNode, 'resb') === undefined ? {} : { awayScore: numberValue(resultNode, 'resb') }),
        players: findNodes(result, 'joueur').map((node) => ({
          homePlayerLabel: requiredText(node, 'xja'),
          ...(text(node, 'xca') === undefined ? {} : { homePlayerRanking: text(node, 'xca') }),
          awayPlayerLabel: requiredText(node, 'xjb'),
          ...(text(node, 'xcb') === undefined ? {} : { awayPlayerRanking: text(node, 'xcb') }),
        })),
        games: findNodes(result, 'partie').map((node) => ({
          homePlayerLabel: requiredText(node, 'ja'),
          ...(numberValue(node, 'scorea') === undefined ? {} : { homeScore: numberValue(node, 'scorea') }),
          awayPlayerLabel: requiredText(node, 'jb'),
          ...(numberValue(node, 'scoreb') === undefined ? {} : { awayScore: numberValue(node, 'scoreb') }),
          ...(text(node, 'detail') === undefined ? {} : { setDetails: text(node, 'detail') }),
        })),
      }
    },

    async listPlayersByClub(clubNumber: string): Promise<FfttPlayerSummary[]> {
      if (!/^\d+$/.test(clubNumber)) {
        throw new Error('The FFTT club number must contain only digits')
      }

      return (await nodes('xml_liste_joueur_o.php', 'joueur', { club: clubNumber })).map(mapPlayerSummary)
    },

    async listLicensesByClub(clubNumber: string): Promise<FfttLicense[]> {
      if (!/^\d+$/.test(clubNumber)) {
        throw new Error('The FFTT club number must contain only digits')
      }

      return (await nodes('xml_licence_b.php', 'licence', { club: clubNumber })).map(mapLicense)
    },

    async getLicense(licenseNumber: string): Promise<FfttLicenseDetails> {
      const result = (await nodes('xml_licence_b.php', 'licence', { licence: licenseNumber }))[0]
      if (result === undefined) {
        throw new Error(`FFTT license not found: ${licenseNumber}`)
      }

      return mapLicenseDetails(result)
    },
  }
}

export type FfttClient = ReturnType<typeof createFfttClient>
