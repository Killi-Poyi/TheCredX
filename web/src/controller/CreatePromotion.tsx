import prisma from "@/lib/prisma"; // Corrected: Use default import for prisma
import { Prisma } from '@prisma/client'; // Keep this for Prisma helper types

// Define a custom type that matches the structure of the 'promotions' table.
// This avoids the import issue for the 'promotions' type and provides strong type safety.
type Promotion = {
  id: number;
  article_id: string;
  title: string;
  summary: string;
  tags: string[];
  categories: string;
  promoter_id: string;
  budget: string;
  remaining_impressions: number | null;
  boost: string | null;
  embedding: null; // This field is unsupported, so we use 'any'.
  active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
};

// Define the shape of the data needed to create a promotion.
type PromotionData = {
  content_id: string;
  budget: number;
  status: 'active' | 'inactive';
  owner_id: string;
};

/**
 * Creates a new promotion using a raw SQL query to handle the 'vector' type.
 * @param {PromotionData} data - The necessary data to create the promotion.
 * @returns {Promise<Promotion>} The newly created promotion record.
 * @throws {Error} If the user does not own the content item.
 */
export async function createPromotion({
  content_id,
  budget,
  status,
  owner_id,
}: PromotionData): Promise<Promotion> {
  // --- Security Check ---
  const contentItem = await prisma.content_items.findFirst({
    where: {
      content_id: content_id,
      websites: {
        owner_id: owner_id,
      },
    },
  });

  if (!contentItem) {
    throw new Error("Forbidden: You do not own this content or it does not exist.");
  }

  // --- Create Promotion with Raw SQL Query ---
  // The result of the raw query is now correctly typed with our custom 'Promotion' type.
  const newPromotions: Promotion[] = await prisma.$queryRaw<Promotion[]>`
    INSERT INTO "public"."promotions" (
      "article_id", "title", "summary", "tags", "categories", 
      "promoter_id", "budget", "active", "embedding"
    ) VALUES (
      ${content_id}::uuid, ${contentItem.title}, ${contentItem.description || "No summary available."}, 
      ${contentItem.tags}, ${contentItem.category || "uncategorized"}, ${owner_id}::uuid, 
      ${budget}, ${status === 'active'}, NULL
    )
    RETURNING *;
  `;
  ;

  if (newPromotions.length === 0) {
    throw new Error("Failed to create promotion.");
  }

  return newPromotions[0];
}

