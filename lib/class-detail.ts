import type { SupabaseClient } from "@supabase/supabase-js";
import { getTuitionCreditsForStudents } from "./tuition";

export type EnrolledStudent = {
  id: number;
  firstname: string;
  lastname: string;
  classCredits: number;
};

export type ClassDetail = {
  id: number;
  subject: string;
  teacherId: number;
  teacherName: string;
  students: EnrolledStudent[];
};

type EnrollmentRow = {
  student: number;
  students: {
    id: number;
    firstname: string;
    lastname: string;
  } | null;
};

function formatTeacherName(
  teacher: { firstname: string; lastname: string } | null,
): string {
  if (!teacher) {
    return "Unassigned";
  }
  return `${teacher.firstname} ${teacher.lastname}`;
}

export async function getClassDetail(
  supabase: SupabaseClient,
  classId: number,
): Promise<{ detail: ClassDetail | null; error: string | null }> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, class_subject, teacher, teachers ( firstname, lastname )")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    return { detail: null, error: classError.message };
  }

  if (!classRow) {
    return { detail: null, error: null };
  }

  const teacher = Array.isArray(classRow.teachers)
    ? (classRow.teachers[0] ?? null)
    : classRow.teachers;

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollment")
    .select("student, students ( id, firstname, lastname )")
    .eq("class", classId);

  if (enrollmentError) {
    return { detail: null, error: enrollmentError.message };
  }

  const studentIds = ((enrollmentRows ?? []) as unknown as EnrollmentRow[])
    .filter((row) => row.students)
    .map((row) => row.students!.id);

  const creditsResult = await getTuitionCreditsForStudents(supabase, studentIds);

  if (creditsResult.error) {
    return { detail: null, error: creditsResult.error };
  }

  const students: EnrolledStudent[] = ((enrollmentRows ?? []) as unknown as EnrollmentRow[])
    .filter((row) => row.students)
    .map((row) => ({
      id: row.students!.id,
      firstname: row.students!.firstname,
      lastname: row.students!.lastname,
      classCredits: creditsResult.creditsByStudentId.get(row.students!.id) ?? 0,
    }))
    .sort((a, b) => {
      const last = a.lastname.localeCompare(b.lastname);
      if (last !== 0) {
        return last;
      }
      return a.firstname.localeCompare(b.firstname);
    });

  return {
    detail: {
      id: classRow.id,
      subject: classRow.class_subject,
      teacherId: classRow.teacher,
      teacherName: formatTeacherName(teacher),
      students,
    },
    error: null,
  };
}
