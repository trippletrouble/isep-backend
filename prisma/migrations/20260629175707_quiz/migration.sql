-- AlterEnum
ALTER TYPE "MoveOutcome" ADD VALUE 'QUIZ_STARTED';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "pending_quiz_attacker_id" UUID,
ADD COLUMN     "pending_quiz_defender_id" UUID,
ADD COLUMN     "pending_quiz_dice_value" INTEGER,
ADD COLUMN     "pending_quiz_figure_id" INTEGER,
ADD COLUMN     "pending_quiz_from_pos" INTEGER,
ADD COLUMN     "pending_quiz_question_id" TEXT,
ADD COLUMN     "pending_quiz_to_pos" INTEGER;
