import { CustomerPriceChecker } from "@/components/customer/CustomerPriceChecker";
import { db } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PriceCheckerPage() {
  const allProducts = await db.select().from(products).orderBy(asc(products.name)).limit(2000);
  return <CustomerPriceChecker products={allProducts} />;
}
