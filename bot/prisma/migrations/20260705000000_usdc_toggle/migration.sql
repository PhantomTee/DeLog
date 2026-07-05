-- Replace the per-team custom ConfidentialPayoutToken with real Sepolia USDC + one globally
-- shared ConfidentialUSDCWrapper (WRAPPER_ADDRESS env var, not a per-team column).
-- AlterTable
ALTER TABLE "Team" DROP COLUMN "tokenAddress";

-- Track which path (confidential wrapper vs plain USDC transfer) a payout took.
-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT true;
