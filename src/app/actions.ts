"use server";

import { Box } from "@src/lib/notion";
import { notion, getBoxByQRId } from "@src/lib/server-notion";
import {
  PageObjectResponse,
  UpdatePageParameters,
  FilesPropertyItemObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

interface NotionProperties {
  Photos?: FilesPropertyItemObjectResponse;
  QR_ID?: {
    type: "rich_text";
    rich_text: Array<{ plain_text: string }>;
  };
}

// Initialize Supabase client with service role key for uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for uploads
);

// Validate QR ID format (8-character hexadecimal)
function isValidQRId(qrId: string): boolean {
  return /^[0-9a-f]{8}$/.test(qrId);
}

// Ensure the photos bucket exists
async function ensurePhotosBucket() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const photosBucket = buckets?.find((b) => b.name === "photos");

    if (!photosBucket) {
      // Create the bucket if it doesn't exist
      await supabase.storage.createBucket("photos", {
        public: true, // Make the bucket public
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ["image/*"], // Only allow images
      });
    }
  } catch {
    throw new Error("Failed to ensure photos bucket");
  }
}

export async function updateBox(boxId: string, data: Partial<Box>) {
  console.log("[updateBox] Starting update with data:", { boxId, data });
  try {
    // Get current page to check existing QR ID
    const currentPage = (await notion.pages.retrieve({ page_id: boxId })) as PageObjectResponse;
    const currentQRId = (currentPage.properties as NotionProperties).QR_ID?.rich_text[0]?.plain_text;
    console.log("[updateBox] Current QR ID:", currentQRId);

    // Validate QR ID if provided
    if (data.qrId && !isValidQRId(data.qrId)) {
      console.log("[updateBox] Invalid QR ID format:", data.qrId);
      throw new Error("Invalid QR ID format. Must be 8 hexadecimal characters (e.g., 0b66003c)");
    }

    const properties: UpdatePageParameters["properties"] = {
      Nom: {
        title: [{ text: { content: data.name || "" } }],
      },
      Description: {
        rich_text: [{ text: { content: data.description || "" } }],
      },
      Statut: {
        select: { name: data.status || "En préparation" },
      },
    };

    // Only update QR_ID if it's provided and different from current
    if (data.qrId && data.qrId !== currentQRId) {
      console.log("[updateBox] Updating QR ID from", currentQRId, "to:", data.qrId);
      properties.QR_ID = {
        rich_text: [{ text: { content: data.qrId } }],
      };
    }

    const updatePayload: UpdatePageParameters = {
      page_id: boxId,
      properties,
    };

    console.log("[updateBox] Sending update to Notion with payload:", updatePayload);

    try {
      await notion.pages.update(updatePayload);
      console.log("[updateBox] Successfully updated Notion page");
    } catch (error) {
      console.error("[updateBox] Failed to update Notion page:", error);
      throw new Error(`Failed to update Notion page: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // If QR ID was updated, use the new one to fetch the box
    const qrIdToUse = data.qrId || currentQRId || "";
    console.log("[updateBox] Fetching updated box with QR ID:", qrIdToUse);

    let updatedBox;
    try {
      updatedBox = await getBoxByQRId(qrIdToUse);
      console.log("[updateBox] Successfully fetched updated box:", updatedBox);
    } catch (error) {
      console.error("[updateBox] Failed to fetch updated box:", error);
      throw new Error(`Failed to fetch updated box: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (!updatedBox) {
      console.error("[updateBox] Box not found with QR ID:", qrIdToUse);
      throw new Error(`Box not found with QR ID: ${qrIdToUse}`);
    }

    // Only redirect if QR ID was actually changed
    if (data.qrId && data.qrId !== currentQRId) {
      console.log("[updateBox] QR ID changed, redirecting to:", `/box/${data.qrId}`);
      redirect(`/box/${data.qrId}`);
    }

    console.log("[updateBox] Update completed successfully");
    return updatedBox;
  } catch (error) {
    // Check if this is a redirect error
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      // Re-throw the redirect error to let Next.js handle it
      throw error;
    }

    console.error("[updateBox] Error in updateBox:", error);
    // Preserve the original error message if it's already a specific error
    if (error instanceof Error && error.message !== "Failed to update box") {
      throw error;
    }
    throw new Error(`Failed to update box: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function uploadPhotos(boxId: string, formData: globalThis.FormData) {
  try {
    // Ensure the photos bucket exists
    await ensurePhotosBucket();

    // Get files from FormData
    const files = [];
    for (const [key, value] of formData.entries()) {
      if (key === "photos" && value instanceof File) {
        files.push(value);
      }
    }

    // Upload each file to Supabase storage and collect the file objects
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          // Create a unique file path
          const filePath = `${boxId}/${Date.now()}-${file.name}`;

          // Upload file to Supabase storage
          const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, file);

          if (uploadError) {
            throw uploadError;
          }

          // Get the public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("photos").getPublicUrl(filePath);

          return {
            type: "external" as const,
            name: file.name,
            external: { url: publicUrl },
          };
        } catch {
          throw new Error("Failed to process file");
        }
      })
    );

    // Get current page to check existing photos
    const page = (await notion.pages.retrieve({ page_id: boxId })) as PageObjectResponse;
    if (!page) throw new Error("Box not found");

    // Merge with existing photos if needed
    const properties = page.properties as NotionProperties;
    const existingPhotos = properties.Photos?.files ? properties.Photos.files : [];

    // Prepare the update payload
    const updatePayload: UpdatePageParameters = {
      page_id: boxId,
      properties: {
        Photos: {
          files: [...existingPhotos, ...uploadedFiles],
        },
      },
    };

    // Update the page with the new files
    await notion.pages.update(updatePayload);

    // Get the updated box using the QR ID from the page properties
    const qrId = properties.QR_ID?.type === "rich_text" ? properties.QR_ID.rich_text[0]?.plain_text : null;
    if (!qrId) throw new Error("QR ID not found");

    const updatedBox = await getBoxByQRId(qrId);
    if (!updatedBox) throw new Error("Failed to get updated box");

    return updatedBox;
  } catch {
    throw new Error("Failed to upload photos");
  }
}

export async function deletePhoto(boxId: string, photoUrl: string) {
  try {
    // Extract the file path from the Supabase URL
    const url = new URL(photoUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/photos\/(.+)/);
    if (!pathMatch) {
      throw new Error("Invalid photo URL format");
    }
    const filePath = pathMatch[1];

    // Delete the file from Supabase storage
    const { error: deleteError } = await supabase.storage.from("photos").remove([filePath]);

    if (deleteError) {
      throw deleteError;
    }

    // Get current page to check existing photos
    const page = (await notion.pages.retrieve({ page_id: boxId })) as PageObjectResponse;
    if (!page) {
      throw new Error("Box not found");
    }

    const properties = page.properties as NotionProperties;
    const existingPhotos = properties.Photos?.files
      ? properties.Photos.files
          .map((file) => ("file" in file ? file.file?.url : file.external?.url))
          .filter((url): url is string => url !== undefined && url !== photoUrl)
      : [];

    await notion.pages.update({
      page_id: boxId,
      properties: {
        Photos: {
          files: existingPhotos.map((url) => ({
            type: "external" as const,
            name: "Photo",
            external: { url },
          })),
        },
      },
    });

    // Get the updated box using the QR ID from the page properties
    const qrId = properties.QR_ID?.type === "rich_text" ? properties.QR_ID.rich_text[0]?.plain_text : null;

    if (!qrId) {
      throw new Error("QR ID not found");
    }

    const updatedBox = await getBoxByQRId(qrId);
    if (!updatedBox) {
      throw new Error("Failed to get updated box");
    }

    return updatedBox;
  } catch {
    throw new Error("Failed to delete photo");
  }
}
