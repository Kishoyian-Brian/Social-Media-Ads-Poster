-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_userId_fkey";

-- AlterTable Post
ALTER TABLE "Post" ADD COLUMN "failReason" TEXT;
ALTER TABLE "Post" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Post" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "xRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "xTokenExpires" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
