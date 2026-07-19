"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/components/catalyst/alert";
import { Button } from "@/components/catalyst/button";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownHeading,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from "@/components/catalyst/dropdown";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "@/components/catalyst/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { matchesClassSearch } from "@/lib/table-search";

const PAGE_SIZE = 10;

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

type AlphaSort = "asc" | "desc" | "none";

type SortPreferences = {
  teacherName: AlphaSort;
  subject: AlphaSort;
};

const emptySortPreferences = (): SortPreferences => ({
  teacherName: "none",
  subject: "none",
});

const dropdownMenuClass =
  "min-w-64 !bg-white !backdrop-blur-none shadow-md ring-1 !ring-zinc-300 dark:!bg-white dark:!ring-zinc-300 [&_[data-slot=label]]:!text-zinc-950 dark:[&_[data-slot=label]]:!text-zinc-950 [&_button]:!text-zinc-950 dark:[&_button]:!text-zinc-950 [&_button]:data-focus:!bg-zinc-100 [&_button]:data-focus:!text-zinc-950 dark:[&_button]:data-focus:!bg-zinc-100 dark:[&_button]:data-focus:!text-zinc-950";

const dropdownItemClass =
  "!text-zinc-950 data-focus:!bg-zinc-100 data-focus:!text-zinc-950 dark:!text-zinc-950 dark:data-focus:!bg-zinc-100 dark:data-focus:!text-zinc-950";

const dropdownHeadingClass = "!text-zinc-950 dark:!text-zinc-950";

const toolbarDropdownButtonClass =
  "!items-center !text-zinc-950 dark:!text-zinc-950 [--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-950)] dark:data-hover:[--btn-icon:var(--color-zinc-950)] data-active:[--btn-icon:var(--color-zinc-950)] dark:data-active:[--btn-icon:var(--color-zinc-950)] *:data-[slot=icon]:!my-0 sm:*:data-[slot=icon]:!my-0";

const headerClass =
  "bg-zinc-100 px-4 py-4 text-base/7 font-semibold text-zinc-950 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";
const idColClass = "min-w-[6rem] w-[6rem]";
const dataColClass = "min-w-0";
const actionsColClass = "min-w-[7rem] w-[7rem]";
const cellClass =
  "px-4 py-5 text-base/7 text-zinc-600 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";

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

function getTeacherSortName(row: ClassRow): string {
  const teacher = getTeacherRef(row);
  if (!teacher) return `Teacher #${row.teacher}`;
  return `${teacher.firstname} ${teacher.lastname}`;
}

function formatSortSummary(sort: SortPreferences): string {
  const parts: string[] = [];

  if (sort.teacherName !== "none") {
    parts.push(
      `Teacher ${sort.teacherName === "asc" ? "A–Z" : "Z–A"}`,
    );
  }
  if (sort.subject !== "none") {
    parts.push(
      `Subject ${sort.subject === "asc" ? "A–Z" : "Z–A"}`,
    );
  }

  return parts.join(", ");
}

function isSortActive(sort: SortPreferences): boolean {
  return sort.teacherName !== "none" || sort.subject !== "none";
}

function matchesSearch(row: ClassRow, query: string): boolean {
  const teacher = getTeacherRef(row);

  return matchesClassSearch(
    {
      id: row.id,
      subject: row.class_subject,
      teacherId: row.teacher,
      teacherFirstname: teacher?.firstname,
      teacherLastname: teacher?.lastname,
    },
    query,
  );
}

function matchesSubjectFilter(row: ClassRow, subject: string | null): boolean {
  if (!subject) return true;
  return row.class_subject === subject;
}

function sortClasses(rows: ClassRow[], sort: SortPreferences): ClassRow[] {
  if (!isSortActive(sort)) return rows;

  const sorted = [...rows];
  const localeCompare = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base" });

  return sorted.sort((a, b) => {
    if (sort.teacherName !== "none") {
      const cmp = localeCompare(
        getTeacherSortName(a),
        getTeacherSortName(b),
      );
      if (cmp !== 0) {
        return sort.teacherName === "asc" ? cmp : -cmp;
      }
    }

    if (sort.subject !== "none") {
      const cmp = localeCompare(a.class_subject, b.class_subject);
      if (cmp !== 0) {
        return sort.subject === "asc" ? cmp : -cmp;
      }
    }

    return 0;
  });
}

function sortItemClass(isSelected: boolean): string {
  return `${dropdownItemClass}${isSelected ? " !bg-zinc-100" : ""}`;
}

function toggleSortPreference<K extends keyof SortPreferences>(
  key: K,
  value: Exclude<SortPreferences[K], "none">,
  prev: SortPreferences,
): SortPreferences {
  return {
    ...prev,
    [key]: prev[key] === value ? "none" : value,
  };
}

function toggleSubjectFilter(subject: string, current: string | null): string | null {
  return current === subject ? null : subject;
}

export function ClassesTable() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>(
    emptySortPreferences,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [classToDelete, setClassToDelete] = useState<ClassRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const uniqueSubjects = useMemo(
    () =>
      [...new Set(classes.map((row) => row.class_subject))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [classes],
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter(
        (row) =>
          matchesSearch(row, searchQuery) &&
          matchesSubjectFilter(row, subjectFilter),
      ),
    [classes, searchQuery, subjectFilter],
  );

  const sortedClasses = useMemo(
    () => sortClasses(filteredClasses, sortPreferences),
    [filteredClasses, sortPreferences],
  );

  const subjectFilterActive = subjectFilter !== null;
  const sortActive = isSortActive(sortPreferences);

  const totalPages = Math.max(1, Math.ceil(sortedClasses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedClasses = useMemo(
    () =>
      sortedClasses.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
      ),
    [sortedClasses, safePage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    subjectFilter,
    sortPreferences.teacherName,
    sortPreferences.subject,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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

  function openDeleteConfirm(row: ClassRow) {
    setDeleteError(null);
    setClassToDelete(row);
  }

  function closeDeleteConfirm() {
    if (isDeleting) return;
    setClassToDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!classToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/classes/${classToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete class");
      }

      setClasses((prev) => prev.filter((row) => row.id !== classToDelete.id));
      setClassToDelete(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete class",
      );
    } finally {
      setIsDeleting(false);
    }
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
      <Alert
        open={classToDelete !== null}
        onClose={closeDeleteConfirm}
        className="!bg-white dark:!bg-white"
      >
        <AlertTitle className="!text-zinc-950 dark:!text-zinc-950">
          Delete class?
        </AlertTitle>
        <AlertDescription className="!text-zinc-600 dark:!text-zinc-600">
          {classToDelete
            ? `Are you sure you want to delete ${classToDelete.class_subject}? Enrollments, sessions, attendance, homework, and all other related data for this class will also be removed. This action cannot be undone.`
            : ""}
        </AlertDescription>
        {deleteError && (
          <p className="mt-3 text-sm text-red-600">{deleteError}</p>
        )}
        <AlertActions>
          <Button
            plain
            disabled={isDeleting}
            onClick={closeDeleteConfirm}
            className="!text-zinc-950 dark:!text-zinc-950"
          >
            Cancel
          </Button>
          <Button color="red" disabled={isDeleting} onClick={confirmDelete}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </AlertActions>
      </Alert>

      <section aria-label="Search classes">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm/6 font-semibold text-zinc-700">
            Search classes
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {subjectFilterActive && (
              <span>Subject filter: {subjectFilter}</span>
            )}
            {sortActive && (
              <span>Sort: {formatSortSummary(sortPreferences)}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <div
            className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm ring-1 ring-zinc-300/60"
          >
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
            />
            <label htmlFor="search-classes" className="sr-only">
              Search by ID, subject, or teacher
            </label>
            <input
              id="search-classes"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, subject, or teacher name"
              className="block w-full border-0 bg-transparent py-3 pl-10 pr-4 text-sm/6 text-zinc-900 placeholder:text-zinc-400 outline-hidden focus:ring-2 focus:ring-inset focus:ring-zinc-500/20"
            />
          </div>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Filter classes by subject"
              className={`${toolbarDropdownButtonClass}${subjectFilterActive ? " ring-2 ring-zinc-400" : ""}`}
            >
              <FunnelIcon data-slot="icon" aria-hidden="true" />
              <span className="hidden sm:inline">Filter</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className={dropdownMenuClass}>
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Subject
                </DropdownHeading>
                {uniqueSubjects.map((subject) => (
                  <DropdownItem
                    key={subject}
                    className={sortItemClass(subjectFilter === subject)}
                    onClick={() =>
                      setSubjectFilter((prev) =>
                        toggleSubjectFilter(subject, prev),
                      )
                    }
                  >
                    {subject}
                  </DropdownItem>
                ))}
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownItem
                  className={dropdownItemClass}
                  onClick={() => setSubjectFilter(null)}
                >
                  Clear filter
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Sort classes"
              className={`${toolbarDropdownButtonClass}${sortActive ? " ring-2 ring-zinc-400" : ""}`}
            >
              <ArrowsUpDownIcon data-slot="icon" aria-hidden="true" />
              <span className="hidden sm:inline">Sort</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className={dropdownMenuClass}>
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Teacher name
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(sortPreferences.teacherName === "asc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("teacherName", "asc", prev),
                    )
                  }
                >
                  A → Z
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(sortPreferences.teacherName === "desc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("teacherName", "desc", prev),
                    )
                  }
                >
                  Z → A
                </DropdownItem>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Subject
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(sortPreferences.subject === "asc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("subject", "asc", prev),
                    )
                  }
                >
                  A → Z
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(sortPreferences.subject === "desc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("subject", "desc", prev),
                    )
                  }
                >
                  Z → A
                </DropdownItem>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownItem
                  className={dropdownItemClass}
                  onClick={() => setSortPreferences(emptySortPreferences())}
                >
                  Clear sort
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
        </div>
      </section>

      <section aria-label="Classes table" className={tableSectionClass}>
        <Table grid bleed className="whitespace-normal">
          <colgroup>
            <col className="w-[6rem]" />
            <col />
            <col />
            <col className="w-[7rem]" />
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
              <TableHeader className={`${headerClass} ${actionsColClass}`}>
                Actions
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedClasses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className={`${cellClass} text-center text-zinc-500`}
                >
                  No classes match your search or filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedClasses.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className={`${cellClass} ${idColClass}`}>
                    {row.id}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    <Link
                      href={`/classes/${row.id}`}
                      className="font-medium text-zinc-900 hover:text-zinc-700 hover:underline"
                    >
                      {row.class_subject}
                    </Link>
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {formatTeacherName(row)}
                  </TableCell>
                  <TableCell className={`${cellClass} ${actionsColClass}`}>
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/classes/${row.id}`}
                        aria-label={`Edit ${row.class_subject}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-500/30"
                      >
                        <PencilSquareIcon className="size-5" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(row)}
                        aria-label={`Delete ${row.class_subject}`}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 transition hover:bg-red-50 hover:text-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500/30"
                      >
                        <TrashIcon className="size-5" aria-hidden="true" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {sortedClasses.length > 0 && totalPages > 1 && (
          <Pagination className="border-t border-zinc-300 px-4 py-4">
            <PaginationPrevious
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            />
            <div
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 [&_button]:text-zinc-950 [&_button_span]:text-zinc-950"
            >
              <PaginationList className="!flex items-center gap-x-0.5">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <PaginationPage
                      key={page}
                      current={page === safePage}
                      onClick={() => setCurrentPage(page)}
                      className={
                        page === safePage
                          ? "rounded bg-zinc-100 text-zinc-950 before:hidden"
                          : "text-zinc-950 before:hidden"
                      }
                    >
                      {page}
                    </PaginationPage>
                  ),
                )}
              </PaginationList>
            </div>
            <PaginationNext
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
            />
          </Pagination>
        )}
      </section>
    </div>
  );
}
