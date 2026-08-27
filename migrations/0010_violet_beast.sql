CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(9) NOT NULL,
	"start_year" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);

ALTER TABLE "divisions" DROP CONSTRAINT "divisions_fftt_id_unique";
ALTER TABLE "encounters" DROP CONSTRAINT "encounters_fftt_id_unique";
ALTER TABLE "pools" DROP CONSTRAINT "pools_fftt_id_unique";
ALTER TABLE "teams" DROP CONSTRAINT "teams_fftt_id_unique";
ALTER TABLE "encounters" ALTER COLUMN "status" SET DEFAULT 'scheduled';

ALTER TABLE "divisions" ADD COLUMN "season_id" uuid;
ALTER TABLE "divisions" ADD COLUMN "phase" integer DEFAULT 1 NOT NULL;
ALTER TABLE "teams" ADD COLUMN "name" varchar(100);
ALTER TABLE "teams" ADD COLUMN "normalized_name" varchar(100);
ALTER TABLE "teams" ADD COLUMN "number" integer;

-- Existing rows predate the season model: attach them to a single backfill season and give
-- every team a placeholder name so the NOT NULL constraints can be enforced.
INSERT INTO "seasons" ("name", "start_year")
SELECT '2025/2026', 2025
WHERE EXISTS (SELECT 1 FROM "divisions")
ON CONFLICT ("name") DO NOTHING;

UPDATE "divisions"
SET "season_id" = (SELECT "id" FROM "seasons" WHERE "name" = '2025/2026')
WHERE "season_id" IS NULL;

UPDATE "teams"
SET "name" = COALESCE("name", 'Equipe ' || substring("id"::text FROM 1 FOR 8)),
    "normalized_name" = COALESCE("normalized_name", 'equipe ' || substring("id"::text FROM 1 FOR 8))
WHERE "name" IS NULL OR "normalized_name" IS NULL;

ALTER TABLE "divisions" ALTER COLUMN "season_id" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "normalized_name" SET NOT NULL;

ALTER TABLE "divisions" ADD CONSTRAINT "divisions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_fftt_id_unique" UNIQUE("fftt_id","season_id","phase");
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_fftt_id_unique" UNIQUE("fftt_id","pool_id");
ALTER TABLE "pools" ADD CONSTRAINT "pools_fftt_id_unique" UNIQUE("fftt_id","division_id");
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_normalized_name_unique" UNIQUE("club_id","normalized_name");
