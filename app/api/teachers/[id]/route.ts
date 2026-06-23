import { deleteTeacherWithDependencies } from "@/lib/cascade-deletes";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const teacherId = Number.parseInt(id, 10);

  if (!Number.isFinite(teacherId)) {
    return NextResponse.json({ error: "Invalid teacher id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const error = await deleteTeacherWithDependencies(supabase, teacherId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
