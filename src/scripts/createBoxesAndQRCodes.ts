import { createBox, createDatabase } from "@src/lib/notion";
import { generateQRCode } from "@src/utils/qrcode";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

interface BoxInput {
  name: string;
  description: string;
}

async function setupDatabase() {
  try {
    const databaseId = await createDatabase();
    console.log(`Created database with ID: ${databaseId}`);
    return databaseId;
  } catch (error) {
    console.error("Error setting up database:", error);
    throw error;
  }
}

async function createBoxWithQRCode(boxInput: BoxInput) {
  try {
    // Create box in Notion
    const box = await createBox(boxInput.name, boxInput.description);

    if (!box) {
      throw new Error("Failed to create box in Notion");
    }

    // Generate QR code
    const qrCodeUrl = await generateQRCode(box.id, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

    console.log(`Created box "${boxInput.name}" with ID: ${box.id}`);
    console.log(`QR Code generated at: ${qrCodeUrl}`);

    return { box, qrCodeUrl };
  } catch (error) {
    console.error("Error creating box with QR code:", error);
    throw error;
  }
}

// Example usage
const boxes: BoxInput[] = [
  {
    name: "Box 1",
    description: "This is box 1",
  },
  {
    name: "Box 2",
    description: "This is box 2",
  },
];

async function main() {
  // Create database first
  await setupDatabase();

  // Then create boxes
  for (const boxInput of boxes) {
    await createBoxWithQRCode(boxInput);
  }
}

main().catch(console.error);
