import { NextRequest, NextResponse } from "next/server";
import { getAiRecommendations } from "@/controller/GetAiRecommendations";
import { verifyWebsite } from "@/controller/VerifyWebsite";

// VERCEL UPDATES: This function handles the actual POST request from your widget.
export async function POST(request: NextRequest) {
  const headers = new Headers();
  // VERCEL UPDATES: These headers are part of the CORS specification and are
  // essential for allowing your widget to make requests from other domains.
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const origin = request.headers.get('origin');
    const { verificationToken, userId } = await request.json();

    if (!origin || !verificationToken || !userId) {
      return NextResponse.json({ error: 'Missing verificationToken, userId, or origin header' }, { status: 400 });
    }

    // VERCEL UPDATES: This is your core security check. We verify the website token
    // AND ensure the request is actually coming from that website's domain.
    const website = await verifyWebsite({ verificationToken });
    const originHostname = new URL(origin).hostname;
    
    // In production, we strictly enforce that the request origin must match the domain.    
    if (process.env.NODE_ENV === "production" && originHostname !== website.domain_name) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    
    // If the check passes, we explicitly allow the request from this origin.
    headers.set('Access-Control-Allow-Origin', origin);

    // --- Your Original Logic ---
    console.log(`Verified website: ${website.domain_name} (ID: ${website.website_id})`);
    const recommendation = await getAiRecommendations({ userId });

    // If no recommendation is returned, send a "No Content" response.
    if (!recommendation) {
      return new NextResponse(null, { status: 204, headers });
    }

    // VERCEL UPDATES: We must format the response payload to match the new return type
    // from getAiRecommendations and what the widget's `renderWidget` function is expecting.
    const responsePayload = {
      title: recommendation.title,
      description: recommendation.description, // Use 'description' from the new function
      url: recommendation.url || '#',           // Use 'url' from the new function
      image: recommendation.image || 'https://placehold.co/350x197/111111/333333?text=CredX', // Use 'image' from the new function
    };
    
    return NextResponse.json(responsePayload, { status: 200, headers });

  } catch (error) {
    console.error("Error in /api/widget:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred";
    const statusCode = errorMessage.includes("Invalid verification token") ? 403 : 500;
    
    // VERCEL UPDATES: Even on error, we must send the CORS header so the browser
    // can read the error message from the response.
    const origin = request.headers.get('origin') || '*';
    headers.set('Access-Control-Allow-Origin', origin);

    return NextResponse.json({ error: errorMessage }, { status: statusCode, headers });
  }
}

// VERCEL UPDATES: This entire function is new and required for CORS.
// It handles the "pre-flight" OPTIONS request that browsers send before a POST request
// to check if the server will allow the connection.
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new NextResponse(null, { status: 204, headers });
}

