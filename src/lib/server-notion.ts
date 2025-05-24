import { Client } from "@notionhq/client";
import { Box } from "./notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { getDatabaseId } from "./db";

interface NotionProperties {
  Nom?: {
    type: "title";
    title: Array<{ plain_text: string }>;
  };
  Description?: {
    type: "rich_text";
    rich_text: Array<{ plain_text: string }>;
  };
  Photos?: {
    type: "files";
    files: Array<{
      type: string;
      file?: { url: string };
      external?: { url: string };
    }>;
  };
  Statut?: {
    type: "select";
    select?: { name: string };
  };
  QR_ID?: {
    type: "rich_text";
    rich_text: Array<{ plain_text: string }>;
  };
  Location?: {
    type: "select";
    select?: { name: string };
  };
}

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function getBoxByQRId(qrId: string): Promise<Box | null> {
  try {
    const databaseId = await getDatabaseId();
    if (!databaseId) {
      throw new Error("Database ID not found");
    }

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "QR_ID",
        rich_text: {
          equals: qrId,
        },
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0] as PageObjectResponse;
    const properties = page.properties as NotionProperties;

    return {
      id: page.id,
      name: properties.Nom?.title[0]?.plain_text || "",
      description: properties.Description?.rich_text[0]?.plain_text || "",
      photos: properties.Photos?.files
        ? properties.Photos.files
            .map((file) => ("file" in file ? file.file?.url : file.external?.url))
            .filter((url): url is string => url !== undefined)
        : [],
      status: properties.Statut?.select?.name || "",
      qrId: properties.QR_ID?.rich_text[0]?.plain_text || "",
      location: properties.Location?.select?.name || "",
    };
  } catch (error) {
    console.error("Error fetching box by QR ID:", error);
    throw error;
  }
}
