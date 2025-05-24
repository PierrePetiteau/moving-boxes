import { createBox } from "@src/lib/notion";
import { notion } from "@src/lib/notion";
import { NextResponse } from "next/server";
import { getDatabaseId } from "@src/lib/db";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export async function POST(req: Request) {
  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const box = await createBox(name, description || "");
    if (!box) {
      return NextResponse.json({ error: "Failed to create box" }, { status: 500 });
    }

    return NextResponse.json(box);
  } catch (error) {
    console.error("Error creating box:", error);
    return NextResponse.json({ error: "Failed to create box" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const databaseId = await getDatabaseId();

    if (!databaseId) {
      return NextResponse.json({ error: "Database ID not found" }, { status: 404 });
    }

    const boxes = await fetchBoxesFromDatabase(databaseId);
    return NextResponse.json(boxes);
  } catch (error) {
    console.error("Error fetching boxes:", error);
    return NextResponse.json({ error: "Failed to fetch boxes" }, { status: 500 });
  }
}

async function fetchBoxesFromDatabase(databaseId: string) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: "Nom",
          direction: "ascending",
        },
      ],
    });

    return response.results.map((page) => {
      if (!("properties" in page)) {
        throw new Error("Invalid page response");
      }

      const pageResponse = page as PageObjectResponse;
      const properties = pageResponse.properties;

      const name = properties.Nom.type === "title" ? properties.Nom.title[0]?.plain_text || "" : "";
      const status = properties.Statut.type === "select" ? properties.Statut.select?.name || "Unknown" : "Unknown";
      const description =
        properties.Description.type === "rich_text" ? properties.Description.rich_text[0]?.plain_text || "" : "";
      const qrId = properties.QR_ID.type === "rich_text" ? properties.QR_ID.rich_text[0]?.plain_text || "" : "";
      const photos =
        properties.Photos?.type === "files"
          ? properties.Photos.files.map((file) => ("file" in file ? file.file.url : file.external.url))
          : [];

      return {
        id: page.id,
        name,
        status,
        description,
        qrId,
        photos,
      };
    });
  } catch (error) {
    console.error("Error fetching boxes:", error);
    throw error;
  }
}
