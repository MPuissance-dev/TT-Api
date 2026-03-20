CREATE TYPE "public"."status" AS ENUM('played', 'scheduled', 'reported');
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(15) NOT NULL,
	"numero" varchar(15) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(15) NOT NULL,
	"level" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "double_matchs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"home_player1_id" uuid NOT NULL,
	"home_player2_id" uuid NOT NULL,
	"away_player1_id" uuid NOT NULL,
	"away_player2_id" uuid NOT NULL,
	"winner1_id" uuid NOT NULL,
	"winner2_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"home_team" uuid NOT NULL,
	"away_team" uuid NOT NULL,
	"played_at" timestamp NOT NULL,
	"championship_day_number" integer NOT NULL,
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

CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" varchar(15) NOT NULL,
	"lastName" varchar(15) NOT NULL,
	"points" integer NOT NULL,
	"club_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "pool_team" (
	"pool_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pool_team_pool_id_team_id_pk" PRIMARY KEY("pool_id","team_id")
);

CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_id" uuid NOT NULL,
	"name" varchar(15) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "single_matchs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"home_player_id" uuid NOT NULL,
	"away_player_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE "team_ranking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"rank" integer,
	"points" integer,
	"played" integer,
	"wins" integer,
	"draws" integer,
	"looses" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "team_ranking_pool_id_team_id_unique" UNIQUE("pool_id","team_id")
);

CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_home_player1_id_players_id_fk" FOREIGN KEY ("home_player1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_home_player2_id_players_id_fk" FOREIGN KEY ("home_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_away_player1_id_players_id_fk" FOREIGN KEY ("away_player1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_away_player2_id_players_id_fk" FOREIGN KEY ("away_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_winner1_id_players_id_fk" FOREIGN KEY ("winner1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_winner2_id_players_id_fk" FOREIGN KEY ("winner2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_home_team_teams_id_fk" FOREIGN KEY ("home_team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_away_team_teams_id_fk" FOREIGN KEY ("away_team") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_lineup" ADD CONSTRAINT "encounter_lineup_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "players" ADD CONSTRAINT "players_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pool_team" ADD CONSTRAINT "pool_team_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pool_team" ADD CONSTRAINT "pool_team_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pools" ADD CONSTRAINT "pools_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_home_player_id_players_id_fk" FOREIGN KEY ("home_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_away_player_id_players_id_fk" FOREIGN KEY ("away_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "single_matchs" ADD CONSTRAINT "single_matchs_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_ranking" ADD CONSTRAINT "team_ranking_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_ranking" ADD CONSTRAINT "team_ranking_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;