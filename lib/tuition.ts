import type { SupabaseClient } from "@supabase/supabase-js";

export type TuitionTransactionType = "attendance" | "payment" | "adjustment";

export type TuitionTransaction = {
  id: number;
  amount: number;
  transactionType: TuitionTransactionType;
  note: string | null;
  sessionId: number | null;
  createdAt: string;
};

export type TuitionLedgerEntry = {
  id: number;
  transactionType: TuitionTransactionType;
  primaryLabel: string;
  secondaryLabel: string;
  statusLabel: string;
  statusSuccess: boolean;
  credits: number;
  createdAt: string;
  note: string | null;
};

export type StudentTuition = {
  classCredits: number;
  sessionsAttended: number;
  studentName: string;
  transactions: TuitionLedgerEntry[];
};

type TuitionRow = {
  class_credits: number;
};

type TransactionRow = {
  id: number;
  amount: number;
  transaction_type: TuitionTransactionType;
  note: string | null;
  session: number | null;
  created_at: string;
};

type SessionClassRow = {
  id: number;
  classes: {
    class_subject: string;
    teachers: { firstname: string; lastname: string } | null;
  } | null;
};

type SessionClassInfo = {
  subject: string;
  teacherName: string;
};

const ATTENDANCE_CREDIT_COST = 1;

function formatTeacherName(
  teacher: { firstname: string; lastname: string } | null,
): string {
  if (!teacher) {
    return "Unassigned";
  }
  return `${teacher.firstname} ${teacher.lastname}`;
}

function formatTransactionTypeLabel(type: TuitionTransactionType): string {
  switch (type) {
    case "attendance":
      return "Class attendance";
    case "payment":
      return "Payment";
    case "adjustment":
      return "Adjustment";
  }
}

function mapToLedgerEntry(
  row: TransactionRow,
  studentName: string,
  sessionById: Map<number, SessionClassInfo>,
): TuitionLedgerEntry {
  if (row.transaction_type === "attendance") {
    const sessionInfo = row.session ? sessionById.get(row.session) : undefined;

    return {
      id: row.id,
      transactionType: row.transaction_type,
      primaryLabel: sessionInfo?.subject ?? "Unknown class",
      secondaryLabel: sessionInfo?.teacherName ?? "—",
      statusLabel: "Yes",
      statusSuccess: true,
      credits: parseCredits(row.amount),
      createdAt: row.created_at,
      note: row.note,
    };
  }

  return {
    id: row.id,
    transactionType: row.transaction_type,
    primaryLabel: formatTransactionTypeLabel(row.transaction_type),
    secondaryLabel: studentName,
    statusLabel: "Yes",
    statusSuccess: true,
    credits: parseCredits(row.amount),
    createdAt: row.created_at,
    note: row.note,
  };
}

function parseCredits(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

async function buildSessionClassMap(
  supabase: SupabaseClient,
  sessionIds: number[],
): Promise<{ sessionById: Map<number, SessionClassInfo>; error: string | null }> {
  const sessionById = new Map<number, SessionClassInfo>();

  if (sessionIds.length === 0) {
    return { sessionById, error: null };
  }

  const { data, error } = await supabase
    .from("session")
    .select("id, classes ( class_subject, teachers ( firstname, lastname ) )")
    .in("id", sessionIds);

  if (error) {
    return { sessionById, error: error.message };
  }

  for (const row of (data ?? []) as unknown as SessionClassRow[]) {
    sessionById.set(row.id, {
      subject: row.classes?.class_subject ?? "Unknown class",
      teacherName: formatTeacherName(row.classes?.teachers ?? null),
    });
  }

  return { sessionById, error: null };
}

export async function ensureTuitionAccount(
  supabase: SupabaseClient,
  studentId: number,
  startingCredits = 0,
): Promise<{ classCredits: number; error: string | null }> {
  const { data: existing, error: existingError } = await supabase
    .from("tuition")
    .select("class_credits")
    .eq("student", studentId)
    .maybeSingle();

  if (existingError) {
    return { classCredits: 0, error: existingError.message };
  }

  if (existing) {
    return { classCredits: parseCredits(existing.class_credits), error: null };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("tuition")
    .insert({
      student: studentId,
      class_credits: startingCredits,
    })
    .select("class_credits")
    .single();

  if (insertError) {
    return { classCredits: 0, error: insertError.message };
  }

  return {
    classCredits: parseCredits((inserted as TuitionRow).class_credits),
    error: null,
  };
}

async function updateClassCredits(
  supabase: SupabaseClient,
  studentId: number,
  nextCredits: number,
): Promise<string | null> {
  const { error } = await supabase
    .from("tuition")
    .update({ class_credits: nextCredits })
    .eq("student", studentId);

  return error?.message ?? null;
}

export async function recordAttendanceCreditUsage(
  supabase: SupabaseClient,
  studentId: number,
  sessionId: number,
): Promise<{ classCredits: number; error: string | null }> {
  const { data: existingUsage, error: existingUsageError } = await supabase
    .from("tuition_transaction")
    .select("id")
    .eq("student", studentId)
    .eq("session", sessionId)
    .eq("transaction_type", "attendance")
    .maybeSingle();

  if (existingUsageError) {
    return { classCredits: 0, error: existingUsageError.message };
  }

  if (existingUsage) {
    const account = await ensureTuitionAccount(supabase, studentId);
    return { classCredits: account.classCredits, error: account.error };
  }

  const account = await ensureTuitionAccount(supabase, studentId);
  if (account.error) {
    return { classCredits: 0, error: account.error };
  }

  const nextCredits = account.classCredits - ATTENDANCE_CREDIT_COST;

  const { error: transactionError } = await supabase.from("tuition_transaction").insert({
    student: studentId,
    amount: -ATTENDANCE_CREDIT_COST,
    transaction_type: "attendance",
    session: sessionId,
    note: "Class session attended",
  });

  if (transactionError) {
    return { classCredits: account.classCredits, error: transactionError.message };
  }

  const updateError = await updateClassCredits(supabase, studentId, nextCredits);
  if (updateError) {
    return { classCredits: account.classCredits, error: updateError };
  }

  return { classCredits: nextCredits, error: null };
}

export async function recordCreditPayment(
  supabase: SupabaseClient,
  studentId: number,
  credits: number,
  note: string,
): Promise<{ classCredits: number; error: string | null }> {
  if (!Number.isFinite(credits) || credits <= 0) {
    return { classCredits: 0, error: "Payment must add a positive number of credits." };
  }

  const account = await ensureTuitionAccount(supabase, studentId);
  if (account.error) {
    return { classCredits: 0, error: account.error };
  }

  const nextCredits = account.classCredits + credits;
  const trimmedNote = note.trim() || "Credit payment";

  const { error: transactionError } = await supabase.from("tuition_transaction").insert({
    student: studentId,
    amount: credits,
    transaction_type: "payment",
    note: trimmedNote,
  });

  if (transactionError) {
    return { classCredits: account.classCredits, error: transactionError.message };
  }

  const updateError = await updateClassCredits(supabase, studentId, nextCredits);
  if (updateError) {
    return { classCredits: account.classCredits, error: updateError };
  }

  return { classCredits: nextCredits, error: null };
}

export async function getTuitionCreditsForStudents(
  supabase: SupabaseClient,
  studentIds: number[],
): Promise<{ creditsByStudentId: Map<number, number>; error: string | null }> {
  const creditsByStudentId = new Map<number, number>();

  if (studentIds.length === 0) {
    return { creditsByStudentId, error: null };
  }

  const { data, error } = await supabase
    .from("tuition")
    .select("student, class_credits")
    .in("student", studentIds);

  if (error) {
    return { creditsByStudentId, error: error.message };
  }

  for (const row of data ?? []) {
    creditsByStudentId.set(row.student as number, parseCredits(row.class_credits));
  }

  for (const studentId of studentIds) {
    if (!creditsByStudentId.has(studentId)) {
      creditsByStudentId.set(studentId, 0);
    }
  }

  return { creditsByStudentId, error: null };
}

export async function getStudentTuition(
  supabase: SupabaseClient,
  studentId: number,
): Promise<{ tuition: StudentTuition; error: string | null }> {
  const [accountResult, attendanceResult, studentResult, transactionsResult] =
    await Promise.all([
      ensureTuitionAccount(supabase, studentId),
      supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("student", studentId),
      supabase
        .from("students")
        .select("firstname, lastname")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("tuition_transaction")
        .select("id, amount, transaction_type, note, session, created_at")
        .eq("student", studentId)
        .order("created_at", { ascending: false }),
    ]);

  const studentName = studentResult.data
    ? `${studentResult.data.firstname} ${studentResult.data.lastname}`.trim()
    : "Student";

  if (accountResult.error) {
    return {
      tuition: {
        classCredits: 0,
        sessionsAttended: 0,
        studentName,
        transactions: [],
      },
      error: accountResult.error,
    };
  }

  if (attendanceResult.error) {
    return {
      tuition: {
        classCredits: accountResult.classCredits,
        sessionsAttended: 0,
        studentName,
        transactions: [],
      },
      error: attendanceResult.error.message,
    };
  }

  if (studentResult.error) {
    return {
      tuition: {
        classCredits: accountResult.classCredits,
        sessionsAttended: attendanceResult.count ?? 0,
        studentName,
        transactions: [],
      },
      error: studentResult.error.message,
    };
  }

  if (transactionsResult.error) {
    return {
      tuition: {
        classCredits: accountResult.classCredits,
        sessionsAttended: attendanceResult.count ?? 0,
        studentName,
        transactions: [],
      },
      error: transactionsResult.error.message,
    };
  }

  const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];
  const sessionIds = [
    ...new Set(
      transactionRows
        .map((row) => row.session)
        .filter((sessionId): sessionId is number => Number.isFinite(sessionId)),
    ),
  ];

  const sessionMapResult = await buildSessionClassMap(supabase, sessionIds);

  if (sessionMapResult.error) {
    return {
      tuition: {
        classCredits: accountResult.classCredits,
        sessionsAttended: attendanceResult.count ?? 0,
        studentName,
        transactions: [],
      },
      error: sessionMapResult.error,
    };
  }

  return {
    tuition: {
      classCredits: accountResult.classCredits,
      sessionsAttended: attendanceResult.count ?? 0,
      studentName,
      transactions: transactionRows.map((row) =>
        mapToLedgerEntry(row, studentName, sessionMapResult.sessionById),
      ),
    },
    error: null,
  };
}

export function formatLedgerCredits(entry: TuitionLedgerEntry): {
  text: string;
  tone: "used" | "paid" | "neutral";
} {
  if (entry.transactionType === "attendance") {
    return {
      text: `${formatClassCredits(Math.abs(entry.credits))} used`,
      tone: "used",
    };
  }

  if (entry.transactionType === "payment") {
    return {
      text: `${formatClassCredits(entry.credits)} paid`,
      tone: "paid",
    };
  }

  return {
    text: formatTransactionAmount(entry.credits),
    tone: "neutral",
  };
}

export function formatClassCredits(credits: number): string {
  if (Number.isInteger(credits)) {
    return String(credits);
  }
  return credits.toFixed(1);
}

export function formatTransactionAmount(amount: number): string {
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatClassCredits(amount)}`;
}
