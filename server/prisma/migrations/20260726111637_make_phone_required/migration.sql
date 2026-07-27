/*
  Warnings:

  - Made the column `phone` on table `valid_tokens` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_valid_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);
INSERT INTO "new_valid_tokens" ("companyId", "createdAt", "expiresAt", "id", "isUsed", "phone", "role", "token") SELECT "companyId", "createdAt", "expiresAt", "id", "isUsed", "phone", "role", "token" FROM "valid_tokens";
DROP TABLE "valid_tokens";
ALTER TABLE "new_valid_tokens" RENAME TO "valid_tokens";
CREATE UNIQUE INDEX "valid_tokens_token_key" ON "valid_tokens"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
