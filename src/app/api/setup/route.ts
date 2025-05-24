import { createDatabase } from "@src/lib/notion";
import { setDatabaseId } from "@src/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      hasApiKey: !!process.env.NOTION_API_KEY,
      hasParentPageId: !!process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID,
    });
  } catch (error) {
    console.error("Error checking setup:", error);
    return NextResponse.json({ error: "Failed to check setup" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.NOTION_API_KEY) {
      console.error("Missing NOTION_API_KEY");
      return NextResponse.json({ error: "NOTION_API_KEY is not set in environment variables" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID) {
      console.error("Missing NEXT_PUBLIC_NOTION_PARENT_PAGE_ID");
      return NextResponse.json(
        { error: "NEXT_PUBLIC_NOTION_PARENT_PAGE_ID is not set in environment variables" },
        { status: 400 }
      );
    }

    // Check if we're setting an existing database ID or creating a new one
    let body;
    try {
      body = await request.json();
    } catch {
      // If there's no body or it's not valid JSON, assume we're creating a new database
      body = {};
    }

    if (body.databaseId) {
      // Setting an existing database ID
      await setDatabaseId(body.databaseId);
      return NextResponse.json({
        success: true,
        message: "Database ID set successfully",
      });
    } else {
      // Creating a new database
      console.log("Creating database...");
      const databaseId = await createDatabase();
      console.log("Database creation response:", { databaseId });

      if (!databaseId) {
        throw new Error("Failed to create database - no ID returned");
      }

      return NextResponse.json({
        success: true,
        databaseId,
        message: "Database created successfully",
      });
    }
  } catch (error) {
    console.error("Failed to create/set database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create/set database",
      },
      { status: 500 }
    );
  }
}
