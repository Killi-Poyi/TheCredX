import prisma  from "@/lib/prisma"; // Using the recommended shared prisma instance
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  // The fix is here: Destructure params with the correct type
  { params }: { params: { websiteid: string } }
) {
  const { websiteid } = params;

  if (!websiteid) {
    return NextResponse.json(
      { message: "Website ID is required" },
      { status: 400 }
    );
  }

  try {
    const articles = await prisma.content_items.findMany({
      take: 10,
      where: { website_id: websiteid },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(articles, { status: 200 });
  
  } catch (error) {
    console.error(`Failed to fetch articles for website ${websiteid}:`, error);
    return NextResponse.json(
      { message: "Something went wrong fetching articles" },
      { status: 500 }
    );
  }
}

