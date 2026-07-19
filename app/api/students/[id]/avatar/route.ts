import { getStudentDetail } from "@/lib/student-detail";
import { uploadStudentAvatar } from "@/lib/student-avatar";
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  const uploadResult = await uploadStudentAvatar(createAdminClient(), studentId, {
    name: file.name,
    type: file.type,
    size: file.size,
    data: await file.arrayBuffer(),
  });

  if (uploadResult.error || !uploadResult.publicUrl) {
    return NextResponse.json(
      { error: uploadResult.error ?? "Unable to upload image." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from("students")
    .update({ avatar_url: uploadResult.publicUrl })
    .eq("id", studentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

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
  const user = await requireAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    avatarUrl?: string;
  } | null;

  if (!body || typeof body.avatarUrl !== "string" || !body.avatarUrl.trim()) {
    return NextResponse.json({ error: "Avatar URL is required." }, { status: 400 });
  }

  const avatarUrl = body.avatarUrl.trim();

  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from("students")
    .update({ avatar_url: avatarUrl })
    .eq("id", studentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { detail, error } = await getStudentDetail(supabase, studentId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!detail) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
