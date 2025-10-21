import prisma from "@/lib/prisma";

/**
 * Creates a new promotion "job" in the database.
 * This function contains all the core business logic for starting a promotion.
 */
// This is a NAMED EXPORT, which allows the API route to import it correctly.

type PromotionData = {
  id: number;
};

export async function createPromotion(
    content_id: string, 
    user_id: string, 
    budget: number,
    title: string
    
) {
  // 1. Perform a security check to ensure the user owns the content item.
  // We also select all the fields needed to create the initial promotion record.
  const contentItem = await prisma.content_items.findFirst({
    where: {
      content_id: content_id,
      websites: {
        owner_id: user_id,
      },
    },
    select: { 
      title: true,
      description: true,
      tags: true,
      category: true,
    }
  });

  // If the content item doesn't exist or isn't owned by the user, throw an error.
  if (!contentItem) {
    throw new Error("Forbidden: You do not have permission to promote this article.");
  }
// 2. Create the new promotion "job" using a raw SQL query.
// This is necessary because of the Unsupported("vector") type in the promotions model.


//(*****************************************************************************************)
const newPromotionJob : PromotionData [] = await prisma.$queryRaw<PromotionData[]>`
    INSERT INTO "public"."promotions" 
      (article_id, budget, title, summary, active)
    VALUES 
      (${content_id}::uuid, 
       ${budget},
       ${title},  
       'Your promotion is being processed. Summary and details will appear soon.', -- <-- Default summary
       ${false}  -- Set active to false, the worker will set it to true
      )
    RETURNING id;
  `;
//(**************************************************************************************************)

  // 3. Return the newly created promotion record.
  // $queryRaw returns an array, so we return the first (and only) result.
  return newPromotionJob[0];
}

