import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateGradeLevel } from "./student-utils";
import {
  listStudentDocuments,
  type StudentDocument,
} from "./student-documents";
import { getStudentTuition, type StudentTuition } from "./tuition";

export type { StudentDocument } from "./student-documents";
export type { StudentTuition } from "./tuition";

export type StudentClassInfo = {
  id: number;
  subject: string;
  teacherName: string;
};

export type StudentAddress = {
  id?: number;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
};

export type StudentDetail = {
  id: number;
  firstname: string;
  lastname: string;
  dob: string;
  gradeLevel: number;
  averageGrade: number | null;
  avatarUrl: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  address: StudentAddress | null;
  classes: StudentClassInfo[];
  documents: StudentDocument[];
  absentDays: number;
  tuition: StudentTuition;
};

type EnrollmentRow = {
  class: number;
  classes: {
    id: number;
    class_subject: string;
    teachers: { firstname: string; lastname: string } | null;
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

async function countAbsentDays(
  supabase: SupabaseClient,
  studentId: number,
  classIds: number[],
): Promise<number> {
  if (classIds.length === 0) {
    return 0;
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("session")
    .select("id")
    .in("class", classIds);

  if (sessionsError || !sessions?.length) {
    return 0;
  }

  const sessionIds = sessions.map((session) => session.id);

  const { count: attendedCount, error: attendanceError } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("student", studentId)
    .in("session", sessionIds);

  if (attendanceError) {
    return 0;
  }

  return Math.max(0, sessionIds.length - (attendedCount ?? 0));
}

export async function getStudentDetail(
  supabase: SupabaseClient,
  studentId: number,
): Promise<{ detail: StudentDetail | null; error: string | null }> {
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, firstname, lastname, dob, average_grade, avatar_url, parent_name, parent_phone, parent_email",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return { detail: null, error: studentError.message };
  }

  if (!student) {
    return { detail: null, error: null };
  }

  const [enrollmentsResult, addressResult, documentsResult] = await Promise.all([
    supabase
      .from("enrollment")
      .select(
        "class, classes ( id, class_subject, teachers ( firstname, lastname ) )",
      )
      .eq("student", studentId),
    supabase
      .from("address")
      .select("id, street1, street2, city, state, zip")
      .eq("student", studentId)
      .maybeSingle(),
    listStudentDocuments(supabase, studentId),
  ]);

  if (enrollmentsResult.error) {
    return { detail: null, error: enrollmentsResult.error.message };
  }

  if (documentsResult.error) {
    return { detail: null, error: documentsResult.error };
  }

  const enrollmentRows = (enrollmentsResult.data ?? []) as unknown as EnrollmentRow[];
  const classIds = enrollmentRows
    .map((row) => row.classes?.id ?? row.class)
    .filter((id): id is number => Number.isFinite(id));

  const classes: StudentClassInfo[] = enrollmentRows
    .filter((row) => row.classes)
    .map((row) => ({
      id: row.classes!.id,
      subject: row.classes!.class_subject,
      teacherName: formatTeacherName(row.classes!.teachers),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  const absentDays = await countAbsentDays(supabase, studentId, classIds);
  const tuitionResult = await getStudentTuition(supabase, studentId);

  if (tuitionResult.error) {
    return { detail: null, error: tuitionResult.error };
  }

  return {
    detail: {
      id: student.id,
      firstname: student.firstname,
      lastname: student.lastname,
      dob: student.dob,
      gradeLevel: calculateGradeLevel(student.dob),
      averageGrade:
        typeof student.average_grade === "number" ? student.average_grade : null,
      avatarUrl:
        typeof student.avatar_url === "string" && student.avatar_url.trim()
          ? student.avatar_url
          : null,
      parentName:
        typeof student.parent_name === "string" ? student.parent_name : null,
      parentPhone:
        typeof student.parent_phone === "string" ? student.parent_phone : null,
      parentEmail:
        typeof student.parent_email === "string" ? student.parent_email : null,
      address: addressResult.error ? null : addressResult.data,
      classes,
      documents: documentsResult.documents,
      absentDays,
      tuition: tuitionResult.tuition,
    },
    error: addressResult.error?.message ?? null,
  };
}
