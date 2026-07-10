import { put } from "@vercel/blob";

/** Upload a roster PNG (raw base64 or data URL) to a public Blob URL for Twilio media. */
export async function uploadRosterWhatsappPng(imageBase64: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  if (!base64Data) {
    throw new Error("Empty roster image.");
  }

  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length < 100) {
    throw new Error("Roster image is too small or invalid.");
  }

  const blob = await put(`roster-whatsapp/${Date.now()}-roster.png`, buffer, {
    access: "public",
    contentType: "image/png",
    token,
  });

  return blob.url;
}
