## Commandes utiles

### Mise à jour des packages

```bash
npm update
npx npm-check-updates -u && npm install
```

### Drizzle

Les commandes suivantes utilisent la configuration définie dans `drizzle.config.ts`.
Assure-toi que `DATABASE_URL` est bien renseignée avant de les lancer.

```bash
# Creer/demarrer PostgreSQL en local via Podman
npm run db:local:up

# Preparer completement la base locale (Podman + migrations + seed)
npm run db:local:setup

# Générer une migration à partir du schéma Drizzle
npm run db:generate

# Appliquer les migrations sur la base
npm run db:migrate

# Réinitialiser puis reseed la base de données
npm run db:seed

# Ouvrir Drizzle Studio
npx drizzle-kit studio
```

### Comment fonctionne Drizzle dans ce projet

Ce projet utilise **Drizzle ORM** avec **PostgreSQL**.

- Les tables sont déclarées dans `src/db/schemas/`
- Les relations sont centralisées dans `src/db/relations.ts`
- Les exports de schéma sont regroupés dans `src/db/schemas/index.ts`
- La connexion PostgreSQL et l'instance Drizzle sont définies dans `src/db/index.ts`
- Les migrations SQL générées sont stockées dans `migrations/`

En pratique, Drizzle sert ici a faire le lien entre :

1. **Le schema TypeScript** defini dans `src/db/schemas`
2. **Les migrations SQL** generees par `drizzle-kit`
3. **La base PostgreSQL** utilisee par l'application

### Utilisation en local

Le projet fournit un script Podman pour eviter de creer la base a la main.

Commandes principales :

```bash
npm run db:local:up
npm run db:local:down
npm run db:local:status
npm run db:local:logs
npm run db:local:reset
```

La configuration locale par defaut est :

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5433/mellinet-DB
```

Si tu veux tout preparer en une seule commande :

```bash
npm run db:local:setup
```

Cette commande :

1. cree ou demarre un conteneur Podman `tt-postgres`
2. attend que PostgreSQL soit pret
3. applique les migrations Drizzle
4. recharge les donnees de demo

Ensuite, tu peux lancer l'API normalement avec :

```bash
npm start
```

### Workflow recommande quand tu modifies le schema

Quand tu ajoutes ou modifies une table :

1. Modifier ou ajouter le fichier de schema dans `src/db/schemas/`
2. Exporter le schema dans `src/db/schemas/index.ts` si necessaire
3. Mettre a jour `src/db/relations.ts` si de nouvelles relations sont ajoutees
4. Generer une migration avec `npm run db:generate`
5. Appliquer la migration avec `npm run db:migrate`
6. Mettre a jour le seed si les donnees de demo doivent suivre le nouveau schema

### A quoi servent les commandes

- `npm run db:generate` compare le schema Drizzle actuel et genere un nouveau fichier SQL dans `migrations/`
- `npm run db:migrate` applique les migrations en attente sur la base cible
- `npm run db:seed` vide les tables gerees par le seed puis reinjecte des donnees de demo
- `npx drizzle-kit studio` ouvre une interface de navigation pour inspecter les tables localement

### Notes utiles

- `db:generate` sert quand **le schema change**
- `db:migrate` sert quand **tu veux synchroniser la base avec les migrations**
- `db:seed` est pratique pour repartir d'un jeu de donnees coherent en local
- Le projet charge `DATABASE_URL` via `dotenv`, donc un fichier `.env` a la racine est suffisant
- `db:local:reset` supprime puis recree completement la base PostgreSQL locale
- `db:local:destroy` supprime le conteneur Podman et son volume persistant

## Modele de donnees

### Saisons et phases

Le championnat par equipes se joue en deux phases par saison (septembre a decembre,
puis janvier a mai). La table `seasons` porte le libelle de la saison (`2025/2026`)
et chaque `division` reference une saison et une phase.

Les identifiants FFTT sont donc uniques **par saison**, jamais globalement :

- `divisions` : unique sur `(fftt_id, season_id, phase)`
- `pools` : unique sur `(fftt_id, division_id)`
- `encounters` : unique sur `(fftt_id, pool_id)`

Une equipe garde en revanche la meme identite d'une saison a l'autre : elle est
identifiee par `(club_id, normalized_name)`, car la FFTT reattribue les
identifiants d'equipe a chaque phase. Le champ `teams.fftt_id` n'est qu'un
attribut informatif rafraichi a chaque synchronisation.

### Parties d'une rencontre

Les parties (simples et doubles) sont stockees dans une seule table
`encounter_matches`. Un double n'est qu'une partie avec un second joueur de
chaque cote, ce qui evite de dupliquer les colonnes de score et permet de
retrouver toutes les parties d'un joueur en une seule requete.

- `number` est la position de la partie sur la feuille de match, et
  `(encounter_id, number)` est unique : une resynchronisation met a jour les
  parties au lieu de les empiler ;
- `winner` vaut `null` quand la partie n'a pas ete jouee, ce qui est la maniere
  dont la FFTT publie un forfait ;
- les identifiants de joueurs sont nullables : un adversaire non licencie sous
  le club declare ne peut pas etre rapproche, la partie est quand meme conservee ;
- `set_details` conserve le detail manche par manche tel que publie.

Les parties, la composition et le classement de poule proviennent de la feuille
de match deja telechargee : aucun appel FFTT supplementaire n'est necessaire.

### Identite d'une rencontre

Une rencontre est identifiee par sa confrontation : `poule + equipe domicile +
equipe exterieur`. Ni la date ni le `renc_id` FFTT n'entrent dans cette cle, car
la date change en cas de report et le `renc_id` n'est publie qu'une fois le match
joue. Un match reporte ou dont le resultat vient d'etre publie est donc mis a
jour, jamais duplique.

## Synchronisation FFTT

```bash
curl -X POST http://localhost:3000/api/fftt/synchronization \
  -H 'content-type: application/json' \
  -d '{"clubNumber": "44123456"}'
```

Corps de requete (tous les champs sont optionnels) :

- `clubNumber` : par defaut la valeur de `FFTT_CLUB_NUMBER`
- `season` : par defaut la saison en cours, au format `2025/2026`
- `phase` : par defaut la phase deduite du libelle de division, sinon de la date
- `verifyAccess` : verifie l'autorisation de l'application aupres de la FFTT

### Variables d'environnement

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL |
| `PORT` | Port d'ecoute de l'API |
| `FFTT_APPILICATION_CODE` | Code application fourni par la FFTT |
| `FFTT_PWD` | Mot de passe de l'application FFTT |
| `FFTT_SERIE` | Serie associee a l'application FFTT |
| `FFTT_CLUB_NUMBER` | Numero du club suivi, utilise par defaut a la synchronisation et pour marquer `isMellinet` |
| `FFTT_MAX_CONCURRENT_REQUESTS` | Requetes FFTT simultanees au maximum (defaut 4) |
| `FFTT_ATTEMPTS` | Nombre de tentatives par requete, la premiere comprise (defaut 3) |

### Mise a jour incrementale

Une synchronisation n'est jamais un import : elle reconcilie l'existant.

- une rencontre programmee qui vient d'etre jouee voit son statut, son score, sa
  date et sa composition actualises sur la meme ligne ;
- la composition d'equipe est remplacee par celle publiee par la FFTT : un joueur
  retire de la feuille de match quitte la composition ;
- les parties et le classement de la poule sont reconcilies de la meme maniere ;
- une equipe qui quitte une poule est detachee de cette poule ;
- les points des joueurs sont rafraichis a chaque passage ;
- si la feuille de match est illisible ou absente, la rencontre est quand meme
  mise a jour et la composition deja enregistree est conservee.

### Robustesse et cout des appels

Le client FFTT retente automatiquement une requete en cas de panne passagere
(timeout, coupure reseau, HTTP 408/429/5xx) avec un delai qui double a chaque
echec. Une reponse 4xx ou une erreur fonctionnelle renvoyee dans le XML ne sont
jamais retentees : elles ne reussiront pas davantage a la tentative suivante.
Chaque tentative recalcule sa signature, car la FFTT refuse un horodatage rejoue.

Le nombre de requetes simultanees est plafonne au niveau du client, et les
feuilles de match d'une poule sont telechargees par lots pendant que les
ecritures restent sequentielles.

Les effectifs des clubs adverses ne sont plus telecharges pour toute la poule :
un effectif n'est charge que lorsqu'une feuille de match en a besoin, et une
seule fois par synchronisation. Concretement, un club adverse que l'on n'a pas
encore rencontre n'est pas telecharge du tout.

### Organisation du code

| Fichier | Role |
| --- | --- |
| `synchronizer.ts` | Point d'entree : saison, club, puis boucle sur les divisions |
| `sync/context.ts` | Etat partage d'une synchronisation (caches, compteurs, resolution des clubs et des licences) |
| `sync/divisions.ts` | Deduction des divisions a partir des liens de resultats des equipes |
| `sync/pools.ts` | Poules, classements, equipes et composition des poules |
| `sync/encounters.ts` | Rapprochement des equipes d'une rencontre puis ecriture |
| `sync/sheet.ts` | Lecture de la feuille de match : composition, positions et parties |
| `sync/repository.ts` | Tous les `INSERT ... ON CONFLICT`, utilisables dans ou hors transaction |
| `shared/retry.ts` | Nouvelle tentative avec delai exponentiel |
| `shared/concurrency.ts` | Limitation du nombre d'operations simultanees |

Les appels HTTP a la FFTT sont toujours effectues **avant** l'ouverture d'une
transaction : aucun verrou PostgreSQL n'est detenu pendant une attente reseau.
Une rencontre et sa composition sont ecrites dans une seule transaction, de sorte
qu'un incident ne laisse jamais un match "joue" sans sa composition.

## Tests

```bash
npm run test:http:db
```

Cette commande prepare la base locale puis lance la suite complete. Les tests
d'integration utilisent une vraie base PostgreSQL : ils tronquent les tables et
reinjectent leurs propres donnees, ils s'executent donc en serie.

Le synchronizer est teste via un faux client FFTT (`src/modules/fftt/testing/`)
pilote par un scenario, ce qui permet de couvrir les cas de report, de
publication de resultat, de changement de saison et de joueurs non apparies sans
appeler l'API FFTT.
