-- AlterTable
ALTER TABLE "TravelerProfile" ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushSubscription" JSONB;
