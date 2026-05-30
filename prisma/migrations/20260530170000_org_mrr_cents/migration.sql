-- Mirror exact monthly recurring revenue (cents) per org from Stripe. See docs/OPERATOR_CONSOLE.md §3.2.
ALTER TABLE "Organization" ADD COLUMN "mrrCents" INTEGER;
