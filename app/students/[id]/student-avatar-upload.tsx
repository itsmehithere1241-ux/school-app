"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/catalyst/avatar";
import { validateAvatarFile, withCacheBuster } from "@/lib/student-avatar";

type Props = {
  studentId: number;
  avatarUrl: string | null;
  studentName: string;
  initials: string;
  onUploadDone: (publicUrl: string) => void;
};

export function StudentAvatarUpload({
  studentId,
  avatarUrl,
  studentName,
  initials,
  onUploadDone,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(avatarUrl);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setDisplayUrl(avatarUrl);
  }, [avatarUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setUploadMessage(null);

    const validationError = validateAvatarFile(selectedFile);
    if (validationError) {
      setUploadMessage({ type: "error", text: validationError });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/students/${studentId}/avatar`, {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to upload image.");
      }

      const publicUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl : null;

      if (!publicUrl) {
        throw new Error("Unable to upload image.");
      }

      const refreshedUrl = withCacheBuster(publicUrl);
      setDisplayUrl(refreshedUrl);
      onUploadDone(refreshedUrl);
      setUploadMessage({
        type: "success",
        text: "Profile picture updated.",
      });
    } catch (err) {
      setUploadMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to upload image.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <Avatar
        src={displayUrl}
        initials={displayUrl ? undefined : initials}
        alt={`${studentName} profile picture`}
        className="size-24 bg-zinc-100 text-zinc-600 outline-zinc-300"
      />

      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">Profile picture</p>
        <p className="mt-1 text-sm text-zinc-500">
          JPEG, PNG, WebP, or GIF up to 5 MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {isUploading ? "Uploading…" : "Upload new picture"}
        </button>

        {uploadMessage && (
          <p
            className={
              uploadMessage.type === "success"
                ? "mt-3 text-sm text-green-700"
                : "mt-3 text-sm text-red-700"
            }
          >
            {uploadMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
