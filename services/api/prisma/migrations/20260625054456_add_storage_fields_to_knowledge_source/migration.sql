-- AlterTable
ALTER TABLE "KnowledgeSource" ADD COLUMN     "storageBucket" TEXT,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "storageRegion" TEXT;
