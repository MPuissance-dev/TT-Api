CREATE TYPE "public"."division_echelon" AS ENUM('national', 'zone', 'regional', 'departmental');
ALTER TABLE "divisions" ADD COLUMN "echelon" "division_echelon";