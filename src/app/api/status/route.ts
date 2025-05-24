import { getDatabaseId } from "@src/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Checking database status...");
    const databaseId = await getDatabaseId();
    console.log("Database ID from comments:", databaseId);

    if (!databaseId) {
      console.log("No database ID found in comments");
      return NextResponse.json({
        hasDatabase: false,
      });
    }

    // Verify the database exists in Notion
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
        },
      });

      if (!response.ok) {
        console.log("Database not found in Notion:", response.status);
        return NextResponse.json({
          hasDatabase: false,
          error: "Database not found in Notion",
        });
      }

      console.log("Database found in Notion");
      return NextResponse.json({
        hasDatabase: true,
        databaseId,
      });
    } catch (error) {
      console.error("Error verifying database in Notion:", error);
      return NextResponse.json({
        hasDatabase: false,
        error: "Failed to verify database in Notion",
      });
    }
  } catch (error) {
    console.error("Error checking database status:", error);
    return NextResponse.json(
      {
        hasDatabase: false,
        error: error instanceof Error ? error.message : "Failed to check database status",
      },
      { status: 500 }
    );
  }
}
