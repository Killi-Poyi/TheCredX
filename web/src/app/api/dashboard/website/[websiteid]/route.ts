
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
// NOTE: `Request` is a globally available type and doesn't need to be imported.

// Define the type for the second argument explicitly for clarity.

export async function GET(
  _request: Request,
  { params }: { params: { websiteid: string } } // Corrected line
) {
  const { websiteid } = params; // Now you have websiteid directly

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

