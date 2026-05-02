const ALLOWED_MIME_PREFIXES = ["data:image/jpeg", "data:image/png", "data:image/webp", "data:image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const validateBase64Image = (base64String) => {
  if (!base64String) return { valid: false, message: "No image provided" };

  const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) => base64String.startsWith(prefix));
  if (!isAllowedType) {
    return { valid: false, message: "Invalid file type. Only JPEG, PNG, WebP and GIF are allowed." };
  }

  const base64Data = base64String.split(",")[1] || "";
  const estimatedBytes = (base64Data.length * 3) / 4;
  if (estimatedBytes > MAX_SIZE_BYTES) {
    return { valid: false, message: "Image too large. Maximum size is 4MB." };
  }

  return { valid: true };
};