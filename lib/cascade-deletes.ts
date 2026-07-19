import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteAllStudentDocuments } from "./student-documents";

export async function deleteClassWithDependencies(
  supabase: SupabaseClient,
  classId: number,
): Promise<string | null> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("session")
    .select("id")
    .eq("class", classId);

  if (sessionsError) return sessionsError.message;

  const sessionIds = (sessions ?? []).map((session) => session.id as number);

  if (sessionIds.length > 0) {
    const { data: homework, error: homeworkError } = await supabase
      .from("homework")
      .select("id")
      .in("session", sessionIds);

    if (homeworkError) return homeworkError.message;

    const homeworkIds = (homework ?? []).map((row) => row.id as number);

    if (homeworkIds.length > 0) {
      const { error } = await supabase
        .from("hw_submission")
        .delete()
        .in("homework", homeworkIds);

      if (error) return error.message;
    }

    const { error: attendanceError } = await supabase
      .from("attendance")
      .delete()
      .in("session", sessionIds);

    if (attendanceError) return attendanceError.message;

    const { error: homeworkDeleteError } = await supabase
      .from("homework")
      .delete()
      .in("session", sessionIds);

    if (homeworkDeleteError) return homeworkDeleteError.message;
  }

  const { error: sessionDeleteError } = await supabase
    .from("session")
    .delete()
    .eq("class", classId);

  if (sessionDeleteError) return sessionDeleteError.message;

  const { error: enrollmentError } = await supabase
    .from("enrollment")
    .delete()
    .eq("class", classId);

  if (enrollmentError) return enrollmentError.message;

  const { error: classError } = await supabase.from("classes").delete().eq("id", classId);

  if (classError) return classError.message;

  return null;
}

export async function deleteTeacherWithDependencies(
  supabase: SupabaseClient,
  teacherId: number,
): Promise<string | null> {
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher", teacherId);

  if (classesError) return classesError.message;

  for (const row of classes ?? []) {
    const error = await deleteClassWithDependencies(
      supabase,
      row.id as number,
    );

    if (error) return error;
  }

  const { error } = await supabase.from("teachers").delete().eq("id", teacherId);

  return error?.message ?? null;
}

const STUDENT_DEPENDENT_TABLES = [
  "tuition_transaction",
  "tuition",
  "hw_submission",
  "attendance",
  "enrollment",
  "address",
] as const;

export async function deleteStudentWithDependencies(
  supabase: SupabaseClient,
  studentId: number,
): Promise<string | null> {
  const { error: documentsError } = await deleteAllStudentDocuments(
    supabase,
    studentId,
  );
  if (documentsError) {
    return documentsError;
  }

  for (const table of STUDENT_DEPENDENT_TABLES) {
    const { error } = await supabase.from(table).delete().eq("student", studentId);

    if (error) return error.message;
  }

  const { error } = await supabase.from("students").delete().eq("id", studentId);

  return error?.message ?? null;
}
