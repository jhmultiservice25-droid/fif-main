CREATE TABLE "HackademyApplication" (
  "id" TEXT NOT NULL,
  "university" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "teamLeader" TEXT NOT NULL,
  "whatsapp" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "memberNames" TEXT[] NOT NULL,
  "logoPath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HackademyApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HackademyApplication_teamName_idx" ON "HackademyApplication"("teamName");
CREATE INDEX "HackademyApplication_email_idx" ON "HackademyApplication"("email");
CREATE INDEX "HackademyApplication_createdAt_idx" ON "HackademyApplication"("createdAt");
ALTER TABLE "HackademyApplication" ADD CONSTRAINT "HackademyApplication_teamName_email_key" UNIQUE ("teamName", "email");
