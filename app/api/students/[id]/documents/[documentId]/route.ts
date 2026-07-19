import {
  deleteStudentDocument,
  listStudentDocuments,
} from "@/lib/student-documents";
import { createAdminClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id, documentId: documentIdParam } = await params;
  const studentId = Number.parseInt(id, 10);
  const documentId = Number.parseInt(documentIdParam, 10);

  if (!Number.isFinite(studentId) || !Number.isFinite(documentId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const deleteResult = await deleteStudentDocument(
    createAdminClient(),
    studentId,
    documentId,
  );

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error }, { status: 400 });
  }

  const { documents, error } = await listStudentDocuments(
    createAdminClient(),
    studentId,
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ documents });
}
