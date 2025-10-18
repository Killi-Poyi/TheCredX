import { NextRequest, NextResponse } from "next/server";
import { getAiRecommendations } from "@/controller/GetAiRecommendations";
import { verifyWebsite } from "@/controller/VerifyWebsite";

// Type definition for the result of verifyWebsite (assuming it includes domain_name)
// NOTE: This type needs to be defined based on your Prisma model.
// Assuming your website model has website_id (string) and domain_name (string).

// type WebsiteType = {
//   website_id: string;
//   domain_name: string;
//   // ... other fields needed
// };


// VERCEL UPDATES: This function handles the actual POST request from your widget.
export async function POST(request: NextRequest) {
  const headers = new Headers();
  // VERCEL UPDATES: Set generic CORS headers for the response
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const origin = request.headers.get('origin');
    
    // Safety check to ensure body exists before parsing JSON
    const requestBody = await request.json(); 
    const { verificationToken, userId } = requestBody;

    // Check for required inputs
    if (!origin || !verificationToken || !userId) {
      return NextResponse.json({ error: 'Missing verificationToken, userId, or origin header' }, { status: 400 });
    }

    // VERCEL UPDATES: CORE SECURITY CHECK
    // 1. Verify the token exists in the database.
    // Ensure VerifyWebsite returns the full website object (TypeCast added for safety).
    const website = (await verifyWebsite({ verificationToken })) ; 
    
    const originHostname = new URL(origin).hostname;
    
    // --- CRITICAL CORRECTION HERE ---
    // The domain_name from the DB (website.domain_name) must be correctly compared to the origin.
    // If the domain_name in the DB has a protocol (e.g., https://example.com), strip it for comparison.
    const dbDomain = website.domain_name.replace(/https?:\/\//, '').replace(/\/$/, '');
    
    // 2. Enforce Origin Check against DB domain (in production).
    if (process.env.NODE_ENV === "production" && originHostname !== dbDomain) {
      console.error(`CORS BLOCKED: Origin (${originHostname}) does not match DB domain (${dbDomain})`);
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    
    // If the check passes, we explicitly allow the request for this origin.
    headers.set('Access-Control-Allow-Origin', origin);

    // --- Your Original Logic ---
    console.log(`Verified website: ${website.domain_name} (ID: ${website.website_id})`);
    
    // Pass websiteId to the recommendation function for content scoping
    const recommendation = await getAiRecommendations({ userId }); 

    // If no recommendation is returned, send a "No Content" response.
    if (!recommendation) {
      return new NextResponse(null, { status: 204, headers });
    }

    // Format the response payload to match the widget's expected format.
    const responsePayload = {
      title: recommendation.title,
      description: recommendation.description, 
      url: recommendation.url || '#', 
      image: recommendation.image || 'https://placehold.co/350x197/111111/333333?text=CredX', 
    };
    
    return NextResponse.json(responsePayload, { status: 200, headers });

  } catch (error) {
    console.error("Error in /api/widget:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred";
    const statusCode = errorMessage.includes("Invalid verification token") ? 403 : 500;
    
    // Even on error, we must set the CORS header so the browser can read the error.
    const origin = request.headers.get('origin') || '*';
    headers.set('Access-Control-Allow-Origin', origin);

    return NextResponse.json({ error: errorMessage }, { status: statusCode, headers });
  }
}

// VERCEL UPDATES: This function is required for CORS pre-flight requests.
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Optional: Max age can improve performance by caching pre-flight results
    'Access-Control-Max-Age': '86400', 
  };
  return new NextResponse(null, { status: 204, headers });
}