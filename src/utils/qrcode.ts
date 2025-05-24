import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";

export async function generateQRCode(boxId: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl}/box/${boxId}`;
  const qrCodePath = path.join(process.cwd(), "qrcodes", `${boxId}.png`);

  try {
    await QRCode.toFile(qrCodePath, url, {
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      width: 400,
      margin: 1,
    });

    return `/qrcodes/${boxId}.png`;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

export async function deleteQRCode(boxId: string): Promise<void> {
  const qrCodePath = path.join(process.cwd(), "qrcodes", `${boxId}.png`);

  try {
    await fs.unlink(qrCodePath);
  } catch (error) {
    console.error("Error deleting QR code:", error);
    throw error;
  }
}
