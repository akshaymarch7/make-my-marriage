import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { AppError } from "@/server/http/app-error";
const configuration = z.object({ R2_ACCOUNT_ID: z.string().regex(/^[a-f\d]{32}$/), R2_ACCESS_KEY_ID: z.string().min(1), R2_SECRET_ACCESS_KEY: z.string().min(1), R2_BUCKET_NAME: z.string().min(1) });
function storage() {
  const parsed = configuration.safeParse(process.env);
  if (!parsed.success) throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Photo storage is not configured yet. Please try again once storage is set up." });
  const env = parsed.data;
  return { bucket: env.R2_BUCKET_NAME, client: new S3Client({ region: "auto", endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" }) };
}
async function boundary<T>(action: () => Promise<T>): Promise<T> { try { return await action(); } catch (error) { if (error instanceof AppError) throw error; throw new AppError({ category: "EXTERNAL_SERVICE_ERROR", message: "Photo storage couldn’t complete the request. Please try again." }); } }
export function signUpload(key: string, mimeType: string, sizeBytes: number) { return boundary(async () => { const { client, bucket } = storage(); return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType, ContentLength: sizeBytes }), { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) }); }); }
export function signRead(key: string, filename?: string) { return boundary(async () => { const { client, bucket } = storage(); return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ...(filename ? { ResponseContentDisposition: `attachment; filename="photo"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}` } : {}) }), { expiresIn: 900 }); }); }
export function matchesSignature(bytes: Uint8Array, mime: string) {
  const b = Buffer.from(bytes);
  return mime === "image/jpeg" ? b[0] === 255 && b[1] === 216 && b[2] === 255 : mime === "image/png" ? b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === "image/webp" && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
}
export function verifyAndCopy(source: string, destination: string, mimeType: string, sizeBytes: number) { return boundary(async () => {
  const { client, bucket } = storage();
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: source }));
  if (head.ContentLength !== sizeBytes || head.ContentType !== mimeType || !head.ETag) throw new AppError({ category: "UPLOAD_ERROR", message: "This upload doesn’t match the selected photo. Remove it and choose the file again." });
  const sample = await client.send(new GetObjectCommand({ Bucket: bucket, Key: source, Range: "bytes=0-15", IfMatch: head.ETag }));
  if (!sample.Body || !matchesSignature(await sample.Body.transformToByteArray(), mimeType)) throw new AppError({ category: "UPLOAD_ERROR", message: "This file isn’t a supported JPEG, PNG or WebP photo." });
  await client.send(new CopyObjectCommand({ Bucket: bucket, Key: destination, CopySource: `${bucket}/${source}`, CopySourceIfMatch: head.ETag, MetadataDirective: "REPLACE", ContentType: mimeType, CacheControl: "private, max-age=300" }));
}); }
export function deleteObject(key: string) { return boundary(async () => { const { client, bucket } = storage(); await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }); }
