ALTER TABLE "double_matchs" RENAME COLUMN "winner_id" TO "winner1_id";
ALTER TABLE "double_matchs" DROP CONSTRAINT "double_matchs_winner_id_players_id_fk";

ALTER TABLE "double_matchs" ADD COLUMN "winner2_id" uuid NOT NULL;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_winner1_id_players_id_fk" FOREIGN KEY ("winner1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "double_matchs" ADD CONSTRAINT "double_matchs_winner2_id_players_id_fk" FOREIGN KEY ("winner2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;