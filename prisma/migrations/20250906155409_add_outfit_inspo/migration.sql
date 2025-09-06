/*
  Warnings:

  - The values [male,female,unisex] on the enum `Gender` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `OutfitInspo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `OutfitInspo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Gender_new" AS ENUM ('MEN', 'WOMEN', 'UNISEX');
ALTER TABLE "public"."OutfitInspo" ALTER COLUMN "gender" TYPE "public"."Gender_new" USING ("gender"::text::"public"."Gender_new");
ALTER TYPE "public"."Gender" RENAME TO "Gender_old";
ALTER TYPE "public"."Gender_new" RENAME TO "Gender";
DROP TYPE "public"."Gender_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."OutfitInspo" ADD COLUMN     "slug" TEXT NOT NULL,
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "OutfitInspo_slug_key" ON "public"."OutfitInspo"("slug");
