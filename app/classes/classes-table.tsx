"use client";

import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/catalyst/table";

type TeacherRef = {
  firstname: string;
  lastname: string;
};

type ClassRow = {
  id: number;
  class_subject: string;
  teacher: number;
  teachers: TeacherRef | TeacherRef[] | null;
};

type SearchFilters = {
  id: string;
  subject: string;
  teacher: string;
};

const headerClass =
  "bg-zinc-100 px-4 py-4 text-base/7 font-semibold text-zinc-950 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";
const idColClass = "min-w-[6rem] w-[6rem]";
const dataColClass = "min-w-0";
const cellClass =
  "px-4 py-5 text-base/7 text-zinc-600 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";

const columnGridClass = "grid grid-cols-[6rem_1fr_1fr]";

const searchInputClass =
  "w-full min-w-0 border-0 bg-transparent py-2.5 px-4 text-sm/6 text-zinc-900 placeholder:text-zinc-400 outline-hidden focus:ring-2 focus:ring-inset focus:ring-zinc-500/20";

const tableSectionClass =
  "overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-md ring-1 ring-zinc-300/60 [&_table]:border-collapse [&_table]:table-fixed [&_table]:text-zinc-600 [&_table]:dark:text-zinc-600 [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:nth-child(even)]:bg-zinc-50 [&_th]:border [&_td]:border [&_th]:border-zinc-300 [&_td]:border-zinc-300 [&_th]:text-zinc-950 [&_th]:dark:text-zinc-950";

function getTeacherRef(row: ClassRow): TeacherRef | null {
  if (!row.teachers) return null;
  if (Array.isArray(row.teachers)) return row.teachers[0] ?? null;
  return row.teachers;
}

function formatTeacherName(row: ClassRow): string {
  const teacher = getTeacherRef(row);
  if (!teacher) return `Teacher #${row.teacher}`;
  return `${teacher.firstname} ${teacher.lastname}`;
}

function matchesFilters(row: ClassRow, filters: SearchFilters): boolean {
  const id = filters.id.trim();
  const subject = filters.subject.trim().toLowerCase();
  const teacherQuery = filters.teacher.trim().toLowerCase();
  const teacher = getTeacherRef(row);
  const teacherName = teacher
    ? `${teacher.firstname} ${teacher.lastname}`.toLowerCase()
    : "";

  if (id && !String(row.id).startsWith(id)) return false;
  if (subject && !row.class_subject.toLowerCase().startsWith(subject)) {
    return false;
  }
  if (teacherQuery) {
    const idMatch = String(row.teacher).startsWith(teacherQuery);
    const nameMatch =
      teacherName.startsWith(teacherQuery) ||
      (teacher?.firstname.toLowerCase().startsWith(teacherQuery) ?? false) ||
      (teacher?.lastname.toLowerCase().startsWith(teacherQuery) ?? false);
    if (!idMatch && !nameMatch) return false;
  }

  return true;
}

export function ClassesTable() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    id: "",
    subject: "",
    teacher: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = useMemo(
    () => classes.filter((row) => matchesFilters(row, filters)),
    [classes, filters],
  );

  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch("/api/classes");

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to fetch classes");
        }

        const data: ClassRow[] = await response.json();
        setClasses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch classes");
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, []);

  function updateFilter(field: keyof SearchFilters, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return <p className="text-base text-zinc-500">Loading classes…</p>;
  }

  if (error) {
    return <p className="text-base text-red-600">{error}</p>;
  }

  if (classes.length === 0) {
    return <p className="text-base text-zinc-500">No classes found.</p>;
  }

  return (
    <div className="space-y-4">
      <section aria-label="Search classes">
        <div className="mb-2 flex items-center gap-2 text-sm/6 font-semibold text-zinc-700">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-zinc-500"
          />
          <span>Search classes</span>
        </div>
        <div
          className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm ring-1 ring-zinc-300/60"
        >
          <div className={`${columnGridClass} divide-x divide-zinc-300`}>
            <div className="min-w-0">
              <label htmlFor="search-class-id" className="sr-only">
                Search ID
              </label>
              <input
                id="search-class-id"
                type="search"
                value={filters.id}
                onChange={(e) => updateFilter("id", e.target.value)}
                placeholder="ID"
                className={searchInputClass}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="search-class-subject" className="sr-only">
                Search subject
              </label>
              <input
                id="search-class-subject"
                type="search"
                value={filters.subject}
                onChange={(e) => updateFilter("subject", e.target.value)}
                placeholder="Subject"
                className={searchInputClass}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="search-class-teacher" className="sr-only">
                Search teacher
              </label>
              <input
                id="search-class-teacher"
                type="search"
                value={filters.teacher}
                onChange={(e) => updateFilter("teacher", e.target.value)}
                placeholder="Teacher"
                className={searchInputClass}
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Classes table" className={tableSectionClass}>
        <Table grid bleed className="whitespace-normal">
          <colgroup>
            <col className="w-[6rem]" />
            <col />
            <col />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableHeader className={`${headerClass} ${idColClass}`}>
                ID
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                Subject
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                Teacher
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredClasses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className={`${cellClass} text-center text-zinc-500`}
                >
                  No classes match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredClasses.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className={`${cellClass} ${idColClass}`}>
                    {row.id}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {row.class_subject}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {formatTeacherName(row)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
