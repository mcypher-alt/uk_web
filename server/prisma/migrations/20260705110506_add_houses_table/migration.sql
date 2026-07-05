-- CreateTable
CREATE TABLE "houses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "houses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "houses_address_companyId_key" ON "houses"("address", "companyId");
