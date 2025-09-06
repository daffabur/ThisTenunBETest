-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female', 'unisex');

-- CreateTable
CREATE TABLE "public"."OutfitInspo" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "credit" TEXT,
    "sourceUrl" TEXT,
    "gender" "public"."Gender",
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutfitInspo_pkey" PRIMARY KEY ("id")
);
