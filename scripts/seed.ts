// Seeds the plans table with the two plans defined in lib/payments/plans.ts.
// Run with: npm run db:seed
import { db } from "../lib/db";
import { plans } from "../lib/db/schema";
import { PLANS } from "../lib/payments/plans";

async function main() {
  for (const plan of Object.values(PLANS)) {
    await db
      .insert(plans)
      .values({
        id: plan.id,
        name: plan.name,
        priceIdr: plan.priceIdr,
        durationDays: plan.durationDays,
        features: plan.features,
      })
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          name: plan.name,
          priceIdr: plan.priceIdr,
          durationDays: plan.durationDays,
          features: plan.features,
        },
      });
    console.log(`plan '${plan.id}' upserted`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
