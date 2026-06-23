"use client";

import { useEffect, useMemo, useState } from "react";
import { FunnelIcon, MagnifyingGlassIcon, ArrowsUpDownIcon, TrashIcon } from "@heroicons/react/20/solid";
import {
  Alert,
  AlertActions,
  AlertDescription,
  AlertTitle,
} from "@/app/components/catalyst/alert";
import { Button } from "@/app/components/catalyst/button";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownHeading,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from "@/app/components/catalyst/dropdown";
import {
  Field,
  FieldGroup,
  Fieldset,
  Label,
} from "@/app/components/catalyst/fieldset";
import { Input } from "@/app/components/catalyst/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/catalyst/table";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPage,
  PaginationPrevious,
} from "@/app/components/catalyst/pagination";

const PAGE_SIZE = 10;

type Student = {
  id: number;
  firstname: string;
  lastname: string;
  dob: string;
};

type AgeRange = {
  min: string;
  max: string;
};

type AlphaSort = "asc" | "desc" | "none";
type DobSort = "youngest" | "oldest" | "none";

type SortPreferences = {
  firstname: AlphaSort;
  lastname: AlphaSort;
  dob: DobSort;
};

const emptySortPreferences = (): SortPreferences => ({
  firstname: "none",
  lastname: "none",
  dob: "none",
});

function formatSortSummary(sort: SortPreferences): string {
  const parts: string[] = [];

  if (sort.firstname !== "none") {
    parts.push(
      `First name ${sort.firstname === "asc" ? "A–Z" : "Z–A"}`,
    );
  }
  if (sort.lastname !== "none") {
    parts.push(
      `Last name ${sort.lastname === "asc" ? "A–Z" : "Z–A"}`,
    );
  }
  if (sort.dob !== "none") {
    parts.push(
      sort.dob === "youngest" ? "DOB youngest–oldest" : "DOB oldest–youngest",
    );
  }

  return parts.join(", ");
}

function isSortActive(sort: SortPreferences): boolean {
  return (
    sort.firstname !== "none" ||
    sort.lastname !== "none" ||
    sort.dob !== "none"
  );
}

const emptyAgeRange = (): AgeRange => ({ min: "", max: "" });

const dropdownMenuClass =
  "min-w-64 !bg-white !backdrop-blur-none shadow-md ring-1 !ring-zinc-300 dark:!bg-white dark:!ring-zinc-300 [&_[data-slot=label]]:!text-zinc-950 dark:[&_[data-slot=label]]:!text-zinc-950 [&_button]:!text-zinc-950 dark:[&_button]:!text-zinc-950 [&_button]:data-focus:!bg-zinc-100 [&_button]:data-focus:!text-zinc-950 dark:[&_button]:data-focus:!bg-zinc-100 dark:[&_button]:data-focus:!text-zinc-950";

const dropdownItemClass =
  "!text-zinc-950 data-focus:!bg-zinc-100 data-focus:!text-zinc-950 dark:!text-zinc-950 dark:data-focus:!bg-zinc-100 dark:data-focus:!text-zinc-950";

const dropdownHeadingClass = "!text-zinc-950 dark:!text-zinc-950";

const toolbarDropdownButtonClass =
  "!items-center !text-zinc-950 dark:!text-zinc-950 [--btn-icon:var(--color-zinc-700)] dark:[--btn-icon:var(--color-zinc-700)] data-hover:[--btn-icon:var(--color-zinc-950)] dark:data-hover:[--btn-icon:var(--color-zinc-950)] data-active:[--btn-icon:var(--color-zinc-950)] dark:data-active:[--btn-icon:var(--color-zinc-950)] *:data-[slot=icon]:!my-0 sm:*:data-[slot=icon]:!my-0";

const filterInputClass =
  "before:!bg-zinc-100 dark:before:!bg-zinc-100 [&_input]:!border-zinc-300 dark:[&_input]:!border-zinc-300 [&_input]:!bg-zinc-100 dark:[&_input]:!bg-zinc-100 [&_input]:!text-zinc-600 [&_input]:placeholder:!text-zinc-400 dark:[&_input]:!text-zinc-600";

const headerClass =
  "bg-zinc-100 px-4 py-4 text-base/7 font-semibold text-zinc-950 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";
const idColClass = "min-w-[6rem] w-[6rem]";
const dataColClass = "min-w-0";
const actionsColClass = "min-w-[5rem] w-[5rem]";
const cellClass =
  "px-4 py-5 text-base/7 text-zinc-600 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function matchesAgeRange(student: Student, range: AgeRange): boolean {
  const minVal = range.min.trim() ? Number.parseInt(range.min, 10) : null;
  const maxVal = range.max.trim() ? Number.parseInt(range.max, 10) : null;

  if (minVal === null && maxVal === null) return true;

  const age = calculateAge(student.dob);

  if (minVal !== null && Number.isFinite(minVal) && age < minVal) return false;
  if (maxVal !== null && Number.isFinite(maxVal) && age > maxVal) return false;

  return true;
}

function matchesSearch(student: Student, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normalized = trimmed.toLowerCase();
  const firstname = student.firstname.toLowerCase();
  const lastname = student.lastname.toLowerCase();
  const fullName = `${firstname} ${lastname}`;
  const reverseFullName = `${lastname} ${firstname}`;

  if (String(student.id).startsWith(trimmed)) return true;
  if (firstname.startsWith(normalized)) return true;
  if (lastname.startsWith(normalized)) return true;
  if (fullName.startsWith(normalized)) return true;
  if (reverseFullName.startsWith(normalized)) return true;

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (firstname.startsWith(firstPart) && lastname.startsWith(lastPart)) {
      return true;
    }
    if (lastname.startsWith(firstPart) && firstname.startsWith(lastPart)) {
      return true;
    }
  }

  return false;
}

function sortStudents(students: Student[], sort: SortPreferences): Student[] {
  if (!isSortActive(sort)) return students;

  const sorted = [...students];
  const localeCompare = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base" });

  return sorted.sort((a, b) => {
    if (sort.firstname !== "none") {
      const cmp = localeCompare(a.firstname, b.firstname);
      if (cmp !== 0) {
        return sort.firstname === "asc" ? cmp : -cmp;
      }
    }

    if (sort.lastname !== "none") {
      const cmp = localeCompare(a.lastname, b.lastname);
      if (cmp !== 0) {
        return sort.lastname === "asc" ? cmp : -cmp;
      }
    }

    if (sort.dob !== "none") {
      const cmp = new Date(a.dob).getTime() - new Date(b.dob).getTime();
      if (cmp !== 0) {
        return sort.dob === "youngest" ? -cmp : cmp;
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

export function StudentsTable() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRange>(emptyAgeRange);
  const [ageDraft, setAgeDraft] = useState<AgeRange>(emptyAgeRange);
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>(
    emptySortPreferences,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          matchesSearch(student, searchQuery) &&
          matchesAgeRange(student, ageRange),
      ),
    [students, searchQuery, ageRange],
  );

  const sortedStudents = useMemo(
    () => sortStudents(filteredStudents, sortPreferences),
    [filteredStudents, sortPreferences],
  );

  const ageFilterActive = ageRange.min !== "" || ageRange.max !== "";
  const sortActive = isSortActive(sortPreferences);

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(
    () =>
      sortedStudents.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
      ),
    [sortedStudents, safePage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    ageRange.min,
    ageRange.max,
    sortPreferences.firstname,
    sortPreferences.lastname,
    sortPreferences.dob,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await fetch("/api/students");

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to fetch students");
        }

        const data: Student[] = await response.json();
        setStudents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch students");
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, []);

  function applyAgeFilter() {
    setAgeRange({ min: ageDraft.min.trim(), max: ageDraft.max.trim() });
  }

  function clearAgeFilter() {
    const cleared = emptyAgeRange();
    setAgeDraft(cleared);
    setAgeRange(cleared);
  }

  function openDeleteConfirm(student: Student) {
    setDeleteError(null);
    setStudentToDelete(student);
  }

  function closeDeleteConfirm() {
    if (isDeleting) return;
    setStudentToDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!studentToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/students/${studentToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete student");
      }

      setStudents((prev) =>
        prev.filter((student) => student.id !== studentToDelete.id),
      );
      setStudentToDelete(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete student",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-base text-zinc-500">Loading students…</p>;
  }

  if (error) {
    return <p className="text-base text-red-600">{error}</p>;
  }

  if (students.length === 0) {
    return <p className="text-base text-zinc-500">No students found.</p>;
  }

  return (
    <div className="space-y-4">
      <Alert
        open={studentToDelete !== null}
        onClose={closeDeleteConfirm}
        className="!bg-white dark:!bg-white"
      >
        <AlertTitle className="!text-zinc-950 dark:!text-zinc-950">
          Delete student?
        </AlertTitle>
        <AlertDescription className="!text-zinc-600 dark:!text-zinc-600">
          {studentToDelete
            ? `Are you sure you want to delete ${studentToDelete.firstname} ${studentToDelete.lastname}? Their enrollments, attendance record, homework submissions, address, and all other related data will also be removed. This action cannot be undone.`
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

      <section aria-label="Search students">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm/6 font-semibold text-zinc-700">
            Search students
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {ageFilterActive && (
              <span>
                Age filter: {ageRange.min || "any"}–{ageRange.max || "any"}
              </span>
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
            <label htmlFor="search-students" className="sr-only">
              Search by ID, first name, or last name
            </label>
            <input
              id="search-students"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, or full name (e.g. Jeffrey Cassin)"
              className="block w-full border-0 bg-transparent py-3 pl-10 pr-4 text-sm/6 text-zinc-900 placeholder:text-zinc-400 outline-hidden focus:ring-2 focus:ring-inset focus:ring-zinc-500/20"
            />
          </div>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Filter students by age"
              className={`${toolbarDropdownButtonClass}${ageFilterActive ? " ring-2 ring-zinc-400" : ""}`}
              onClick={() => setAgeDraft(ageRange)}
            >
              <FunnelIcon data-slot="icon" aria-hidden="true" />
              <span className="hidden sm:inline">Filter</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className={dropdownMenuClass}>
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Age range
                </DropdownHeading>
                <div className="col-span-full px-3 pb-2">
                  <Fieldset>
                    <FieldGroup className="grid grid-cols-2 gap-3 !space-y-0">
                      <Field>
                        <Label className="!text-zinc-950 dark:!text-zinc-950">
                          Min age
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          value={ageDraft.min}
                          onChange={(e) =>
                            setAgeDraft((prev) => ({
                              ...prev,
                              min: e.target.value,
                            }))
                          }
                          placeholder="Min"
                          className={filterInputClass}
                        />
                      </Field>
                      <Field>
                        <Label className="!text-zinc-950 dark:!text-zinc-950">
                          Max age
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          value={ageDraft.max}
                          onChange={(e) =>
                            setAgeDraft((prev) => ({
                              ...prev,
                              max: e.target.value,
                            }))
                          }
                          placeholder="Max"
                          className={filterInputClass}
                        />
                      </Field>
                    </FieldGroup>
                  </Fieldset>
                </div>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownItem
                  className={dropdownItemClass}
                  onClick={applyAgeFilter}
                >
                  Apply filter
                </DropdownItem>
                <DropdownItem
                  className={dropdownItemClass}
                  onClick={clearAgeFilter}
                >
                  Clear filter
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Sort students"
              className={`${toolbarDropdownButtonClass}${sortActive ? " ring-2 ring-zinc-400" : ""}`}
            >
              <ArrowsUpDownIcon data-slot="icon" aria-hidden="true" />
              <span className="hidden sm:inline">Sort</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className={dropdownMenuClass}>
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  First name
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(sortPreferences.firstname === "asc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("firstname", "asc", prev),
                    )
                  }
                >
                  A → Z
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(sortPreferences.firstname === "desc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("firstname", "desc", prev),
                    )
                  }
                >
                  Z → A
                </DropdownItem>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Last name
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(sortPreferences.lastname === "asc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("lastname", "asc", prev),
                    )
                  }
                >
                  A → Z
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(sortPreferences.lastname === "desc")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("lastname", "desc", prev),
                    )
                  }
                >
                  Z → A
                </DropdownItem>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Date of birth
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(sortPreferences.dob === "youngest")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("dob", "youngest", prev),
                    )
                  }
                >
                  Youngest → oldest
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(sortPreferences.dob === "oldest")}
                  onClick={() =>
                    setSortPreferences((prev) =>
                      toggleSortPreference("dob", "oldest", prev),
                    )
                  }
                >
                  Oldest → youngest
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

      <section
        aria-label="Students table"
        className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-md ring-1 ring-zinc-300/60 [&_table]:border-collapse [&_table]:table-fixed [&_table]:text-zinc-600 [&_table]:dark:text-zinc-600 [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:nth-child(even)]:bg-zinc-50 [&_th]:border [&_td]:border [&_th]:border-zinc-300 [&_td]:border-zinc-300 [&_th]:text-zinc-950 [&_th]:dark:text-zinc-950"
      >
        <Table grid bleed className="whitespace-normal">
          <colgroup>
            <col className="w-[6rem]" />
            <col />
            <col />
            <col />
            <col className="w-[5rem]" />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableHeader className={`${headerClass} ${idColClass}`}>
                ID
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                First name
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                Last name
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                Date of birth
              </TableHeader>
              <TableHeader className={`${headerClass} ${actionsColClass}`}>
                Actions
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStudents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className={`${cellClass} text-center text-zinc-500`}
                >
                  No students match your search or filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className={`${cellClass} ${idColClass}`}>
                    {student.id}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {student.firstname}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {student.lastname}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {student.dob}
                  </TableCell>
                  <TableCell className={`${cellClass} ${actionsColClass}`}>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(student)}
                      aria-label={`Delete ${student.firstname} ${student.lastname}`}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-600 transition hover:bg-red-50 hover:text-red-600 focus:outline-hidden focus:ring-2 focus:ring-red-500/30"
                    >
                      <TrashIcon className="size-5" aria-hidden="true" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {sortedStudents.length > 0 && totalPages > 1 && (
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
