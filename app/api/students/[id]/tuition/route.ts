import { getStudentDetail } from "@/lib/student-detail";
import { recordCreditPayment } from "@/lib/tuition";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    credits?: number;
    note?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const credits = Number(body.credits);

  if (!Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json(
      { error: "Payment must add a positive number of credits." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const paymentResult = await recordCreditPayment(
    supabase,
    studentId,
    credits,
    typeof body.note === "string" ? body.note : "",
  );

  if (paymentResult.error) {
    return NextResponse.json({ error: paymentResult.error }, { status: 400 });
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
