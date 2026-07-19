import type { SupabaseClient } from "@supabase/supabase-js";
import { getStudentDetail, type StudentAddress, type StudentDetail } from "./student-detail";

export type UpdateStudentPayload = {
  firstname: string;
  lastname: string;
  dob: string;
  averageGrade: number | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: StudentAddress | null;
  classIds: number[];
};

function parseAverageGrade(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, value));
}

export async function updateStudent(
  supabase: SupabaseClient,
  studentId: number,
  payload: UpdateStudentPayload,
): Promise<{ detail: StudentDetail | null; error: string | null }> {
  const firstname = payload.firstname.trim();
  const lastname = payload.lastname.trim();
  const dob = payload.dob.trim();

  if (!firstname || !lastname || !dob) {
    return { detail: null, error: "First name, last name, and date of birth are required." };
  }

  const { error: studentError } = await supabase
    .from("students")
    .update({
      firstname,
      lastname,
      dob,
      average_grade: parseAverageGrade(payload.averageGrade),
      parent_name: payload.parentName.trim() || null,
      parent_phone: payload.parentPhone.trim() || null,
      parent_email: payload.parentEmail.trim() || null,
    })
    .eq("id", studentId);

  if (studentError) {
    return { detail: null, error: studentError.message };
  }

  if (payload.address) {
    const addressPayload = {
      street1: payload.address.street1.trim(),
      street2: payload.address.street2?.trim() || null,
      city: payload.address.city.trim(),
      state: payload.address.state.trim(),
      zip: payload.address.zip.trim(),
      student: studentId,
    };

    if (
      !addressPayload.street1 ||
      !addressPayload.city ||
      !addressPayload.state ||
      !addressPayload.zip
    ) {
      return {
        detail: null,
        error: "Address requires street, city, state, and zip.",
      };
    }

    if (payload.address.id) {
      const { error: addressError } = await supabase
        .from("address")
        .update({
          street1: addressPayload.street1,
          street2: addressPayload.street2,
          city: addressPayload.city,
          state: addressPayload.state,
          zip: addressPayload.zip,
        })
        .eq("id", payload.address.id);

      if (addressError) {
        return { detail: null, error: addressError.message };
      }
    } else {
      const { error: addressError } = await supabase
        .from("address")
        .insert(addressPayload);

      if (addressError) {
        return { detail: null, error: addressError.message };
      }
    }
  }

  const { error: deleteEnrollmentError } = await supabase
    .from("enrollment")
    .delete()
    .eq("student", studentId);

  if (deleteEnrollmentError) {
    return { detail: null, error: deleteEnrollmentError.message };
  }

  if (payload.classIds.length > 0) {
    const uniqueClassIds = [...new Set(payload.classIds)];
    const { error: insertEnrollmentError } = await supabase.from("enrollment").insert(
      uniqueClassIds.map((classId) => ({
        student: studentId,
        class: classId,
      })),
    );

    if (insertEnrollmentError) {
      return { detail: null, error: insertEnrollmentError.message };
    }
  }

  return getStudentDetail(supabase, studentId);
}
