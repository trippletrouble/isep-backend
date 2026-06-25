-- CreateEnum
CREATE TYPE "QuizDuelStatus" AS ENUM ('PENDING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "QuizDuelOutcome" AS ENUM ('ATTACKER_WIN', 'DEFENDER_WIN', 'DRAW');

-- AlterEnum
ALTER TYPE "GameStatus" ADD VALUE 'QUIZ_PENDING';

-- CreateTable
CREATE TABLE "quiz_duels" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "attacker_id" UUID NOT NULL,
    "defender_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "status" "QuizDuelStatus" NOT NULL DEFAULT 'PENDING',
    "outcome" "QuizDuelOutcome",
    "attacker_answer" TEXT,
    "defender_answer" TEXT,
    "attacker_correct" BOOLEAN,
    "defender_correct" BOOLEAN,
    "time_limit_seconds" INTEGER NOT NULL DEFAULT 30,
    "pending_figure_id" INTEGER NOT NULL,
    "pending_from_pos" INTEGER NOT NULL,
    "pending_to_pos" INTEGER NOT NULL,
    "dice_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "quiz_duels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quiz_duels_session_id_idx" ON "quiz_duels"("session_id");

-- CreateIndex
CREATE INDEX "quiz_duels_session_id_status_idx" ON "quiz_duels"("session_id", "status");

-- AddForeignKey
ALTER TABLE "quiz_duels" ADD CONSTRAINT "quiz_duels_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_duels" ADD CONSTRAINT "quiz_duels_attacker_id_fkey" FOREIGN KEY ("attacker_id") REFERENCES "game_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_duels" ADD CONSTRAINT "quiz_duels_defender_id_fkey" FOREIGN KEY ("defender_id") REFERENCES "game_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
