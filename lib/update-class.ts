import type { SupabaseClient } from "@supabase/supabase-js";
import { getClassDetail, type ClassDetail } from "./class-detail";

export type UpdateClassPayload = {
  subject: string;
  teacherId: number;
  studentIds: number[];
};

export async function updateClass(
  supabase: SupabaseClient,
  classId: number,
  payload: UpdateClassPayload,
): Promise<{ detail: ClassDetail | null; error: string | null }> {
  const subject = payload.subject.trim();

  if (!subject) {
    return { detail: null, error: "Class subject is required." };
  }

  if (!Number.isFinite(payload.teacherId)) {
    return { detail: null, error: "A teacher must be selected." };
  }

  const { error: classError } = await supabase
    .from("classes")
    .update({
      class_subject: subject,
      teacher: payload.teacherId,
    })
    .eq("id", classId);

  if (classError) {
    return { detail: null, error: classError.message };
  }

  const { error: deleteEnrollmentError } = await supabase
    .from("enrollment")
    .delete()
    .eq("class", classId);

  if (deleteEnrollmentError) {
    return { detail: null, error: deleteEnrollmentError.message };
  }

  const uniqueStudentIds = [...new Set(payload.studentIds)];

  if (uniqueStudentIds.length > 0) {
    const { error: insertEnrollmentError } = await supabase.from("enrollment").insert(
      uniqueStudentIds.map((studentId) => ({
        student: studentId,
        class: classId,
      })),
    );

    if (insertEnrollmentError) {
      return { detail: null, error: insertEnrollmentError.message };
    }
  }

  return getClassDetail(supabase, classId);
}
