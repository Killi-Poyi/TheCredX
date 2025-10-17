import  prisma from "@/lib/prisma";

// 1. Define a specific type for the data returned by your Prisma query.
// This is the key to solving the 'any' type error.
type ArticleWithPromotions = {
    content_id: string;
    title: string;
    promotions: {
        // 2. Corrected the selected fields to match your actual schema.
        // The 'promotions' table has 'active' (a boolean), not 'status'.
        // There is no 'credits_spent' field.
        active: boolean | null;
        budget: number; // Prisma's Decimal type is mapped to number here
    }[]; // This is an array because it's a one-to-many relation
};

export default async function GetArticlesByWebsite(websiteId: string, owner_id: string) {

    // First, verify that the user owns the website. This is good practice.
    const websiteOwner = await prisma.websites.findFirst({
        where: {
            website_id: websiteId,
            owner_id: owner_id,
        },
        select: {
            website_id: true,
        },
    });

    if (!websiteOwner) {
        throw new Error("Forbidden: You do not own this website.");
    }

    // 3. Corrected the Prisma query itself.
    const articlesFromDb = await prisma.content_items.findMany({
        where: {
            website_id: websiteId,
        },
        select: {
            content_id: true,
            title: true,
            promotions: { // Assuming 'promotions' is a valid relation on content_items
                select: {
                    active: true, // Use 'active' instead of 'status'
                    budget: true,
                    // 'credits_spent' was removed as it's not in your schema
                },
            },
        },
    });

    // 4. Apply the specific type to the 'article' parameter.
    // This tells TypeScript the exact shape of the object, fixing the error.
    const articles = articlesFromDb.map((article: ArticleWithPromotions) => ({
        id: article.content_id,
        title: article.title,
        // The promotions data is now correctly typed and structured
        promotions: article.promotions.map(p => ({
            isActive: p.active ?? false, // Handle null case for active status
            budget: p.budget
        })),
    }));

    return articles;
}
