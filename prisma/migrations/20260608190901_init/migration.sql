-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "PlayerColor" AS ENUM ('RED', 'BLUE', 'GREEN', 'YELLOW');

-- CreateEnum
CREATE TYPE "PieceStatus" AS ENUM ('HOME', 'ACTIVE', 'GOAL');

-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('HUMAN');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('CLASSIC');

-- CreateEnum
CREATE TYPE "BoardTheme" AS ENUM ('CLASSIC');

-- CreateEnum
CREATE TYPE "AdditionalRule" AS ENUM ('THROW_AGAIN_ON_6', 'THREE_SIXES_LOSE_TURN');

-- CreateEnum
CREATE TYPE "MoveOutcome" AS ENUM ('MOVED', 'CAPTURED', 'GOAL', 'GAME_WON');

-- CreateEnum
CREATE TYPE "GameHistoryActionType" AS ENUM ('ROLL', 'MOVE', 'CAPTURE', 'GOAL', 'GAME_START', 'GAME_END');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "keycloak_sub" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "theme_preference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "games_lost" INTEGER NOT NULL DEFAULT 0,
    "total_figures_captured" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "mode" "GameMode" NOT NULL DEFAULT 'CLASSIC',
    "board_theme" "BoardTheme" NOT NULL DEFAULT 'CLASSIC',
    "number_of_players" INTEGER NOT NULL DEFAULT 4,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "invite_token" TEXT,
    "turn_time_limit_seconds" INTEGER,
    "additional_rules" "AdditionalRule"[],
    "host_id" UUID NOT NULL,
    "current_player_id" UUID,
    "turn_number" INTEGER NOT NULL DEFAULT 0,
    "last_dice_value" INTEGER,
    "dice_rolled_this_turn" BOOLEAN NOT NULL DEFAULT false,
    "consecutive_sixes" INTEGER NOT NULL DEFAULT 0,
    "winner_id" UUID,
    "replay_log_ref" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "color" "PlayerColor" NOT NULL,
    "type" "PlayerType" NOT NULL DEFAULT 'HUMAN',
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "is_current_turn" BOOLEAN NOT NULL DEFAULT false,
    "has_finished" BOOLEAN NOT NULL DEFAULT false,
    "figures_in_goal" INTEGER NOT NULL DEFAULT 0,
    "placement" INTEGER,
    "figures_captured" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "figures" (
    "id" SERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT -1,
    "status" "PieceStatus" NOT NULL DEFAULT 'HOME',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "figures_pkey" PRIMARY KEY ("session_id","id")
);

-- CreateTable
CREATE TABLE "game_history_events" (
    "id" SERIAL NOT NULL,
    "sequence_nr" INTEGER NOT NULL,
    "session_id" UUID NOT NULL,
    "participant_id" UUID NOT NULL,
    "action_type" "GameHistoryActionType" NOT NULL,
    "dice_value" INTEGER,
    "figure_id" INTEGER,
    "from_position" INTEGER,
    "to_position" INTEGER,
    "outcome" "MoveOutcome",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_sub_key" ON "users"("keycloak_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_invite_token_key" ON "sessions"("invite_token");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_host_id_idx" ON "sessions"("host_id");

-- CreateIndex
CREATE INDEX "sessions_status_is_private_idx" ON "sessions"("status", "is_private");

-- CreateIndex
CREATE INDEX "game_participants_session_id_idx" ON "game_participants"("session_id");

-- CreateIndex
CREATE INDEX "game_participants_user_id_idx" ON "game_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_session_id_user_id_key" ON "game_participants"("session_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_session_id_color_key" ON "game_participants"("session_id", "color");

-- CreateIndex
CREATE INDEX "figures_participant_id_idx" ON "figures"("participant_id");

-- CreateIndex
CREATE INDEX "game_history_events_session_id_created_at_idx" ON "game_history_events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "game_history_events_participant_id_idx" ON "game_history_events"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_history_events_session_id_sequence_nr_key" ON "game_history_events"("session_id", "sequence_nr");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "figures" ADD CONSTRAINT "figures_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "figures" ADD CONSTRAINT "figures_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_history_events" ADD CONSTRAINT "game_history_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_history_events" ADD CONSTRAINT "game_history_events_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
