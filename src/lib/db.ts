"use server";

import { notion } from "./notion";

const DATABASE_ID_COMMENT = "MOVING_BOXES_DATABASE_ID:";

export async function getDatabaseId(): Promise<string | null> {
  try {
    const parentPageId = process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID;
    if (!parentPageId) {
      throw new Error("NEXT_PUBLIC_NOTION_PARENT_PAGE_ID is not set");
    }

    // Get all comments on the parent page
    const comments = await notion.comments.list({
      block_id: parentPageId,
    });

    // Look for our special comment
    const databaseComment = comments.results.find((comment) =>
      comment.rich_text[0]?.plain_text.startsWith(DATABASE_ID_COMMENT)
    );

    if (databaseComment) {
      const commentText = databaseComment.rich_text[0]?.plain_text || "";
      return commentText.replace(DATABASE_ID_COMMENT, "").trim();
    }

    return null;
  } catch (error) {
    throw new Error(`Failed to get database ID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function setDatabaseId(databaseId: string): Promise<void> {
  try {
    const parentPageId = process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID;
    if (!parentPageId) {
      throw new Error("NEXT_PUBLIC_NOTION_PARENT_PAGE_ID is not set");
    }

    // Get all existing comments
    const comments = await notion.comments.list({
      block_id: parentPageId,
    });

    // Check if a database ID comment already exists
    const existingComment = comments.results.find((comment) =>
      comment.rich_text[0]?.plain_text.startsWith(DATABASE_ID_COMMENT)
    );

    if (existingComment) {
      return;
    }

    // Create a new comment with the database ID
    await notion.comments.create({
      parent: {
        type: "page_id",
        page_id: parentPageId,
      },
      rich_text: [
        {
          type: "text",
          text: {
            content: `${DATABASE_ID_COMMENT}${databaseId}`,
          },
        },
      ],
    });
  } catch (error) {
    throw new Error(`Failed to set database ID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
