-- CreateTable
CREATE TABLE "public"."Province" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Outfit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provinceId" INTEGER NOT NULL,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_name_key" ON "public"."Province"("name");

-- CreateIndex
CREATE INDEX "Outfit_provinceId_idx" ON "public"."Outfit"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_outfit_per_province" ON "public"."Outfit"("name", "provinceId");

-- AddForeignKey
ALTER TABLE "public"."Outfit" ADD CONSTRAINT "Outfit_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
