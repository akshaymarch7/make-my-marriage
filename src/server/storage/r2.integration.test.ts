import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { signUpload, signRead, verifyAndCopy, deleteObject } from "./r2";
it.skipIf(process.env.RUN_R2_SMOKE !== "1")("dev R2 signs a CORS upload, verifies/copies, downloads and deletes its own fixture", async () => {
  const { loadEnvFile } = await import("node:process"); loadEnvFile(".env.local");
  if (process.env.R2_BUCKET_NAME !== "make-my-marriage-dev") throw new Error("R2 smoke test requires the isolated development bucket.");
  const prefix = `test-fixtures/${randomUUID()}`; const stage = `${prefix}/stage`, final = `${prefix}/final`;
  const body = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nL8AAAAASUVORK5CYII=", "base64");
  try {
    const putUrl = await signUpload(stage, "image/png", body.length);
    const preflight = await fetch(putUrl, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } }); expect(preflight.ok).toBe(true);
    const oversized = await fetch(putUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: Buffer.concat([body, Buffer.from([0])]) }); expect(oversized.status).toBe(403);
    const response = await fetch(putUrl, { method: "PUT", headers: { "Content-Type": "image/png", Origin: "http://localhost:3000" }, body }); expect(response.status).toBe(200); expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    await verifyAndCopy(stage, final, "image/png", body.length);
    const read = await fetch(await signRead(final, "wedding.png")); expect(read.status).toBe(200); expect(read.headers.get("content-disposition")).toContain("attachment"); expect(Buffer.from(await read.arrayBuffer()).equals(body)).toBe(true);
  } finally { await deleteObject(stage); await deleteObject(final); }
}, 30000);
