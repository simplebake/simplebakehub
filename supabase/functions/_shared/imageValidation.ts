/**
 * Validation helpers for base64-encoded image payloads.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB raw
export const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 1.4);

export const IMAGE_DATA_URI_RE = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

export function validateImageBase64(value: unknown):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  if (typeof value !== "string" || value.length === 0) {
    return { ok: false, status: 400, error: "No image provided" };
  }
  if (!IMAGE_DATA_URI_RE.test(value)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid image format. Expected data:image/{jpeg|png|webp|gif};base64,...",
    };
  }
  if (value.length > MAX_BASE64_LENGTH) {
    return { ok: false, status: 413, error: "Image too large (max 5 MB)" };
  }
  return { ok: true };
}
