-- AlterTable
ALTER TABLE "CommitteeApplication" DROP COLUMN "availability",
DROP COLUMN "cvPath",
DROP COLUMN "educationLevel",
DROP COLUMN "experience",
DROP COLUMN "fieldOfStudy",
DROP COLUMN "linkedin",
DROP COLUMN "professionalSituation",
DROP COLUMN "yearsOfExperience";

-- AlterTable
ALTER TABLE "VolunteerApplication" DROP COLUMN "availability",
DROP COLUMN "educationLevel",
DROP COLUMN "eventExperience",
DROP COLUMN "fieldOfStudy",
DROP COLUMN "languages",
DROP COLUMN "organization",
DROP COLUMN "skills";
