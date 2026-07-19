"use client";

import { useEffect, useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/20/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/catalyst/alert";
import { Button } from "@/components/catalyst/button";
import type { StudentDocument } from "@/lib/student-documents";
import {
  formatDocumentFileSize,
  formatDocumentMimeLabel,
  validateDocumentFile,
} from "@/lib/student-documents";

type Props = {
  studentId: number;
  documents: StudentDocument[];
  onDocumentsChange: (documents: StudentDocument[]) => void;
};

function formatDocumentDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfMimeType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

const DEFAULT_PREVIEW_HEIGHT = 320;
const MIN_PREVIEW_HEIGHT = 160;
const MAX_PREVIEW_HEIGHT = 720;

function clampPreviewHeight(height: number): number {
  return Math.min(MAX_PREVIEW_HEIGHT, Math.max(MIN_PREVIEW_HEIGHT, height));
}

export function StudentDocumentsSection({
  studentId,
  documents,
  onDocumentsChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const addDocumentButtonRef = useRef<HTMLButtonElement>(null);
  const previewResizeRef = useRef<{ startY: number; startHeight: number } | null>(
    null,
  );
  const [showAddDocumentPanel, setShowAddDocumentPanel] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHeight, setPreviewHeight] = useState(DEFAULT_PREVIEW_HEIGHT);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentToRemove, setDocumentToRemove] = useState<StudentDocument | null>(
    null,
  );
  const [showRemoveDocumentConfirm, setShowRemoveDocumentConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(pendingFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pendingFile]);

  function resetPendingUpload() {
    setPendingFile(null);
    setPreviewUrl(null);
    setPreviewHeight(DEFAULT_PREVIEW_HEIGHT);
    previewResizeRef.current = null;
  }

  function handlePreviewResizeStart(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    previewResizeRef.current = {
      startY: event.clientY,
      startHeight: previewHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePreviewResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!previewResizeRef.current) {
      return;
    }

    const deltaY = event.clientY - previewResizeRef.current.startY;
    setPreviewHeight(
      clampPreviewHeight(previewResizeRef.current.startHeight + deltaY),
    );
  }

  function handlePreviewResizeEnd(event: React.PointerEvent<HTMLDivElement>) {
    previewResizeRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function scrollDocumentsSectionIntoView() {
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      addDocumentButtonRef.current?.focus({ preventScroll: true });
    });
  }

  function closeAddPanel(options?: { preserveMessage?: boolean }) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setShowAddDocumentPanel(false);
    resetPendingUpload();

    if (!options?.preserveMessage) {
      setUploadMessage(null);
    }
  }

  function handleChooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setUploadMessage(null);

    const validationError = validateDocumentFile(selectedFile);
    if (validationError) {
      setUploadMessage({ type: "error", text: validationError });
      return;
    }

    setPendingFile(selectedFile);
  }

  async function handleSubmitDocument() {
    if (!pendingFile) {
      return;
    }

    setUploadMessage(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const response = await fetch(`/api/students/${studentId}/documents`, {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to upload file.");
      }

      if (Array.isArray(body?.documents)) {
        onDocumentsChange(body.documents);
      }

      closeAddPanel({ preserveMessage: true });
      setUploadMessage({
        type: "success",
        text: "Document uploaded successfully.",
      });
      scrollDocumentsSectionIntoView();
    } catch (err) {
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to upload file.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function openRemoveDocumentConfirm(document: StudentDocument) {
    setDocumentToRemove(document);
    setShowRemoveDocumentConfirm(true);
  }

  async function confirmRemoveDocument() {
    if (!documentToRemove) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/students/${studentId}/documents/${documentToRemove.id}`,
        { method: "DELETE" },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to delete document.");
      }

      if (Array.isArray(body?.documents)) {
        onDocumentsChange(body.documents);
      }

      setDocumentToRemove(null);
      setShowRemoveDocumentConfirm(false);
    } catch (err) {
      setUploadMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to delete document.",
      });
      setShowRemoveDocumentConfirm(false);
      setDocumentToRemove(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <section
        ref={sectionRef}
        className="scroll-mt-6 rounded-xl border border-zinc-300 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-zinc-950">Documents</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Medical records and other files attached to this student.
        </p>

        {uploadMessage && !showAddDocumentPanel && (
          <p
            className={
              uploadMessage.type === "success"
                ? "mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                : "mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {uploadMessage.text}
          </p>
        )}

        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No documents are attached to this student.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-stretch border-b border-zinc-200 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-zinc-900 hover:text-zinc-700 hover:underline"
                  >
                    {document.fileName}
                  </a>
                  <span className="text-sm text-zinc-600">
                    {formatDocumentMimeLabel(document.mimeType)} ·{" "}
                    {formatDocumentFileSize(document.fileSize)} ·{" "}
                    {formatDocumentDate(document.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openRemoveDocumentConfirm(document)}
                  aria-label={`Delete ${document.fileName}`}
                  className="inline-flex shrink-0 items-center justify-center border-l border-zinc-200 px-4 py-3 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                >
                  <TrashIcon className="size-5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <button
            ref={addDocumentButtonRef}
            type="button"
            onClick={() => {
              setShowAddDocumentPanel((open) => {
                if (open) {
                  closeAddPanel();
                  return false;
                }

                setUploadMessage(null);
                return true;
              });
            }}
            className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {showAddDocumentPanel ? "Cancel adding document" : "Add document"}
          </button>

          {showAddDocumentPanel && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {!pendingFile ? (
                <>
                  <p className="text-sm font-medium text-zinc-700">
                    Choose a document to upload
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    PDF, Word, plain text, or image files up to 10 MB.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
                    className="sr-only"
                    onChange={handleChooseFile}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 inline-flex justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50"
                  >
                    Choose file
                  </button>

                  {uploadMessage && (
                    <p className="mt-3 text-sm text-red-700">{uploadMessage.text}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-zinc-900">
                    Confirm upload
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Review the file below before submitting it to this student.
                    Drag the handle below the preview to resize it.
                  </p>

                  <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-200 px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900">
                        {pendingFile.name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatDocumentMimeLabel(pendingFile.type)} ·{" "}
                        {formatDocumentFileSize(pendingFile.size)}
                      </p>
                    </div>

                    {previewUrl &&
                    (isImageMimeType(pendingFile.type) ||
                      isPdfMimeType(pendingFile.type)) ? (
                      <>
                        <div
                          className="overflow-auto p-4"
                          style={{ height: previewHeight }}
                        >
                          {isImageMimeType(pendingFile.type) && (
                            <img
                              src={previewUrl}
                              alt={`Preview of ${pendingFile.name}`}
                              className="mx-auto h-full w-full rounded-md border border-zinc-200 object-contain"
                            />
                          )}

                          {isPdfMimeType(pendingFile.type) && (
                            <iframe
                              src={previewUrl}
                              title={`Preview of ${pendingFile.name}`}
                              className="h-full w-full rounded-md border border-zinc-200 bg-white"
                            />
                          )}
                        </div>
                        <div
                          role="separator"
                          aria-orientation="horizontal"
                          aria-label="Drag to resize preview"
                          aria-valuenow={previewHeight}
                          aria-valuemin={MIN_PREVIEW_HEIGHT}
                          aria-valuemax={MAX_PREVIEW_HEIGHT}
                          onPointerDown={handlePreviewResizeStart}
                          onPointerMove={handlePreviewResizeMove}
                          onPointerUp={handlePreviewResizeEnd}
                          onPointerCancel={handlePreviewResizeEnd}
                          className="flex cursor-ns-resize touch-none items-center justify-center border-t border-zinc-200 bg-zinc-50 py-2 select-none hover:bg-zinc-100"
                        >
                          <span
                            className="h-1 w-12 rounded-full bg-zinc-300"
                            aria-hidden="true"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-zinc-600">
                          Preview is not available for this file type. You can
                          still upload it if the details above look correct.
                        </p>
                      </div>
                    )}
                  </div>

                  {uploadMessage && (
                    <p className="mt-3 text-sm text-red-700">{uploadMessage.text}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSubmitDocument}
                      disabled={isUploading}
                      className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {isUploading ? "Uploading…" : "Submit document"}
                    </button>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        resetPendingUpload();
                        setUploadMessage(null);
                      }}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Choose a different file
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <Alert
        open={showRemoveDocumentConfirm}
        onClose={() => {
          if (isDeleting) {
            return;
          }

          setShowRemoveDocumentConfirm(false);
          setDocumentToRemove(null);
        }}
      >
        <AlertTitle>Delete document</AlertTitle>
        <AlertDescription>
          Delete {documentToRemove?.fileName ?? "this document"} from this student?
          This removes the file from storage permanently.
        </AlertDescription>
        <AlertActions>
          <Button
            plain
            disabled={isDeleting}
            onClick={() => {
              setShowRemoveDocumentConfirm(false);
              setDocumentToRemove(null);
            }}
          >
            Cancel
          </Button>
          <Button color="red" disabled={isDeleting} onClick={confirmRemoveDocument}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </AlertActions>
      </Alert>
    </>
  );
}
