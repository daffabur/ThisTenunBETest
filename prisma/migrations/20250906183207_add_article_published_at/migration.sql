/*
  Warnings:

  - You are about to drop the column `author` on the `Article` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Article` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Article" DROP COLUMN "author",
DROP COLUMN "url";
