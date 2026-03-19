CREATE TABLE "double_matchs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"home_player1_id" uuid NOT NULL,
	"home_player2_id" uuid NOT NULL,
	"away_player1_id" uuid NOT NULL,
	"away_player2_id" uuid NOT NULL,
	"winner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_home_player1_id_players_id_fk" FOREIGN KEY ("home_player1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_home_player2_id_players_id_fk" FOREIGN KEY ("home_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_away_player1_id_players_id_fk" FOREIGN KEY ("away_player1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_away_player2_id_players_id_fk" FOREIGN KEY ("away_player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_winner_id_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;