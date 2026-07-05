import { deleteClassWithDependencies } from "@/lib/cascade-deletes";
import { getClassDetail } from "@/lib/class-detail";
import { updateClass, type UpdateClassPayload } from "@/lib/update-class";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const classId = Number.parseInt(id, 10);

  if (!Number.isFinite(classId)) {
    return NextResponse.json({ error: "Invalid class id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { detail, error } = await getClassDetail(supabase, classId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!detail) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const classId = Number.parseInt(id, 10);

  if (!Number.isFinite(classId)) {
    return NextResponse.json({ error: "Invalid class id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as UpdateClassPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const studentIds = Array.isArray(body.studentIds)
    ? body.studentIds.filter((studentId) => Number.isFinite(studentId))
    : [];

  const supabase = createAdminClient();
  const { detail, error } = await updateClass(supabase, classId, {
    subject: typeof body.subject === "string" ? body.subject : "",
    teacherId: Number(body.teacherId),
    studentIds,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!detail) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const classId = Number.parseInt(id, 10);

  if (!Number.isFinite(classId)) {
    return NextResponse.json({ error: "Invalid class id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const error = await deleteClassWithDependencies(supabase, classId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
