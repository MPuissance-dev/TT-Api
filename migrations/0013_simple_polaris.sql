CREATE TYPE "public"."division_category" AS ENUM('senior', 'youth', 'veteran');
ALTER TABLE "divisions" ADD COLUMN "category" "division_category" DEFAULT 'senior' NOT NULL;