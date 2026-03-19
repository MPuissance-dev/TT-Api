CREATE TYPE "public"."status" AS ENUM('played', 'scheduled', 'reported');
CREATE TABLE "single_matchs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"home_player_id" uuid NOT NULL,
	"away_player_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"home_team" uuid NOT NULL,
	"away_team" uuid NOT NULL,
	"played_at" timestamp NOT NULL,
	"home_score" integer DEFAULT 0,
	"away_score" integer DEFAULT 0,
	"status" "status" DEFAULT 'played',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "encounter_lineup" (
	"encounter_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "encounter_lineup_encounter_id_player_id_pk" PRIMARY KEY("encounter_id","player_id")
);

ALTER TABLE "players" ALTER COLUMN "club_id" SET NOT NULL;
ALTER TABLE "pool_team" ALTER COLUMN "pool_id" SET NOT NULL;
ALTER TABLE "pool_team" ALTER COLUMN "team_id" SET NOT NULL;
ALTER TABLE "pools" ALTER COLUMN "division_id" SET NOT NULL;
ALTER TABLE "team_ranking" ALTER COLUMN "pool_id" SET NOT NULL;
ALTER TABLE "team_ranking" ALTER COLUMN "team_id" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "club_id" SET NOT NULL;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_home_player_id_players_id_fk" FOREIGN KEY ("home_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_away_player_id_players_id_fk" FOREIGN KEY ("away_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_home_team_teams_id_fk" FOREIGN KEY ("home_team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_away_team_teams_id_fk" FOREIGN KEY ("away_team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;