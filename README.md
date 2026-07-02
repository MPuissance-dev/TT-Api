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
