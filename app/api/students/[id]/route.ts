import { deleteStudentWithDependencies } from "@/lib/cascade-deletes";
import { getStudentDetail } from "@/lib/student-detail";
import { updateStudent, type UpdateStudentPayload } from "@/lib/update-student";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { detail, error } = await getStudentDetail(supabase, studentId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!detail) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as UpdateStudentPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const classIds = Array.isArray(body.classIds)
    ? body.classIds.filter((classId) => Number.isFinite(classId))
    : [];

  const supabase = createAdminClient();
  const { detail, error } = await updateStudent(supabase, studentId, {
    firstname: typeof body.firstname === "string" ? body.firstname : "",
    lastname: typeof body.lastname === "string" ? body.lastname : "",
    dob: typeof body.dob === "string" ? body.dob : "",
    averageGrade:
      typeof body.averageGrade === "number" ? body.averageGrade : null,
    parentName: typeof body.parentName === "string" ? body.parentName : "",
    parentPhone: typeof body.parentPhone === "string" ? body.parentPhone : "",
    parentEmail: typeof body.parentEmail === "string" ? body.parentEmail : "",
    address: body.address ?? null,
    classIds,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!detail) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

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
