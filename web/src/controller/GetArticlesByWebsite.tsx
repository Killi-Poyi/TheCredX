import prisma from "@/lib/prisma";

// Define the exact structure of the content item you want to return
type ContentItemData = {
    content_id: string;
    website_id: string;
    title: string;
    original_url: string;
    description: string | null;
    category: string | null;
    status: string; // The type of content_status
};


export default async function GetArticlesByWebsite(
    websiteId: string, 
    owner_id: string
): Promise<ContentItemData[]> {
    
    // 1. Security Check: Verify that the user owns the website
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

    // 2. Main Query: Get all content items for the website with only the required fields
    const contentItems = await prisma.content_items.findMany({
        where: {
            website_id: websiteId,
        },
        select: {
            content_id: true,
            website_id: true,
            title: true,
            original_url: true,
            description: true,
            category: true,
            status: true,
        },
    }) as ContentItemData[]; 
    
    // The query returns exactly what you need, so you can return it directly.
    return contentItems;
}