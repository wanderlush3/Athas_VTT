-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "mapImageUrl" TEXT,
    "fogMask" TEXT DEFAULT '',
    "defileZones" TEXT DEFAULT '[]',
    "tokenState" TEXT DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "sessionToken" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "classLevel" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "alignment" TEXT NOT NULL DEFAULT 'N',
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "constitution" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "wisdom" INTEGER NOT NULL DEFAULT 10,
    "charisma" INTEGER NOT NULL DEFAULT 10,
    "hitPointsMax" INTEGER NOT NULL DEFAULT 1,
    "hitPointsCurrent" INTEGER NOT NULL DEFAULT 1,
    "armorClass" INTEGER NOT NULL DEFAULT 10,
    "baseAttackBonus" INTEGER NOT NULL DEFAULT 0,
    "initiative" INTEGER NOT NULL DEFAULT 0,
    "speed" INTEGER NOT NULL DEFAULT 30,
    "saveFort" INTEGER NOT NULL DEFAULT 0,
    "saveRef" INTEGER NOT NULL DEFAULT 0,
    "saveWill" INTEGER NOT NULL DEFAULT 0,
    "pspMax" INTEGER NOT NULL DEFAULT 0,
    "pspCurrent" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "feats" TEXT NOT NULL DEFAULT '[]',
    "powers" TEXT NOT NULL DEFAULT '[]',
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Character_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'CHAT',
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rollData" TEXT,
    "campaignId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionToken_key" ON "User"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_campaignId_key" ON "User"("username", "campaignId");
