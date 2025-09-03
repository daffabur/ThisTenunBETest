/*
  Warnings:

  - You are about to drop the `Outfit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Outfit" DROP CONSTRAINT "Outfit_provinceId_fkey";

-- DropTable
DROP TABLE "public"."Outfit";

-- CreateTable
CREATE TABLE "public"."Tenun" (
    "id" SERIAL NOT NULL,
    "jenisTenun" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provinceId" INTEGER NOT NULL,

    CONSTRAINT "Tenun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tenun_provinceId_idx" ON "public"."Tenun"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_province_jenis" ON "public"."Tenun"("provinceId", "jenisTenun");

-- AddForeignKey
ALTER TABLE "public"."Tenun" ADD CONSTRAINT "Tenun_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
