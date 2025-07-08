-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HANDLER', 'MEMBER');

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "starting_point" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "handler_clerk_id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_members" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_clerk_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_messages" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_clerk_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trips_invite_code_key" ON "trips"("invite_code");

-- CreateIndex
CREATE INDEX "trips_handler_clerk_id_idx" ON "trips"("handler_clerk_id");

-- CreateIndex
CREATE INDEX "trips_invite_code_idx" ON "trips"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "trip_members_trip_id_user_clerk_id_key" ON "trip_members"("trip_id", "user_clerk_id");

-- CreateIndex
CREATE INDEX "trip_members_trip_id_idx" ON "trip_members"("trip_id");

-- CreateIndex
CREATE INDEX "trip_members_user_clerk_id_idx" ON "trip_members"("user_clerk_id");

-- CreateIndex
CREATE INDEX "trip_messages_trip_id_idx" ON "trip_messages"("trip_id");

-- CreateIndex
CREATE INDEX "trip_messages_created_at_idx" ON "trip_messages"("created_at");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_handler_clerk_id_fkey" FOREIGN KEY ("handler_clerk_id") REFERENCES "users"("clerk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_clerk_id_fkey" FOREIGN KEY ("user_clerk_id") REFERENCES "users"("clerk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_messages" ADD CONSTRAINT "trip_messages_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_messages" ADD CONSTRAINT "trip_messages_user_clerk_id_fkey" FOREIGN KEY ("user_clerk_id") REFERENCES "users"("clerk_id") ON DELETE RESTRICT ON UPDATE CASCADE;
