-- AlterTable
ALTER TABLE "figures" ADD COLUMN     "fly_debuff_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "has_plague_fly" BOOLEAN NOT NULL DEFAULT false;
