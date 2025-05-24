import { Client } from "@notionhq/client";
import {
  PageObjectResponse,
  DatabaseObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
  RichTextItemResponse,
  SelectPropertyResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { getDatabaseId } from "./db";
import { randomUUID } from "crypto";

// Cache configuration
const CACHE_TTL = 60 * 1000; // 1 minute
const cache = new Map<string, { data: any; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export interface Box {
  id: string;
  name: string;
  description: string;
  photos: string[];
  status: string;
  qrId: string;
}

export async function createDatabase(): Promise<string> {
  try {
    const response = await notion.databases.create({
      parent: {
        type: "page_id",
        page_id: process.env.NEXT_PUBLIC_NOTION_PARENT_PAGE_ID!,
      },
      title: [
        {
          type: "text",
          text: {
            content: "Boxes",
          },
        },
      ],
      properties: {
        Nom: {
          title: {},
        },
        Description: {
          rich_text: {},
        },
        Photos: {
          files: {},
        },
        Statut: {
          select: {
            options: [
              {
                name: "En préparation",
                color: "yellow",
              },
              {
                name: "Scellé",
                color: "green",
              },
              {
                name: "Ouvert",
                color: "red",
              },
            ],
          },
        },
        QR_ID: {
          rich_text: {},
        },
      },
    });

    return response.id;
  } catch (error) {
    console.error("Error creating Notion database:", error);
    throw error;
  }
}

export async function getBoxById(id: string): Promise<Box | null> {
  const cacheKey = `box:${id}`;
  const cached = getCached<Box>(cacheKey);
  if (cached) return cached;

  try {
    const response = (await notion.pages.retrieve({ page_id: id })) as PageObjectResponse;
    const properties = response.properties;

    const box = {
      id: response.id,
      name: properties.Nom?.type === "title" ? properties.Nom.title[0]?.plain_text || "" : "",
      description:
        properties.Description?.type === "rich_text" ? properties.Description.rich_text[0]?.plain_text || "" : "",
      photos:
        properties.Photos?.type === "files"
          ? properties.Photos.files.map((file) => ("file" in file ? file.file.url : file.external.url))
          : [],
      status: properties.Statut?.type === "select" ? properties.Statut.select?.name || "" : "",
      qrId: properties.QR_ID?.type === "rich_text" ? properties.QR_ID.rich_text[0]?.plain_text || "" : "",
    };

    setCached(cacheKey, box);
    return box;
  } catch (error) {
    console.error("Error fetching box from Notion:", error);
    return null;
  }
}

function generateQRId(): string {
  // Generate a shorter ID (8 characters) for easier QR codes
  return randomUUID().slice(0, 8);
}

export async function createBox(name: string, description: string): Promise<Box | null> {
  try {
    const databaseId = await getDatabaseId();
    if (!databaseId) {
      throw new Error("Database ID not found");
    }

    const qrId = generateQRId();

    // Create the page with all properties including QR_ID and empty label
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        Nom: {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        Description: {
          rich_text: [
            {
              text: {
                content: description,
              },
            },
          ],
        },
        Statut: {
          select: {
            name: "En préparation",
          },
        },
        QR_ID: {
          rich_text: [
            {
              text: {
                content: qrId,
              },
            },
          ],
        },
      },
    });

    return getBoxById(response.id);
  } catch (error) {
    console.error("Error creating box in Notion:", error);
    return null;
  }
}

export async function getBoxes(databaseId: string): Promise<Box[]> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: "Name",
          direction: "ascending",
        },
      ],
    });

    return response.results.map((page) => {
      const name = page.properties.Name.title[0]?.plain_text || "Untitled";
      const status = page.properties.Status.select?.name || "Unknown";
      const location = page.properties.Location.rich_text[0]?.plain_text || "Unknown";
      const description = page.properties.Description.rich_text[0]?.plain_text || "";

      return {
        id: page.id,
        name,
        status,
        location,
        description,
      };
    });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw error;
  }
}

// Add a new function to find a box by QR ID
export async function getBoxByQRId(qrId: string): Promise<Box | null> {
  const cacheKey = `box:qr:${qrId}`;
  const cached = getCached<Box>(cacheKey);
  if (cached) return cached;

  try {
    const databaseId = await getDatabaseId();
    if (!databaseId) return null;

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "QR_ID",
        rich_text: {
          equals: qrId,
        },
      },
    });

    if (response.results.length === 0) return null;

    const page = response.results[0] as PageObjectResponse;
    const properties = page.properties;

    const box = {
      id: page.id,
      name: properties.Nom?.type === "title" ? properties.Nom.title[0]?.plain_text || "" : "",
      description:
        properties.Description?.type === "rich_text" ? properties.Description.rich_text[0]?.plain_text || "" : "",
      photos:
        properties.Photos?.type === "files"
          ? properties.Photos.files.map((file) => ("file" in file ? file.file.url : file.external.url))
          : [],
      status: properties.Statut?.type === "select" ? properties.Statut.select?.name || "" : "",
      qrId: properties.QR_ID?.type === "rich_text" ? properties.QR_ID.rich_text[0]?.plain_text || "" : "",
    };

    setCached(cacheKey, box);
    return box;
  } catch (error) {
    console.error("Error fetching box by QR ID:", error);
    return null;
  }
}

// Add a function to update a box's QR ID
export async function updateBoxQRId(boxId: string, newQrId: string): Promise<Box | null> {
  try {
    await notion.pages.update({
      page_id: boxId,
      properties: {
        QR_ID: {
          rich_text: [
            {
              text: {
                content: newQrId,
              },
            },
          ],
        },
      },
    });

    return getBoxById(boxId);
  } catch (error) {
    console.error("Error updating box QR ID:", error);
    return null;
  }
}
