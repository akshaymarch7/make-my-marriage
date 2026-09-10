export function weddingSlug(brideName: string, groomName: string, weddingDate: string, attempt = 0) {
  const names = `${brideName}-${groomName}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100).replace(/^-|-$/g, "") || "wedding";
  const date = weddingDate.split("-").reverse().join("");
  return `${names}-${date}${attempt ? `-${attempt + 1}` : ""}`;
}
