// import { NextRequest, NextResponse } from "next/server";

// This is a minimal API route for debugging purposes.
// It does not connect to the database.
// Its only job is to prove that the file can be built and deployed by Vercel.
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  try {
    // We are not even reading the body, just returning a success message.
    console.log("Debug POST request received.");
    
    return NextResponse.json(
      { message: "API route is working." },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error("This should not happen in the debug route:", error);
    return NextResponse.json(
      { message: "Internal server error in debug route" },
      { status: 500 }
    );
  }
}