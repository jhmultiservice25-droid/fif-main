-- CreateTable
CREATE TABLE "showcase_solution" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "sector" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "teamName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT,
    "website" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_presenter" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listedPublicly" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solution_presenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pickerOpen" BOOLEAN NOT NULL DEFAULT true,
    "deadline" TIMESTAMPTZ(3),
    "maxPerInnovator" INTEGER NOT NULL DEFAULT 2,
    "maxPerSolution" INTEGER NOT NULL DEFAULT 3,
    "demoShowSessionIds" TEXT[],
    "reminderSentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showcase_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_message" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderOrganization" TEXT NOT NULL DEFAULT '',
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "showcase_solution_reference_key" ON "showcase_solution"("reference");

-- CreateIndex
CREATE INDEX "showcase_solution_active_name_idx" ON "showcase_solution"("active", "name");

-- CreateIndex
CREATE INDEX "solution_presenter_userId_idx" ON "solution_presenter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "solution_presenter_solutionId_userId_key" ON "solution_presenter"("solutionId", "userId");

-- CreateIndex
CREATE INDEX "contact_message_targetType_targetId_idx" ON "contact_message"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "contact_message_senderEmail_createdAt_idx" ON "contact_message"("senderEmail", "createdAt");

-- AddForeignKey
ALTER TABLE "solution_presenter" ADD CONSTRAINT "solution_presenter_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "showcase_solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_presenter" ADD CONSTRAINT "solution_presenter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
