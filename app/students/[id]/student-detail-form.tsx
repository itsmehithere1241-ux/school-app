"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/20/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/app/components/catalyst/alert";
import { Button } from "@/app/components/catalyst/button";
import { Heading } from "@/app/components/catalyst/heading";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "@/app/components/catalyst/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/catalyst/table";
import type { StudentDetail } from "@/lib/student-detail";
import { filterPanelSearch, matchesClassSearch } from "@/lib/table-search";
import { formatGradeLevel } from "@/lib/student-utils";
import {
  formatClassCredits,
  formatLedgerCredits,
} from "@/lib/tuition";

export type ClassOption = {
  id: number;
  subject: string;
  teacherId: number | null;
  teacherFirstname: string;
  teacherLastname: string;
  teacherName: string;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-zinc-700 sm:text-sm/6";

const DEFAULT_TRANSACTION_PAGE_SIZE = 10;
const MIN_TRANSACTION_PAGE_SIZE = 5;
const MAX_TRANSACTION_PAGE_SIZE = 30;

function clampTransactionPageSize(value: number): number {
  return Math.min(MAX_TRANSACTION_PAGE_SIZE, Math.max(MIN_TRANSACTION_PAGE_SIZE, value));
}

const tuitionHeaderClass =
  "bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 first:pl-4 last:pr-4";
const tuitionCellClass =
  "px-4 py-4 text-sm text-zinc-600 first:pl-4 last:pr-4 align-top";
const tuitionTableSectionClass =
  "overflow-hidden rounded-lg border border-zinc-300 bg-white [&_table]:border-collapse [&_table]:w-full [&_th]:border [&_td]:border [&_th]:border-zinc-300 [&_td]:border-zinc-300 [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:nth-child(even)]:bg-zinc-50";

type Props = {
  initialDetail: StudentDetail;
  allClasses: ClassOption[];
};

export function StudentDetailForm({ initialDetail, allClasses }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState(initialDetail);
  const [firstname, setFirstname] = useState(initialDetail.firstname);
  const [lastname, setLastname] = useState(initialDetail.lastname);
  const [dob, setDob] = useState(initialDetail.dob);
  const [averageGrade, setAverageGrade] = useState(
    initialDetail.averageGrade?.toString() ?? "",
  );
  const [parentName, setParentName] = useState(initialDetail.parentName ?? "");
  const [parentPhone, setParentPhone] = useState(initialDetail.parentPhone ?? "");
  const [parentEmail, setParentEmail] = useState(initialDetail.parentEmail ?? "");
  const [street1, setStreet1] = useState(initialDetail.address?.street1 ?? "");
  const [street2, setStreet2] = useState(initialDetail.address?.street2 ?? "");
  const [city, setCity] = useState(initialDetail.address?.city ?? "");
  const [state, setState] = useState(initialDetail.address?.state ?? "");
  const [zip, setZip] = useState(initialDetail.address?.zip ?? "");
  const [enrolledClassIds, setEnrolledClassIds] = useState<number[]>(
    initialDetail.classes.map((cls) => cls.id),
  );
  const [classToRemove, setClassToRemove] = useState<ClassOption | null>(null);
  const [showAddClassesPanel, setShowAddClassesPanel] = useState(false);
  const [addClassSearchQuery, setAddClassSearchQuery] = useState("");
  const [classesToAdd, setClassesToAdd] = useState<number[]>([]);
  const [creditPayment, setCreditPayment] = useState("");
  const [creditPaymentNote, setCreditPaymentNote] = useState("");
  const [tuitionPaymentMessage, setTuitionPaymentMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPayingCredits, setIsPayingCredits] = useState(false);
  const [transactionPageSize, setTransactionPageSize] = useState(
    DEFAULT_TRANSACTION_PAGE_SIZE,
  );
  const [transactionPageSizeInput, setTransactionPageSizeInput] = useState(
    String(DEFAULT_TRANSACTION_PAGE_SIZE),
  );
  const [transactionPage, setTransactionPage] = useState(1);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveClassesConfirm, setShowRemoveClassesConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fullName = `${firstname} ${lastname}`.trim() || "Student";
  const gradeLevel = dob ? formatGradeLevel(dob) : "—";
  const classCredits = detail.tuition.classCredits;
  const creditsDisplayClass =
    classCredits < 0 ? "text-red-700" : "text-zinc-900";

  const transactionTotalPages = Math.max(
    1,
    Math.ceil(detail.tuition.transactions.length / transactionPageSize),
  );
  const safeTransactionPage = Math.min(transactionPage, transactionTotalPages);

  const paginatedTransactions = useMemo(
    () =>
      detail.tuition.transactions.slice(
        (safeTransactionPage - 1) * transactionPageSize,
        safeTransactionPage * transactionPageSize,
      ),
    [detail.tuition.transactions, safeTransactionPage, transactionPageSize],
  );

  useEffect(() => {
    setTransactionPage(1);
  }, [detail.tuition.transactions.length, transactionPageSize]);

  useEffect(() => {
    setTransactionPage((page) => Math.min(page, transactionTotalPages));
  }, [transactionTotalPages]);

  function handleTransactionPageSizeInputChange(value: string) {
    setTransactionPageSizeInput(value);
  }

  function commitTransactionPageSize() {
    const parsed = Number.parseInt(transactionPageSizeInput.trim(), 10);

    if (!Number.isFinite(parsed)) {
      setTransactionPageSizeInput(String(transactionPageSize));
      return;
    }

    const clamped = clampTransactionPageSize(parsed);
    setTransactionPageSize(clamped);
    setTransactionPageSizeInput(String(clamped));
    setTransactionPage(1);
  }

  function formatLedgerDate(isoDate: string): string {
    return new Date(isoDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const enrolledClasses = useMemo(
    () =>
      allClasses
        .filter((cls) => enrolledClassIds.includes(cls.id))
        .sort((a, b) => a.subject.localeCompare(b.subject)),
    [allClasses, enrolledClassIds],
  );

  const availableClasses = useMemo(
    () =>
      allClasses
        .filter((cls) => !enrolledClassIds.includes(cls.id))
        .sort((a, b) => a.subject.localeCompare(b.subject)),
    [allClasses, enrolledClassIds],
  );

  const filteredAvailableClasses = useMemo(
    () =>
      filterPanelSearch(availableClasses, addClassSearchQuery, (cls, query) =>
        matchesClassSearch(
          {
            id: cls.id,
            subject: cls.subject,
            teacherId: cls.teacherId,
            teacherFirstname: cls.teacherFirstname,
            teacherLastname: cls.teacherLastname,
          },
          query,
        ),
      ),
    [availableClasses, addClassSearchQuery],
  );

  function openRemoveClassConfirm(cls: ClassOption) {
    setClassToRemove(cls);
    setShowRemoveClassesConfirm(true);
  }

  function confirmRemoveClass() {
    if (!classToRemove) {
      return;
    }

    setEnrolledClassIds((prev) => prev.filter((id) => id !== classToRemove.id));
    setClassToRemove(null);
    setShowRemoveClassesConfirm(false);
  }

  function toggleClassToAdd(classId: number) {
    setClassesToAdd((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  }

  function addSelectedClasses() {
    if (classesToAdd.length === 0) {
      return;
    }

    setEnrolledClassIds((prev) => [...new Set([...prev, ...classesToAdd])]);
    setClassesToAdd([]);
    setAddClassSearchQuery("");
    setShowAddClassesPanel(false);
  }

  async function handlePayCredits() {
    setTuitionPaymentMessage(null);

    const parsedCreditPayment =
      creditPayment.trim() === "" ? null : Number.parseFloat(creditPayment);

    if (
      parsedCreditPayment === null ||
      Number.isNaN(parsedCreditPayment) ||
      parsedCreditPayment <= 0
    ) {
      setTuitionPaymentMessage({
        type: "error",
        text: "Enter a positive number of credits to pay.",
      });
      return;
    }

    setIsPayingCredits(true);

    try {
      const response = await fetch(`/api/students/${detail.id}/tuition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: parsedCreditPayment,
          note: creditPaymentNote,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to record payment.");
      }

      setDetail(body);
      setCreditPayment("");
      setCreditPaymentNote("");
      setTransactionPage(1);
      setTuitionPaymentMessage({
        type: "success",
        text: `${formatClassCredits(parsedCreditPayment)} credits paid successfully.`,
      });
      router.refresh();
    } catch (err) {
      setTuitionPaymentMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to record payment.",
      });
    } finally {
      setIsPayingCredits(false);
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);

    const parsedAverage =
      averageGrade.trim() === "" ? null : Number.parseFloat(averageGrade);

    if (parsedAverage !== null && Number.isNaN(parsedAverage)) {
      setSaveMessage({ type: "error", text: "Average grade must be a number." });
      setIsSaving(false);
      return;
    }

    const hasAddressInput =
      street1.trim() ||
      street2.trim() ||
      city.trim() ||
      state.trim() ||
      zip.trim();

    try {
      const response = await fetch(`/api/students/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname,
          lastname,
          dob,
          averageGrade: parsedAverage,
          parentName,
          parentPhone,
          parentEmail,
          classIds: enrolledClassIds,
          address: hasAddressInput
            ? {
                id: detail.address?.id,
                street1,
                street2: street2.trim() || null,
                city,
                state,
                zip,
              }
            : null,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to save student.");
      }

      setDetail(body);
      setFirstname(body.firstname);
      setLastname(body.lastname);
      setDob(body.dob);
      setAverageGrade(
        body.averageGrade === null ? "" : String(body.averageGrade),
      );
      setParentName(body.parentName ?? "");
      setParentPhone(body.parentPhone ?? "");
      setParentEmail(body.parentEmail ?? "");
      setStreet1(body.address?.street1 ?? "");
      setStreet2(body.address?.street2 ?? "");
      setCity(body.address?.city ?? "");
      setState(body.address?.state ?? "");
      setZip(body.address?.zip ?? "");
      setEnrolledClassIds(body.classes.map((cls: { id: number }) => cls.id));
      setClassToRemove(null);
      setClassesToAdd([]);
      setAddClassSearchQuery("");
      setShowAddClassesPanel(false);
      setSaveMessage({ type: "success", text: "Student information saved." });
      router.refresh();
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to save student.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/students/${detail.id}`, {
        method: "DELETE",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to delete student.");
      }

      router.push("/students");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete student.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl text-left">
      <Link
        href="/students"
        className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
      >
        ← Back to students
      </Link>

      <header className="mt-4 mb-8">
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          {fullName}
        </Heading>
        <p className="mt-2 text-sm text-zinc-600">Student ID: {detail.id}</p>
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
          <h2 className="text-base font-semibold text-zinc-950">
            Student information
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium text-zinc-700">
                First name
              </label>
              <input
                id="firstname"
                type="text"
                required
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium text-zinc-700">
                Last name
              </label>
              <input
                id="lastname"
                type="text"
                required
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-zinc-500">Full name</p>
              <p className="mt-1 text-sm text-zinc-900">{fullName}</p>
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-zinc-700">
                Date of birth
              </label>
              <input
                id="dob"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Grade level</p>
              <p className="mt-2 text-sm text-zinc-900">{gradeLevel}</p>
            </div>
            <div>
              <label htmlFor="average-grade" className="block text-sm font-medium text-zinc-700">
                Average grade (%)
              </label>
              <input
                id="average-grade"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={averageGrade}
                onChange={(e) => setAverageGrade(e.target.value)}
                placeholder="Not recorded"
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Absent days</p>
              <p className="mt-2 text-sm text-zinc-900">{detail.absentDays}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Classes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Enrolled classes are saved to the enrollment table when you click Save
            changes.
          </p>

          {enrolledClasses.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              This student is not enrolled in any classes.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
              {enrolledClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-stretch border-b border-zinc-200 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="text-sm font-medium text-zinc-900">
                      {cls.subject}
                    </span>
                    <span className="text-sm text-zinc-600">
                      Teacher: {cls.teacherName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRemoveClassConfirm(cls)}
                    aria-label={`Remove ${cls.subject}`}
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
                setShowAddClassesPanel((open) => {
                  if (open) {
                    setClassesToAdd([]);
                    setAddClassSearchQuery("");
                  }
                  return !open;
                });
              }}
              className="inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {showAddClassesPanel ? "Cancel adding classes" : "Add classes"}
            </button>

            {showAddClassesPanel && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-700">
                  Search for classes to add
                </p>
                {availableClasses.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">
                    This student is already enrolled in all available classes.
                  </p>
                ) : (
                  <>
                    <label htmlFor="add-class-search" className="sr-only">
                      Search classes by subject or teacher
                    </label>
                    <input
                      id="add-class-search"
                      type="search"
                      value={addClassSearchQuery}
                      onChange={(e) => setAddClassSearchQuery(e.target.value)}
                      placeholder="Search by subject or teacher name…"
                      className={`mt-3 ${inputClassName}`}
                    />

                    {addClassSearchQuery.trim() === "" ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        Enter a subject or teacher name to see matching classes.
                      </p>
                    ) : filteredAvailableClasses.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500">
                        No classes match your search.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
                        {filteredAvailableClasses.map((cls) => (
                          <label
                            key={cls.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-zinc-50"
                          >
                            <input
                              type="checkbox"
                              checked={classesToAdd.includes(cls.id)}
                              onChange={() => toggleClassToAdd(cls.id)}
                              className="mt-1 size-4 rounded border-zinc-300"
                            />
                            <span>
                              <span className="block text-sm font-medium text-zinc-900">
                                {cls.subject}
                              </span>
                              <span className="block text-sm text-zinc-600">
                                Teacher: {cls.teacherName}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={addSelectedClasses}
                      disabled={classesToAdd.length === 0}
                      className="mt-3 inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      Add selected classes
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Tuition</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Class credits are deducted when a student attends a session. Credits
            may go negative until a payment is recorded.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-zinc-500">Class credits</p>
              <p className={`mt-2 text-sm font-semibold ${creditsDisplayClass}`}>
                {formatClassCredits(classCredits)}
                {classCredits < 0 ? " (balance owed)" : ""}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Sessions attended</p>
              <p className="mt-2 text-sm text-zinc-900">
                {detail.tuition.sessionsAttended}
              </p>
            </div>
            <div>
              <label
                htmlFor="credit-payment"
                className="block text-sm font-medium text-zinc-700"
              >
                Add credits (payment)
              </label>
              <input
                id="credit-payment"
                type="number"
                min={0}
                step={1}
                value={creditPayment}
                onChange={(e) => setCreditPayment(e.target.value)}
                placeholder="Credits to add"
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label
                htmlFor="credit-payment-note"
                className="block text-sm font-medium text-zinc-700"
              >
                Payment note
              </label>
              <input
                id="credit-payment-note"
                type="text"
                value={creditPaymentNote}
                onChange={(e) => setCreditPaymentNote(e.target.value)}
                placeholder="Optional note"
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handlePayCredits}
                disabled={isPayingCredits}
                className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {isPayingCredits ? "Processing payment…" : "Pay credits"}
              </button>
            </div>
          </div>

          {tuitionPaymentMessage && (
            <p
              className={
                tuitionPaymentMessage.type === "success"
                  ? "mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                  : "mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              }
            >
              {tuitionPaymentMessage.text}
            </p>
          )}

          <div className="mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Tuition transactions
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  All records from the tuition transaction ledger for this student.
                </p>
              </div>
              {detail.tuition.transactions.length > 0 && (
                <div className="sm:w-44">
                  <label
                    htmlFor="transaction-page-size"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Transactions per page
                  </label>
                  <input
                    id="transaction-page-size"
                    type="number"
                    min={MIN_TRANSACTION_PAGE_SIZE}
                    max={MAX_TRANSACTION_PAGE_SIZE}
                    step={1}
                    value={transactionPageSizeInput}
                    onChange={(e) =>
                      handleTransactionPageSizeInputChange(e.target.value)
                    }
                    onBlur={commitTransactionPageSize}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitTransactionPageSize();
                      }
                    }}
                    className={`mt-2 ${inputClassName}`}
                  />
                </div>
              )}
            </div>

            {detail.tuition.transactions.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No tuition transactions recorded yet.
              </p>
            ) : (
              <div className={`mt-4 ${tuitionTableSectionClass}`}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className={tuitionHeaderClass}>
                        Class / Type
                      </TableHeader>
                      <TableHeader className={tuitionHeaderClass}>
                        Teacher / For
                      </TableHeader>
                      <TableHeader className={tuitionHeaderClass}>
                        Attended / Successful
                      </TableHeader>
                      <TableHeader className={tuitionHeaderClass}>
                        Credits due / paid
                      </TableHeader>
                      <TableHeader className={tuitionHeaderClass}>Date</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedTransactions.map((entry) => {
                      const credits = formatLedgerCredits(entry);

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className={tuitionCellClass}>
                            <span className="font-medium text-zinc-900">
                              {entry.primaryLabel}
                            </span>
                            {entry.note && (
                              <p className="mt-1 text-xs text-zinc-500">{entry.note}</p>
                            )}
                          </TableCell>
                          <TableCell className={tuitionCellClass}>
                            {entry.secondaryLabel}
                          </TableCell>
                          <TableCell className={tuitionCellClass}>
                            <span
                              className={
                                entry.statusSuccess
                                  ? "font-medium text-green-700"
                                  : "font-medium text-red-700"
                              }
                            >
                              {entry.statusLabel}
                            </span>
                          </TableCell>
                          <TableCell className={tuitionCellClass}>
                            <span
                              className={
                                credits.tone === "used"
                                  ? "font-medium text-red-700"
                                  : credits.tone === "paid"
                                    ? "font-medium text-green-700"
                                    : "font-medium text-zinc-900"
                              }
                            >
                              {credits.text}
                            </span>
                          </TableCell>
                          <TableCell className={tuitionCellClass}>
                            {formatLedgerDate(entry.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <Pagination className="border-t border-zinc-300 px-4 py-4">
                  <PaginationPrevious
                    disabled={safeTransactionPage <= 1}
                    onClick={() => setTransactionPage((page) => page - 1)}
                  />
                  <div className="rounded-md border border-zinc-300 bg-white px-2 py-1 [&_button]:text-zinc-950 [&_button_span]:text-zinc-950">
                    <PaginationList className="!flex items-center gap-x-0.5">
                      {Array.from(
                        { length: transactionTotalPages },
                        (_, index) => index + 1,
                      ).map((page) => (
                        <PaginationPage
                          key={page}
                          current={page === safeTransactionPage}
                          onClick={() => setTransactionPage(page)}
                          className={
                            page === safeTransactionPage
                              ? "rounded bg-zinc-100 text-zinc-950 before:hidden"
                              : "text-zinc-950 before:hidden"
                          }
                        >
                          {page}
                        </PaginationPage>
                      ))}
                    </PaginationList>
                  </div>
                  <PaginationNext
                    disabled={safeTransactionPage >= transactionTotalPages}
                    onClick={() => setTransactionPage((page) => page + 1)}
                  />
                </Pagination>

                <p className="border-t border-zinc-200 px-4 py-2 text-sm text-zinc-500">
                  Showing{" "}
                  {(safeTransactionPage - 1) * transactionPageSize + 1}–
                  {Math.min(
                    safeTransactionPage * transactionPageSize,
                    detail.tuition.transactions.length,
                  )}{" "}
                  of {detail.tuition.transactions.length} transactions
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">
            Parent and contact
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="parent-name" className="block text-sm font-medium text-zinc-700">
                Parent name
              </label>
              <input
                id="parent-name"
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label htmlFor="parent-phone" className="block text-sm font-medium text-zinc-700">
                Phone
              </label>
              <input
                id="parent-phone"
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="parent-email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="parent-email"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-zinc-900">Address</h3>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="street1" className="block text-sm font-medium text-zinc-700">
                Street address
              </label>
              <input
                id="street1"
                type="text"
                value={street1}
                onChange={(e) => setStreet1(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="street2" className="block text-sm font-medium text-zinc-700">
                Street address line 2
              </label>
              <input
                id="street2"
                type="text"
                value={street2}
                onChange={(e) => setStreet2(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-zinc-700">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-zinc-700">
                State
              </label>
              <input
                id="state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-zinc-700">
                ZIP code
              </label>
              <input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={`mt-2 ${inputClassName}`}
              />
            </div>
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
            Delete student
          </button>
        </div>
      </form>

      <Alert
        open={showRemoveClassesConfirm}
        onClose={() => {
          setShowRemoveClassesConfirm(false);
          setClassToRemove(null);
        }}
      >
        <AlertTitle>Remove class</AlertTitle>
        <AlertDescription>
          Remove {classToRemove?.subject ?? "this class"} from {fullName}&apos;s
          enrollment?
          {classToRemove && (
            <span className="mt-2 block font-medium text-zinc-900">
              Teacher: {classToRemove.teacherName}
            </span>
          )}{" "}
          Click Save changes afterward to update the enrollment table.
        </AlertDescription>
        <AlertActions>
          <Button
            plain
            onClick={() => {
              setShowRemoveClassesConfirm(false);
              setClassToRemove(null);
            }}
          >
            Cancel
          </Button>
          <Button color="red" onClick={confirmRemoveClass}>
            Remove
          </Button>
        </AlertActions>
      </Alert>

      <Alert open={showDeleteConfirm} onClose={setShowDeleteConfirm}>
        <AlertTitle>Delete student</AlertTitle>
        <AlertDescription>
          Are you sure you want to delete {fullName}? This will permanently remove
          their enrollments, attendance, and related records.
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
