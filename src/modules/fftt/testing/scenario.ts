import type { FfttScenario } from './fake-client.js'

export const mainClubNumber = '44123456'
export const opponentClubNumber = '44987654'
export const thirdClubNumber = '44555555'

export const divisionId = '6789'
export const poolId = '112233'
export const otherPoolId = '445566'

const poolLink = `action=poule&auto=1&D1=${divisionId}&cx_poule=${poolId}`
const otherPoolLink = `action=poule&auto=1&D1=${divisionId}&cx_poule=${otherPoolId}`

const detailsLink = (encounterId: string, home: string, away: string) =>
  `action=detail&auto=1&renc_id=${encounterId}&is_retour=0&phase=1&res_1=0&res_2=0` +
  `&equip_1=${encodeURIComponent(home)}&equip_2=${encodeURIComponent(away)}&equip_id1=111&equip_id2=222`

export const buildScenario = (): FfttScenario => ({
  clubs: [
    { externalId: '1234', number: mainClubNumber, name: 'MELLINET TT' },
    { externalId: '5678', number: opponentClubNumber, name: 'ST HERBLAIN TT' },
    { externalId: '9012', number: thirdClubNumber, name: 'NANTES ASPTT' },
  ],

  teamsByClub: {
    [mainClubNumber]: [
      {
        label: 'Mellinet TT 1',
        divisionLabel: 'Départementale 1 Phase 1',
        divisionLink: poolLink,
      },
    ],
  },

  licensesByClub: {
    [mainClubNumber]: [
      {
        externalId: 'L1',
        licenseNumber: '4412345601',
        firstName: 'Alice',
        lastName: 'Martin',
        clubNumber: mainClubNumber,
        clubName: 'MELLINET TT',
        points: 1250,
      },
      {
        externalId: 'L2',
        licenseNumber: '4412345602',
        firstName: 'Chloé',
        lastName: 'Bernard',
        clubNumber: mainClubNumber,
        clubName: 'MELLINET TT',
        points: 980,
      },
    ],
    [opponentClubNumber]: [
      {
        externalId: 'L3',
        licenseNumber: '4498765401',
        firstName: 'Bob',
        lastName: 'Durand',
        clubNumber: opponentClubNumber,
        clubName: 'ST HERBLAIN TT',
        points: 1100,
      },
    ],
    [thirdClubNumber]: [
      {
        externalId: 'L4',
        licenseNumber: '4455555501',
        firstName: 'Denis',
        lastName: 'Petit',
        clubNumber: thirdClubNumber,
        clubName: 'NANTES ASPTT',
        points: 900,
      },
    ],
  },

  poolsByDivision: {
    [divisionId]: [
      {
        externalId: poolId,
        divisionExternalId: divisionId,
        label: 'Poule A',
        link: poolLink,
      },
      {
        externalId: otherPoolId,
        divisionExternalId: divisionId,
        label: 'Poule B',
        link: otherPoolLink,
      },
    ],
  },

  rankingsByPool: {
    [`${divisionId}:${poolId}`]: [
      {
        poolLabel: 'Poule A',
        rank: 1,
        teamLabel: 'Mellinet TT 1',
        matchesPlayed: 1,
        matchPoints: 3,
        clubNumber: mainClubNumber,
        teamExternalId: '111',
        clubExternalId: '1234',
        wins: 1,
        losses: 0,
        draws: 0,
        penalties: 0,
        gamesWon: 14,
        gamesLost: 6,
      },
      {
        poolLabel: 'Poule A',
        rank: 2,
        teamLabel: 'St Herblain TT 2',
        matchesPlayed: 1,
        matchPoints: 1,
        clubNumber: opponentClubNumber,
        teamExternalId: '222',
        clubExternalId: '5678',
        wins: 0,
        losses: 1,
        draws: 0,
        penalties: 0,
        gamesWon: 6,
        gamesLost: 14,
      },
      {
        poolLabel: 'Poule A',
        rank: 3,
        teamLabel: 'Nantes ASPTT 3',
        matchesPlayed: 0,
        matchPoints: 0,
        clubNumber: thirdClubNumber,
        teamExternalId: '333',
        clubExternalId: '9012',
        wins: 0,
        losses: 0,
        draws: 0,
        penalties: 0,
        gamesWon: 0,
        gamesLost: 0,
      },
    ],
    [`${divisionId}:${otherPoolId}`]: [
      {
        poolLabel: 'Poule B',
        rank: 1,
        teamLabel: 'Reze TT 1',
        matchesPlayed: 0,
        matchPoints: 0,
        clubNumber: '44777777',
        teamExternalId: '444',
        wins: 0,
        losses: 0,
        draws: 0,
        penalties: 0,
        gamesWon: 0,
        gamesLost: 0,
      },
    ],
  },

  encountersByPool: {
    [`${divisionId}:${poolId}`]: [
      {
        label: 'Tour n°1',
        homeTeamLabel: 'Mellinet TT 1',
        awayTeamLabel: 'St Herblain TT 2',
        homeScore: 14,
        awayScore: 6,
        plannedDate: '13/09/2025',
        actualDate: '13/09/2025',
        detailsLink: detailsLink('987654', 'Mellinet TT 1', 'St Herblain TT 2'),
        homeClubNumber: mainClubNumber,
        awayClubNumber: opponentClubNumber,
        championshipDayNumber: 1,
        isLive: false,
      },
      {
        label: 'Tour n°1',
        homeTeamLabel: 'St Herblain TT 2',
        awayTeamLabel: 'Nantes ASPTT 3',
        plannedDate: '13/09/2025',
        homeClubNumber: opponentClubNumber,
        awayClubNumber: thirdClubNumber,
        championshipDayNumber: 1,
        isLive: false,
      },
      {
        label: 'Tour n°2',
        homeTeamLabel: 'Nantes ASPTT 3',
        awayTeamLabel: 'Mellinet TT 1',
        plannedDate: '27/09/2025',
        homeClubNumber: thirdClubNumber,
        awayClubNumber: mainClubNumber,
        championshipDayNumber: 2,
        isLive: false,
      },
      {
        label: 'Tour n°3',
        homeTeamLabel: 'Mellinet TT 1',
        awayTeamLabel: 'Nantes ASPTT 3',
        plannedDate: '11/10/2025',
        actualDate: '18/10/2025',
        homeClubNumber: mainClubNumber,
        awayClubNumber: thirdClubNumber,
        championshipDayNumber: 3,
        isLive: false,
      },
    ],
  },

  encounterDetails: {
    '987654': {
      homeTeamLabel: 'Mellinet TT 1',
      awayTeamLabel: 'St Herblain TT 2',
      homeScore: 14,
      awayScore: 6,
      players: [
        { homePlayerLabel: 'MARTIN Alice', awayPlayerLabel: 'DURAND Bob' },
        { homePlayerLabel: 'BERNARD Chloé', awayPlayerLabel: 'INCONNU Xavier' },
      ],
      games: [
        {
          homePlayerLabel: 'MARTIN Alice',
          awayPlayerLabel: 'DURAND Bob',
          homeScore: 3,
          awayScore: 1,
          setDetails: '11/9 8/11 11/5 11/7',
        },
        {
          homePlayerLabel: 'BERNARD Chloé',
          awayPlayerLabel: 'INCONNU Xavier',
          homeScore: 1,
          awayScore: 3,
        },
        {
          homePlayerLabel: 'MARTIN Alice - BERNARD Chloé',
          awayPlayerLabel: 'DURAND Bob - INCONNU Xavier',
          homeScore: 3,
          awayScore: 0,
        },
        // A general forfeit is published without any score.
        {
          homePlayerLabel: 'BERNARD Chloé',
          awayPlayerLabel: 'DURAND Bob',
        },
      ],
    },
  },
})
