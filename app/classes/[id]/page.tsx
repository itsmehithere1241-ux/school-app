import { notFound } from "next/navigation";
import { getClassDetail } from "@/lib/class-detail";
import { createAdminClient } from "@/lib/supabase";
import {
  ClassDetailForm,
  type StudentOption,
  type TeacherOption,
} from "./class-detail-form";

type TeacherRow = {
  id: number;
  firstname: string;
  lastname: string;
};

type StudentRow = {
  id: number;
  firstname: string;
  lastname: string;
};

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = Number.parseInt(id, 10);

  if (!Number.isFinite(classId)) {
    notFound();
  }

  const supabase = createAdminClient();
  const [classResult, teachersResult, studentsResult] = await Promise.all([
    getClassDetail(supabase, classId),
    supabase
      .from("teachers")
      .select("id, firstname, lastname")
      .order("lastname")
      .order("firstname"),
    supabase
      .from("students")
      .select("id, firstname, lastname")
      .order("lastname")
      .order("firstname"),
  ]);

  if (classResult.error) {
    throw new Error(classResult.error);
  }

  if (!classResult.detail) {
    notFound();
  }

  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }

  const allTeachers: TeacherOption[] = ((teachersResult.data ?? []) as TeacherRow[]).map(
    (teacher) => ({
      id: teacher.id,
      name: `${teacher.firstname} ${teacher.lastname}`,
      firstname: teacher.firstname,
      lastname: teacher.lastname,
    }),
  );

  const allStudents: StudentOption[] = ((studentsResult.data ?? []) as StudentRow[]).map(
    (student) => ({
      id: student.id,
      firstname: student.firstname,
      lastname: student.lastname,
    }),
  );

  return (
    <ClassDetailForm
      initialDetail={classResult.detail}
      allTeachers={allTeachers}
      allStudents={allStudents}
    />
  );
}
