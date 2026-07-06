-- Signature-verified Safe ownership records, separate from the self-reported Wallet table.
-- Only written after a wallet signs a challenge proving it controls the private key for the
-- claimed address - see POST /api/team/verify-owner in bot/src/http/routes.ts.
-- CreateTable
CREATE TABLE "VerifiedOwner" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "ethAddress" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedOwner_teamId_slackUserId_key" ON "VerifiedOwner"("teamId", "slackUserId");

-- AddForeignKey
ALTER TABLE "VerifiedOwner" ADD CONSTRAINT "VerifiedOwner_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
