-- AlterTable User: TikTok OAuth tokens
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiktokAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiktokRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiktokTokenExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tiktokOpenId" TEXT;

-- AlterTable Post: multi-platform publish fields
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "platforms" JSONB NOT NULL DEFAULT '["x", "tiktok"]';
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "platformResults" JSONB;
