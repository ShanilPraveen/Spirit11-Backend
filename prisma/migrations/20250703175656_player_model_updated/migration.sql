/*
  Warnings:

  - You are about to drop the `Stat` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ballsFaced` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inningsPlayed` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `oversBowled` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `runs` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `runsConceded` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wickets` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Stat" DROP CONSTRAINT "Stat_playerId_fkey";

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "ballsFaced" INTEGER NOT NULL,
ADD COLUMN     "inningsPlayed" INTEGER NOT NULL,
ADD COLUMN     "oversBowled" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "runs" INTEGER NOT NULL,
ADD COLUMN     "runsConceded" INTEGER NOT NULL,
ADD COLUMN     "wickets" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Stat";
