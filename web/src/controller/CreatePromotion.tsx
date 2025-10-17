import prisma from "@/lib/prisma";

//  data needed to create a promotion
type PromotionData = {
  content_id: string;
  budget: number;
  status: string;
  owner_id: string;
};


export async function createPromotion({
  content_id,
  budget,
  status,
  owner_id,
}: PromotionData) {
  // Security Check
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

  //  Insert the new record into the 'promotions' table
  const newPromotion = null;

  return newPromotion;
}