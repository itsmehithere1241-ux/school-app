import type { SupabaseClient } from "@supabase/supabase-js";
import { STUDENT_STORAGE_BUCKET } from "./student-storage";

export const STUDENTS_AVATAR_BUCKET = STUDENT_STORAGE_BUCKET;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export type AvatarUploadInput = {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
};

export function getStudentAvatarStoragePath(
  studentId: number,
  fileName: string,
): string {
  const extension = getFileExtension(fileName);
  return `${studentId}/avatar.${extension}`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";

  if (ext === "jpeg") {
    return "jpg";
  }

  return ext.replace(/[^a-z0-9]/g, "") || "jpg";
}

export function validateAvatarFile(file: File): string | null {
  return validateAvatarUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
}

export function validateAvatarUpload(input: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(input.type)) {
    return "Please choose a JPEG, PNG, WebP, or GIF image.";
  }

  if (input.size > MAX_AVATAR_BYTES) {
    return "Image must be 5 MB or smaller.";
  }

  return null;
}

export async function uploadStudentAvatar(
  supabase: SupabaseClient,
  studentId: number,
  file: AvatarUploadInput,
): Promise<{ publicUrl: string | null; error: string | null }> {
  const validationError = validateAvatarUpload(file);
  if (validationError) {
    return { publicUrl: null, error: validationError };
  }

  const filePath = getStudentAvatarStoragePath(studentId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(STUDENTS_AVATAR_BUCKET)
    .upload(filePath, file.data, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      publicUrl: null,
      error: formatAvatarUploadError(uploadError.message),
    };
  }

  const { data: urlData } = supabase.storage
    .from(STUDENTS_AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return { publicUrl: urlData.publicUrl, error: null };
}

export function formatAvatarUploadError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("bucket") ||
    normalized.includes("not found") ||
    normalized.includes("does not exist")
  ) {
    return "Unable to upload image. Storage bucket is not available.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("policy") ||
    normalized.includes("unauthorized") ||
    normalized.includes("403")
  ) {
    return "Unable to upload image. You do not have permission to upload.";
  }

  if (normalized.includes("payload too large") || normalized.includes("too large")) {
    return "Unable to upload image. File is too large.";
  }

  if (normalized.includes("invalid") || normalized.includes("mime")) {
    return "Unable to upload image. File type is not supported.";
  }

  return `Unable to upload image. ${message}`;
}

export function withCacheBuster(publicUrl: string): string {
  const separator = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${separator}t=${Date.now()}`;
}
