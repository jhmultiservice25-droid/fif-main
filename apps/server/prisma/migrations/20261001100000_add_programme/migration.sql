-- AlterTable
ALTER TABLE "ParticipantRegistration" ADD COLUMN     "source" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "color" TEXT NOT NULL DEFAULT '#006da4',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_session" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'TALK',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "roomId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "admission" TEXT NOT NULL DEFAULT 'OPEN',
    "capacity" INTEGER,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "cancelReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_session_speaker" (
    "sessionId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,

    CONSTRAINT "program_session_speaker_pkey" PRIMARY KEY ("sessionId","speakerId")
);

-- CreateTable
CREATE TABLE "session_registration" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_change" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_interest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessionIds" TEXT[],
    "identity" JSONB,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_session_code_key" ON "program_session"("code");

-- CreateIndex
CREATE INDEX "program_session_startsAt_idx" ON "program_session"("startsAt");

-- CreateIndex
CREATE INDEX "session_registration_userId_idx" ON "session_registration"("userId");

-- CreateIndex
CREATE INDEX "session_registration_sessionId_status_idx" ON "session_registration"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "session_registration_sessionId_userId_key" ON "session_registration"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "session_change_sessionId_createdAt_idx" ON "session_change"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "session_change_notifiedAt_idx" ON "session_change"("notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pending_interest_email_key" ON "pending_interest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantRegistration_userId_key" ON "ParticipantRegistration"("userId");

-- AddForeignKey
ALTER TABLE "ParticipantRegistration" ADD CONSTRAINT "ParticipantRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_session" ADD CONSTRAINT "program_session_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_session_speaker" ADD CONSTRAINT "program_session_speaker_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_session_speaker" ADD CONSTRAINT "program_session_speaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registration" ADD CONSTRAINT "session_registration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_registration" ADD CONSTRAINT "session_registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_change" ADD CONSTRAINT "session_change_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
