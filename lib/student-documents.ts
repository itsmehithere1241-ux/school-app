import type { SupabaseClient } from "@supabase/supabase-js";
import { STUDENT_STORAGE_BUCKET } from "./student-storage";

export type StudentDocument = {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
};

export type DocumentUploadInput = {
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
};

type DocumentRow = {
  id: number;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function mapDocumentRow(row: DocumentRow): StudentDocument {
  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    mimeType: row.mime_type,
    fileSize: typeof row.file_size === "number" ? row.file_size : null,
    createdAt: row.created_at,
  };
}

export function sanitizeDocumentFileName(fileName: string): string {
  const trimmed = fileName.trim() || "document";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function getStudentDocumentStoragePath(
  studentId: number,
  fileName: string,
): string {
  const safeName = sanitizeDocumentFileName(fileName);
  return `${studentId}/documents/${Date.now()}-${safeName}`;
}

export function validateDocumentFile(file: File): string | null {
  return validateDocumentUpload({
    name: file.name,
    type: file.type,
    size: file.size,
  });
}

export function validateDocumentUpload(input: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!input.name.trim()) {
    return "Please choose a file to upload.";
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(input.type)) {
    return "File type not supported. Use PDF, Word, plain text, or an image.";
  }

  if (input.size > MAX_DOCUMENT_BYTES) {
    return "File must be 10 MB or smaller.";
  }

  return null;
}

export function formatDocumentFileSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentMimeLabel(mimeType: string | null): string {
  if (!mimeType) {
    return "Document";
  }

  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPEG image";
    case "image/png":
      return "PNG image";
    case "image/webp":
      return "WebP image";
    case "image/gif":
      return "GIF image";
    case "text/plain":
      return "Text file";
    case "application/msword":
      return "Word document";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "Word document";
    default:
      return mimeType;
  }
}

export function formatDocumentUploadError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("bucket") ||
    normalized.includes("not found") ||
    normalized.includes("does not exist")
  ) {
    return "Unable to upload file. Storage bucket is not available.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("policy") ||
    normalized.includes("unauthorized") ||
    normalized.includes("403")
  ) {
    return "Unable to upload file. You do not have permission to upload.";
  }

  if (normalized.includes("payload too large") || normalized.includes("too large")) {
    return "Unable to upload file. File is too large.";
  }

  return `Unable to upload file. ${message}`;
}

export async function listStudentDocuments(
  supabase: SupabaseClient,
  studentId: number,
): Promise<{ documents: StudentDocument[]; error: string | null }> {
  const { data, error } = await supabase
    .from("student_document")
    .select("id, file_name, file_url, mime_type, file_size, created_at")
    .eq("student", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    return { documents: [], error: error.message };
  }

  return {
    documents: ((data ?? []) as DocumentRow[]).map(mapDocumentRow),
    error: null,
  };
}

export async function uploadStudentDocument(
  supabase: SupabaseClient,
  studentId: number,
  file: DocumentUploadInput,
): Promise<{ document: StudentDocument | null; error: string | null }> {
  const validationError = validateDocumentUpload(file);
  if (validationError) {
    return { document: null, error: validationError };
  }

  const storagePath = getStudentDocumentStoragePath(studentId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(STUDENT_STORAGE_BUCKET)
    .upload(storagePath, file.data, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      document: null,
      error: formatDocumentUploadError(uploadError.message),
    };
  }

  const { data: urlData } = supabase.storage
    .from(STUDENT_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const { data: inserted, error: insertError } = await supabase
    .from("student_document")
    .insert({
      student: studentId,
      file_name: file.name.trim(),
      storage_path: storagePath,
      file_url: urlData.publicUrl,
      mime_type: file.type,
      file_size: file.size,
    })
    .select("id, file_name, file_url, mime_type, file_size, created_at")
    .single();

  if (insertError) {
    await supabase.storage.from(STUDENT_STORAGE_BUCKET).remove([storagePath]);
    return { document: null, error: insertError.message };
  }

  return { document: mapDocumentRow(inserted as DocumentRow), error: null };
}

export async function deleteStudentDocument(
  supabase: SupabaseClient,
  studentId: number,
  documentId: number,
): Promise<{ error: string | null }> {
  const { data: row, error: fetchError } = await supabase
    .from("student_document")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("student", studentId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!row) {
    return { error: "Document not found." };
  }

  const { error: storageError } = await supabase.storage
    .from(STUDENT_STORAGE_BUCKET)
    .remove([row.storage_path as string]);

  if (storageError) {
    return { error: formatDocumentUploadError(storageError.message) };
  }

  const { error: deleteError } = await supabase
    .from("student_document")
    .delete()
    .eq("id", documentId)
    .eq("student", studentId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  return { error: null };
}

export async function deleteAllStudentDocuments(
  supabase: SupabaseClient,
  studentId: number,
): Promise<{ error: string | null }> {
  const { documents, error: listError } = await listStudentDocuments(
    supabase,
    studentId,
  );

  if (listError) {
    return { error: listError };
  }

  if (documents.length > 0) {
    const { data: rows, error: fetchError } = await supabase
      .from("student_document")
      .select("storage_path")
      .eq("student", studentId);

    if (fetchError) {
      return { error: fetchError.message };
    }

    const paths = (rows ?? [])
      .map((row) => row.storage_path as string)
      .filter(Boolean);

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STUDENT_STORAGE_BUCKET)
        .remove(paths);

      if (storageError) {
        return { error: storageError.message };
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("student_document")
    .delete()
    .eq("student", studentId);

  return { error: deleteError?.message ?? null };
}
