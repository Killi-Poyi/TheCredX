import prisma from "@/lib/prisma";

type ArticleWithPromotions = {
    id: string;
    title: string;
    promotions: {
        isActive: boolean;
        budget: number;
    }[];
};

type PromotionData = {
    article_id: string;
    active: boolean | null;
    budget: any; // Decimal type from Prisma
};

type ContentItemData = {
    content_id: string;
    title: string;
};

export default async function GetArticlesByWebsite(
    websiteId: string, 
    owner_id: string
): Promise<ArticleWithPromotions[]> {
    // Verify that the user owns the website
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

    // Get all content items for the website
    const contentItems = await prisma.content_items.findMany({
        where: {
            website_id: websiteId,
        },
        select: {
            content_id: true,
            title: true,
        },
    });

    if (contentItems.length === 0) {
        return [];
    }

    // Get all promotions for these content items
    const contentIds = contentItems.map((item: ContentItemData) => item.content_id);
    
    const promotions = await prisma.promotions.findMany({
        where: {
            article_id: {
                in: contentIds,
            },
        },
        select: {
            article_id: true,
            active: true,
            budget: true,
        },
    });

    // Create a lookup map: article_id -> promotions[]
    const promotionsMap = new Map<string, PromotionData[]>();
    
    promotions.forEach((promo: PromotionData) => {
        const existing = promotionsMap.get(promo.article_id) || [];
        promotionsMap.set(promo.article_id, [...existing, promo]);
    });

    // Combine the data
    const articles: ArticleWithPromotions[] = contentItems.map((item: ContentItemData) => ({
        id: item.content_id,
        title: item.title,
        promotions: (promotionsMap.get(item.content_id) || []).map((p: PromotionData) => ({
            isActive: p.active ?? false,
            budget: parseFloat(p.budget.toString()),
        })),
    }));

    return articles;
}