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

type Teacher = {
  id: number;
  firstname: string;
  lastname: string;
};

type SearchFilters = {
  id: string;
  firstname: string;
  lastname: string;
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

function matchesFilters(teacher: Teacher, filters: SearchFilters): boolean {
  const id = filters.id.trim();
  const firstname = filters.firstname.trim().toLowerCase();
  const lastname = filters.lastname.trim().toLowerCase();

  if (id && !String(teacher.id).startsWith(id)) return false;
  if (firstname && !teacher.firstname.toLowerCase().startsWith(firstname)) {
    return false;
  }
  if (lastname && !teacher.lastname.toLowerCase().startsWith(lastname)) {
    return false;
  }

  return true;
}

export function TeachersTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    id: "",
    firstname: "",
    lastname: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredTeachers = useMemo(
    () => teachers.filter((teacher) => matchesFilters(teacher, filters)),
    [teachers, filters],
  );

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const response = await fetch("/api/teachers");

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to fetch teachers");
        }

        const data: Teacher[] = await response.json();
        setTeachers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch teachers");
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, []);

  function updateFilter(field: keyof SearchFilters, value: string) {
    setFilters((prev) => ({ ...prev, [field]: value }));
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
      <section aria-label="Search teachers">
        <div className="mb-2 flex items-center gap-2 text-sm/6 font-semibold text-zinc-700">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-zinc-500"
          />
          <span>Search teachers</span>
        </div>
        <div
          className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm ring-1 ring-zinc-300/60"
        >
          <div className={`${columnGridClass} divide-x divide-zinc-300`}>
            <div className="min-w-0">
              <label htmlFor="search-teacher-id" className="sr-only">
                Search ID
              </label>
              <input
                id="search-teacher-id"
                type="search"
                value={filters.id}
                onChange={(e) => updateFilter("id", e.target.value)}
                placeholder="ID"
                className={searchInputClass}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="search-teacher-firstname" className="sr-only">
                Search first name
              </label>
              <input
                id="search-teacher-firstname"
                type="search"
                value={filters.firstname}
                onChange={(e) => updateFilter("firstname", e.target.value)}
                placeholder="First name"
                className={searchInputClass}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="search-teacher-lastname" className="sr-only">
                Search last name
              </label>
              <input
                id="search-teacher-lastname"
                type="search"
                value={filters.lastname}
                onChange={(e) => updateFilter("lastname", e.target.value)}
                placeholder="Last name"
                className={searchInputClass}
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Teachers table" className={tableSectionClass}>
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
                First name
              </TableHeader>
              <TableHeader className={`${headerClass} ${dataColClass}`}>
                Last name
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className={`${cellClass} text-center text-zinc-500`}
                >
                  No teachers match your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
