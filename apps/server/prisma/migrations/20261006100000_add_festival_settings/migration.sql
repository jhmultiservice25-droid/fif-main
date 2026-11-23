-- CreateTable
CREATE TABLE "festival_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL DEFAULT 'FIKIRI Innovation Festival',
    "shortName" TEXT NOT NULL DEFAULT 'FIF 2026',
    "city" TEXT NOT NULL DEFAULT 'Kinshasa',
    "country" TEXT NOT NULL DEFAULT 'RDC',
    "days" JSONB NOT NULL,
    "badgeDeadline" TIMESTAMPTZ(3),
    "applicationsOpenAt" TIMESTAMPTZ(3),
    "applicationsCloseAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_settings_pkey" PRIMARY KEY ("id")
);
