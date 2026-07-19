"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/20/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/catalyst/alert";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import type { ClassDetail, EnrolledStudent } from "@/lib/class-detail";
import {
  filterPanelSearch,
  matchesStudentSearch,
  matchesTeacherSearch,
} from "@/lib/table-search";
import { formatClassCredits } from "@/lib/tuition";

export type TeacherOption = {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
};

export type StudentOption = {
  id: number;
  firstname: string;
  lastname: string;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-zinc-700 sm:text-sm/6";

type Props = {
  initialDetail: ClassDetail;
  allTeachers: TeacherOption[];
  allStudents: StudentOption[];
};

function formatStudentName(student: EnrolledStudent | StudentOption): string {
  return `${student.firstname} ${student.lastname}`;
}

export function ClassDetailForm({
  initialDetail,
  allTeachers,
  allStudents,
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [subject, setSubject] = useState(initialDetail.subject);
  const [teacherId, setTeacherId] = useState(initialDetail.teacherId);
  const [showChangeTeacherPanel, setShowChangeTeacherPanel] = useState(false);
  const [changeTeacherSearchQuery, setChangeTeacherSearchQuery] = useState("");
  const [teacherToSelect, setTeacherToSelect] = useState<number | null>(null);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<number[]>(
    initialDetail.students.map((student) => student.id),
  );
  const [studentToRemove, setStudentToRemove] = useState<EnrolledStudent | null>(
    null,
  );
  const [showAddStudentsPanel, setShowAddStudentsPanel] = useState(false);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState("");
  const [studentsToAdd, setStudentsToAdd] = useState<number[]>([]);
  const [showRemoveStudentConfirm, setShowRemoveStudentConfirm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentTeacherName = useMemo(() => {
    const teacher = allTeachers.find((entry) => entry.id === teacherId);
    return teacher?.name ?? detail.teacherName;
  }, [allTeachers, teacherId, detail.teacherName]);

  const filteredTeachers = useMemo(
    () =>
      filterPanelSearch(allTeachers, changeTeacherSearchQuery, (teacher, query) =>
        matchesTeacherSearch(
          {
            id: teacher.id,
            firstname: teacher.firstname,
            lastname: teacher.lastname,
          },
          query,
        ),
      ),
    [allTeachers, changeTeacherSearchQuery],
  );

  const creditsByStudentId = useMemo(() => {
    const map = new Map<number, number>();
    for (const student of detail.students) {
      map.set(student.id, student.classCredits);
    }
    return map;
  }, [detail.students]);

  const enrolledStudents = useMemo(
    () =>
      allStudents
        .filter((student) => enrolledStudentIds.includes(student.id))
        .map((student) => ({
          ...student,
          classCredits: creditsByStudentId.get(student.id) ?? 0,
        }))
        .sort((a, b) => formatStudentName(a).localeCompare(formatStudentName(b))),
    [allStudents, enrolledStudentIds, creditsByStudentId],
  );

  const availableStudents = useMemo(
    () =>
      allStudents
        .filter((student) => !enrolledStudentIds.includes(student.id))
        .sort((a, b) => formatStudentName(a).localeCompare(formatStudentName(b))),
    [allStudents, enrolledStudentIds],
  );

  const filteredAvailableStudents = useMemo(
    () =>
      filterPanelSearch(availableStudents, addStudentSearchQuery, (student, query) =>
        matchesStudentSearch(
          {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
          },
          query,
        ),
      ),
    [availableStudents, addStudentSearchQuery],
  );

  function openRemoveStudentConfirm(student: EnrolledStudent) {
    setStudentToRemove(student);
    setShowRemoveStudentConfirm(true);
  }

  function confirmRemoveStudent() {
    if (!studentToRemove) {
      return;
    }

    setEnrolledStudentIds((prev) =>
      prev.filter((id) => id !== studentToRemove.id),
    );
    setStudentToRemove(null);
    setShowRemoveStudentConfirm(false);
  }

  function toggleStudentToAdd(studentId: number) {
    setStudentsToAdd((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  }

  function addSelectedStudents() {
    if (studentsToAdd.length === 0) {
      return;
    }

    setEnrolledStudentIds((prev) => [...new Set([...prev, ...studentsToAdd])]);
    setStudentsToAdd([]);
    setAddStudentSearchQuery("");
    setShowAddStudentsPanel(false);
  }

  function applySelectedTeacher() {
    if (teacherToSelect === null) {
      return;
    }

    setTeacherId(teacherToSelect);
    setTeacherToSelect(null);
    setChangeTeacherSearchQuery("");
    setShowChangeTeacherPanel(false);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);

    const parsedTeacherId = teacherId;

    if (!Number.isFinite(parsedTeacherId)) {
      setSaveMessage({ type: "error", text: "Please select a teacher." });
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/classes/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          teacherId: parsedTeacherId,
          studentIds: enrolledStudentIds,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to save class.");
      }

      setDetail(body);
      setSubject(body.subject);
      setTeacherId(body.teacherId);
      setEnrolledStudentIds(body.students.map((student: EnrolledStudent) => student.id));
      setSaveMessage({ type: "success", text: "Class information saved." });
      router.refresh();
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to save class.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/classes/${detail.id}`, {
        method: "DELETE",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to delete class.");
      }

      router.push("/classes");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete class.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl text-left">
      <Link
        href="/classes"
        className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
      >
        ← Back to classes
      </Link>

      <header className="mt-4 mb-8">
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          {subject || "Class"}
        </Heading>
        <p className="mt-2 text-sm text-zinc-600">Class ID: {detail.id}</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {saveMessage && (
          <p
            className={
              saveMessage.type === "success"
                ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {saveMessage.text}
          </p>
        )}

        <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Class information</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Subject and teacher are saved to the classes table.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="class-subject" className="block text-sm font-medium text-zinc-700">
                Subject
              </label>
              <input
                id="class-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="block text-sm font-medium text-zinc-700">Teacher</p>
              <p className="mt-2 text-sm font-medium text-zinc-900">
                {currentTeacherName}
              </p>

              <div className="mt-6 border-t border-zinc-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeTeacherPanel((open) => {
                      if (open) {
                        setTeacherToSelect(null);
                        setChangeTeacherSearchQuery("");
                      }
                      return !open;
                    });
                  }}
                  className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  {showChangeTeacherPanel ? "Cancel changing teacher" : "Change teacher"}
                </button>

                {showChangeTeacherPanel && (
                  <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium text-zinc-700">
                      Search for a teacher
                    </p>
                    {allTeachers.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        No teachers are available.
                      </p>
                    ) : (
                      <>
                        <label htmlFor="change-teacher-search" className="sr-only">
                          Search teachers by name
                        </label>
                        <input
                          id="change-teacher-search"
                          type="search"
                          value={changeTeacherSearchQuery}
                          onChange={(e) => setChangeTeacherSearchQuery(e.target.value)}
                          placeholder="Search by teacher name…"
                          className={`mt-3 ${inputClassName}`}
                        />

                        {changeTeacherSearchQuery.trim() === "" ? (
                          <p className="mt-3 text-sm text-zinc-500">
                            Enter a teacher name to see matching teachers.
                          </p>
                        ) : filteredTeachers.length === 0 ? (
                          <p className="mt-3 text-sm text-zinc-500">
                            No teachers match your search.
                          </p>
                        ) : (
                          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
                            {filteredTeachers.map((teacher) => (
                              <label
                                key={teacher.id}
                                className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-zinc-50"
                              >
                                <input
                                  type="radio"
                                  name="teacher-select"
                                  checked={teacherToSelect === teacher.id}
                                  onChange={() => setTeacherToSelect(teacher.id)}
                                  className="mt-1 size-4 border-zinc-300"
                                />
                                <span className="text-sm font-medium text-zinc-900">
                                  {teacher.name}
                                  {teacher.id === teacherId ? " (current)" : ""}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={applySelectedTeacher}
                          disabled={teacherToSelect === null}
                          className="mt-3 inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                          Select teacher
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Students</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Enrolled students are saved to the enrollment table when you click Save
            changes. Class credits are shown from each student&apos;s tuition account.
          </p>

          {enrolledStudents.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No students are enrolled in this class.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
              {enrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-stretch border-b border-zinc-200 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-zinc-700 hover:underline"
                    >
                      {formatStudentName(student)}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
                      <span>ID {student.id}</span>
                      <span
                        className={
                          student.classCredits < 0
                            ? "font-medium text-red-700"
                            : "text-zinc-600"
                        }
                      >
                        Credits: {formatClassCredits(student.classCredits)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRemoveStudentConfirm(student)}
                    aria-label={`Remove ${formatStudentName(student)}`}
                    className="inline-flex shrink-0 items-center justify-center border-l border-zinc-200 px-4 py-3 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                  >
                    <TrashIcon className="size-5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddStudentsPanel((open) => {
                  if (open) {
                    setStudentsToAdd([]);
                    setAddStudentSearchQuery("");
                  }
                  return !open;
                });
              }}
              className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {showAddStudentsPanel ? "Cancel adding students" : "Add students"}
            </button>

            {showAddStudentsPanel && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">
                  Search for students to add
                </p>
                {availableStudents.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">
                    Every student is already enrolled in this class.
                  </p>
                ) : (
                  <>
                    <label htmlFor="add-student-search" className="sr-only">
                      Search students by name or ID
                    </label>
                    <input
                      id="add-student-search"
                      type="search"
                      value={addStudentSearchQuery}
                      onChange={(e) => setAddStudentSearchQuery(e.target.value)}
                      placeholder="Search by student name or ID…"
                      className={`mt-3 ${inputClassName}`}
                    />

                    {addStudentSearchQuery.trim() === "" ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        Enter a student name or ID to see matching students.
                      </p>
                    ) : filteredAvailableStudents.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        No students match your search.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
                        {filteredAvailableStudents.map((student) => (
                          <label
                            key={student.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              checked={studentsToAdd.includes(student.id)}
                              onChange={() => toggleStudentToAdd(student.id)}
                              className="mt-1 size-4 rounded border-zinc-300"
                            />
                            <span>
                              <span className="block text-sm font-medium text-zinc-900">
                                {formatStudentName(student)}
                              </span>
                              <span className="block text-sm text-zinc-600">
                                ID {student.id}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addSelectedStudents}
                      disabled={studentsToAdd.length === 0}
                      className="mt-3 inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      Add selected students
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(true);
              setDeleteError(null);
            }}
            className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-300 hover:bg-red-50"
          >
            Delete class
          </button>
        </div>
      </form>

      <Alert
        open={showRemoveStudentConfirm}
        onClose={() => {
          setShowRemoveStudentConfirm(false);
          setStudentToRemove(null);
        }}
      >
        <AlertTitle>Remove student</AlertTitle>
        <AlertDescription>
          Remove {studentToRemove ? formatStudentName(studentToRemove) : "this student"}{" "}
          from {subject || "this class"}? Click Save changes afterward to update the
          enrollment table.
        </AlertDescription>
        <AlertActions>
          <Button
            plain
            onClick={() => {
              setShowRemoveStudentConfirm(false);
              setStudentToRemove(null);
            }}
          >
            Cancel
          </Button>
          <Button color="red" onClick={confirmRemoveStudent}>
            Remove
          </Button>
        </AlertActions>
      </Alert>

      <Alert open={showDeleteConfirm} onClose={setShowDeleteConfirm}>
        <AlertTitle>Delete class</AlertTitle>
        <AlertDescription>
          Are you sure you want to delete {subject || "this class"}? This will
          permanently remove enrollments, sessions, and related records.
        </AlertDescription>
        {deleteError && (
          <p className="mt-3 text-sm text-red-600">{deleteError}</p>
        )}
        <AlertActions>
          <Button plain onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button color="red" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </AlertActions>
      </Alert>
    </div>
  );
}
