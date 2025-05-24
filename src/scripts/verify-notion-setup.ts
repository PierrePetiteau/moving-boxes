import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function verifyNotionSetup() {
  // Check if API key is set
  if (!process.env.NOTION_API_KEY) {
    console.error("❌ NOTION_API_KEY is not set in .env.local");
    process.exit(1);
  }

  // Check if parent page ID is set
  if (!process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID) {
    console.error("❌ NEXT_PUBLIC_NOTION_PARENT_PAGE_ID is not set in .env.local");
    process.exit(1);
  }

  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
  });

  try {
    // Verify API key by trying to retrieve the parent page
    await notion.pages.retrieve({
      page_id: process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID,
    });
    console.log("✅ API key is valid");

    // Verify parent page access
    await notion.blocks.children.list({
      block_id: process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID,
    });
    console.log("✅ Parent page is accessible");

    console.log("✅ All checks passed!");
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error:", error.message);
    } else {
      console.error("❌ Unknown error occurred");
    }
    process.exit(1);
  }
}

verifyNotionSetup();
