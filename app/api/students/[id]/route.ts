import { deleteStudentWithDependencies } from "@/lib/cascade-deletes";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const error = await deleteStudentWithDependencies(supabase, studentId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
