DROP TABLE "double_matchs" CASCADE;
DROP TABLE "single_matchs" CASCADE;
ALTER TABLE "encounter_lineup" ADD COLUMN "position" varchar(2);
ALTER TABLE "team_ranking" DROP COLUMN "looses";