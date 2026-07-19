"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
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
import { matchesTeacherSearch } from "@/lib/table-search";

const PAGE_SIZE = 10;

type ActiveStateFilter = "active" | "inactive" | "none";

type Teacher = {
  id: number;
  firstname: string;
  lastname: string;
  active_state: boolean;
};

type AlphaSort = "asc" | "desc" | "none";

type SortPreferences = {
  firstname: AlphaSort;
  lastname: AlphaSort;
};

const emptySortPreferences = (): SortPreferences => ({
  firstname: "none",
  lastname: "none",
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
const statusColClass = "min-w-[6rem] w-[6rem]";
const actionsColClass = "min-w-[5rem] w-[5rem]";
const cellClass =
  "px-4 py-5 text-base/7 text-zinc-600 first:pl-4 last:pr-4 sm:first:pl-4 sm:last:pr-4";

const tableSectionClass =
  "overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-md ring-1 ring-zinc-300/60 [&_table]:border-collapse [&_table]:table-fixed [&_table]:text-zinc-600 [&_table]:dark:text-zinc-600 [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:nth-child(even)]:bg-zinc-50 [&_th]:border [&_td]:border [&_th]:border-zinc-300 [&_td]:border-zinc-300 [&_th]:text-zinc-950 [&_th]:dark:text-zinc-950";

function formatActiveState(state: boolean): string {
  return state ? "Active" : "Inactive";
}

function formatActiveStateFilterLabel(filter: ActiveStateFilter): string {
  return filter === "active" ? "Active" : "Inactive";
}

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

  return parts.join(", ");
}

function isSortActive(sort: SortPreferences): boolean {
  return sort.firstname !== "none" || sort.lastname !== "none";
}

function matchesSearch(teacher: Teacher, query: string): boolean {
  return matchesTeacherSearch(teacher, query);
}

function matchesActiveStateFilter(
  teacher: Teacher,
  filter: ActiveStateFilter,
): boolean {
  if (filter === "none") return true;
  return filter === "active"
    ? teacher.active_state === true
    : teacher.active_state === false;
}

function sortTeachers(teachers: Teacher[], sort: SortPreferences): Teacher[] {
  if (!isSortActive(sort)) return teachers;

  const sorted = [...teachers];
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

function toggleActiveStateFilter(
  value: Exclude<ActiveStateFilter, "none">,
  current: ActiveStateFilter,
): ActiveStateFilter {
  return current === value ? "none" : value;
}

export function TeachersTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStateFilter, setActiveStateFilter] =
    useState<ActiveStateFilter>("none");
  const [sortPreferences, setSortPreferences] = useState<SortPreferences>(
    emptySortPreferences,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          matchesSearch(teacher, searchQuery) &&
          matchesActiveStateFilter(teacher, activeStateFilter),
      ),
    [teachers, searchQuery, activeStateFilter],
  );

  const sortedTeachers = useMemo(
    () => sortTeachers(filteredTeachers, sortPreferences),
    [filteredTeachers, sortPreferences],
  );

  const activeStateFilterActive = activeStateFilter !== "none";
  const sortActive = isSortActive(sortPreferences);

  const totalPages = Math.max(1, Math.ceil(sortedTeachers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedTeachers = useMemo(
    () =>
      sortedTeachers.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE,
      ),
    [sortedTeachers, safePage],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    activeStateFilter,
    sortPreferences.firstname,
    sortPreferences.lastname,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const response = await fetch("/api/teachers");

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to fetch teachers");
        }

        const data = (await response.json()) as Teacher[];
        setTeachers(
          data.map((teacher) => ({
            ...teacher,
            active_state: teacher.active_state ?? true,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch teachers");
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, []);

  function openDeleteConfirm(teacher: Teacher) {
    setDeleteError(null);
    setTeacherToDelete(teacher);
  }

  function closeDeleteConfirm() {
    if (isDeleting) return;
    setTeacherToDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!teacherToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/teachers/${teacherToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete teacher");
      }

      setTeachers((prev) =>
        prev.filter((teacher) => teacher.id !== teacherToDelete.id),
      );
      setTeacherToDelete(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete teacher",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return <p className="text-base text-zinc-500">Loading teachers…</p>;
  }

  if (error) {
    return <p className="text-base text-red-600">{error}</p>;
  }

  if (teachers.length === 0) {
    return <p className="text-base text-zinc-500">No teachers found.</p>;
  }

  return (
    <div className="space-y-4">
      <Alert
        open={teacherToDelete !== null}
        onClose={closeDeleteConfirm}
        className="!bg-white dark:!bg-white"
      >
        <AlertTitle className="!text-zinc-950 dark:!text-zinc-950">
          Delete teacher?
        </AlertTitle>
        <AlertDescription className="!text-zinc-600 dark:!text-zinc-600">
          {teacherToDelete
            ? `Are you sure you want to delete ${teacherToDelete.firstname} ${teacherToDelete.lastname}? Their classes, sessions, enrollments, attendance, homework, and all other related data will also be removed. This action cannot be undone.`
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

      <section aria-label="Search teachers">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm/6 font-semibold text-zinc-700">
            Search teachers
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {activeStateFilterActive && (
              <span>
                Active state: {formatActiveStateFilterLabel(activeStateFilter)}
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
            <label htmlFor="search-teachers" className="sr-only">
              Search by ID, first name, or last name
            </label>
            <input
              id="search-teachers"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, or full name"
              className="block w-full border-0 bg-transparent py-3 pl-10 pr-4 text-sm/6 text-zinc-900 placeholder:text-zinc-400 outline-hidden focus:ring-2 focus:ring-inset focus:ring-zinc-500/20"
            />
          </div>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Filter teachers by active state"
              className={`${toolbarDropdownButtonClass}${activeStateFilterActive ? " ring-2 ring-zinc-400" : ""}`}
            >
              <FunnelIcon data-slot="icon" aria-hidden="true" />
              <span className="hidden sm:inline">Filter</span>
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className={dropdownMenuClass}>
              <DropdownSection>
                <DropdownHeading className={dropdownHeadingClass}>
                  Active state
                </DropdownHeading>
                <DropdownItem
                  className={sortItemClass(activeStateFilter === "active")}
                  onClick={() =>
                    setActiveStateFilter((prev) =>
                      toggleActiveStateFilter("active", prev),
                    )
                  }
                >
                  Active
                </DropdownItem>
                <DropdownItem
                  className={sortItemClass(activeStateFilter === "inactive")}
                  onClick={() =>
                    setActiveStateFilter((prev) =>
                      toggleActiveStateFilter("inactive", prev),
                    )
                  }
                >
                  Inactive
                </DropdownItem>
              </DropdownSection>
              <DropdownDivider className="!bg-zinc-300 dark:!bg-zinc-300" />
              <DropdownSection>
                <DropdownItem
                  className={dropdownItemClass}
                  onClick={() => setActiveStateFilter("none")}
                >
                  Clear filter
                </DropdownItem>
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownButton
              outline
              aria-label="Sort teachers"
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

      <section aria-label="Teachers table" className={tableSectionClass}>
        <Table grid bleed className="whitespace-normal">
          <colgroup>
            <col className="w-[6rem]" />
            <col />
            <col />
            <col className="w-[6rem]" />
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
              <TableHeader className={`${headerClass} ${statusColClass}`}>
                Active state
              </TableHeader>
              <TableHeader className={`${headerClass} ${actionsColClass}`}>
                Actions
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTeachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className={`${cellClass} text-center text-zinc-500`}
                >
                  No teachers match your search or filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className={`${cellClass} ${idColClass}`}>
                    {teacher.id}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {teacher.firstname}
                  </TableCell>
                  <TableCell className={`${cellClass} ${dataColClass}`}>
                    {teacher.lastname}
                  </TableCell>
                  <TableCell className={`${cellClass} ${statusColClass}`}>
                    {formatActiveState(teacher.active_state)}
                  </TableCell>
                  <TableCell className={`${cellClass} ${actionsColClass}`}>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(teacher)}
                      aria-label={`Delete ${teacher.firstname} ${teacher.lastname}`}
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

        {sortedTeachers.length > 0 && totalPages > 1 && (
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
