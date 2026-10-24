import "server-only";
import mongoose, { Types } from "mongoose";
import { badRequest } from "./api";

const BUCKET = "uploads";
const MAX_BYTES = 5 * 1024 * 1024;

const TYPES: Record<string, string[]> = {
  logo: ["image/png", "image/jpeg", "image/webp"],
  document: ["application/pdf", "image/png", "image/jpeg"],
};

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: BUCKET });
}

export type FileMeta = { kind: "logo" | "document"; college: Types.ObjectId; public: boolean };

/** Validates and stores an uploaded file in MongoDB GridFS. Returns the new file id. */
export async function saveFile(file: File, meta: FileMeta) {
  if (!file || typeof file === "string" || !file.size) throw badRequest("No file was uploaded.");
  if (file.size > MAX_BYTES) throw badRequest(`${file.name} is larger than 5 MB.`);
  if (!TYPES[meta.kind].includes(file.type)) {
    throw badRequest(`${file.name}: only ${TYPES[meta.kind].map((t) => t.split("/")[1].toUpperCase()).join(", ")} files are allowed.`);
  }
  const data = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(data, file.type)) throw badRequest(`${file.name} does not look like a valid ${file.type} file.`);
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  const upload = bucket().openUploadStream(safeName, { metadata: { ...meta, contentType: file.type } });
  await new Promise<void>((resolve, reject) => {
    upload.once("finish", () => resolve());
    upload.once("error", reject);
    upload.end(data);
  });
  return { fileId: upload.id as Types.ObjectId, name: safeName, contentType: file.type, size: file.size };
}

// Check magic bytes so a renamed executable can't pose as a PDF or image.
function matchesSignature(data: Buffer, type: string) {
  const hex = data.subarray(0, 12).toString("hex");
  if (type === "application/pdf") return data.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png") return hex.startsWith("89504e47");
  if (type === "image/jpeg") return hex.startsWith("ffd8ff");
  if (type === "image/webp") return data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP";
  return false;
}

export async function findFile(id: Types.ObjectId) {
  const [file] = await bucket().find({ _id: id }).limit(1).toArray();
  return file as (typeof file & { metadata: FileMeta & { contentType: string } }) | undefined;
}

export async function readFile(id: Types.ObjectId) {
  const chunks: Buffer[] = [];
  for await (const chunk of bucket().openDownloadStream(id)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteFile(id: Types.ObjectId) {
  try {
    await bucket().delete(id);
  } catch {
    // Already gone — nothing to clean up.
  }
}
