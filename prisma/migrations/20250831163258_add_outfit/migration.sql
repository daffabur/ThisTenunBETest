/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Province` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Outfit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provinceId" INTEGER NOT NULL,
    CONSTRAINT "Outfit_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Outfit_provinceId_idx" ON "Outfit"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_outfit_per_province" ON "Outfit"("name", "provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");
