import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: { params: { websiteid: string } }
) {
  const { websiteid } = await context.params;

  //   get website's articles from supabase
  const articles = await prisma.content_items.findMany({
    take: 10,
    where: { website_id: websiteid },
  });

  return NextResponse.json({
    message: articles,
    status: 200,
  });
}
