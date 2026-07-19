import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/student-detail";
import { createAdminClient } from "@/lib/supabase";
import {
  StudentDetailForm,
  type ClassOption,
} from "./student-detail-form";

type ClassRow = {
  id: number;
  class_subject: string;
  teacher: number | null;
  teachers: { firstname: string; lastname: string } | null;
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const studentId = Number.parseInt(id, 10);

  if (!Number.isFinite(studentId)) {
    notFound();
  }

  const supabase = createAdminClient();
  const [{ detail, error }, classesResult] = await Promise.all([
    getStudentDetail(supabase, studentId),
    supabase
      .from("classes")
      .select("id, class_subject, teacher, teachers ( firstname, lastname )")
      .order("class_subject"),
  ]);

  if (error) {
    throw new Error(error);
  }

  if (!detail) {
    notFound();
  }

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }

  const allClasses: ClassOption[] = (
    (classesResult.data ?? []) as unknown as ClassRow[]
  ).map(
    (cls) => ({
      id: cls.id,
      subject: cls.class_subject,
      teacherId: cls.teacher,
      teacherFirstname: cls.teachers?.firstname ?? "",
      teacherLastname: cls.teachers?.lastname ?? "",
      teacherName: cls.teachers
        ? `${cls.teachers.firstname} ${cls.teachers.lastname}`
        : "Unassigned",
    }),
  );

  return <StudentDetailForm initialDetail={detail} allClasses={allClasses} />;
}
