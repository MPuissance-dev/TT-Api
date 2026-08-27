CREATE TYPE "public"."encounter_match_type" AS ENUM('single', 'double');
CREATE TYPE "public"."encounter_match_winner" AS ENUM('home', 'away');
CREATE TABLE "encounter_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"type" "encounter_match_type" NOT NULL,
	"home_player_id" uuid,
	"home_player2_id" uuid,
	"away_player_id" uuid,
	"away_player2_id" uuid,
	"home_score" integer,
	"away_score" integer,
	"winner" "encounter_match_winner",
	"set_details" varchar(120),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "encounter_matches_number_unique" UNIQUE("encounter_id","number")
);

ALTER TABLE "team_ranking" ADD COLUMN "losses" integer;
ALTER TABLE "team_ranking" ADD COLUMN "penalties" integer;
ALTER TABLE "team_ranking" ADD COLUMN "games_won" integer;
ALTER TABLE "team_ranking" ADD COLUMN "games_lost" integer;
ALTER TABLE "encounter_matches" ADD CONSTRAINT "encounter_matches_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_matches" ADD CONSTRAINT "encounter_matches_home_player_id_players_id_fk" FOREIGN KEY ("home_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_matches" ADD CONSTRAINT "encounter_matches_home_player2_id_players_id_fk" FOREIGN KEY ("home_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_matches" ADD CONSTRAINT "encounter_matches_away_player_id_players_id_fk" FOREIGN KEY ("away_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "encounter_matches" ADD CONSTRAINT "encounter_matches_away_player2_id_players_id_fk" FOREIGN KEY ("away_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;