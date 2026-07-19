type PersonSearchFields = {
  id: number;
  firstname: string;
  lastname: string;
};

export type ClassSearchFields = {
  id: number;
  subject: string;
  teacherId?: number | null;
  teacherFirstname?: string;
  teacherLastname?: string;
};

function matchesPersonSearch(
  person: PersonSearchFields,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();
  const firstname = person.firstname.toLowerCase();
  const lastname = person.lastname.toLowerCase();
  const fullName = `${firstname} ${lastname}`;
  const reverseFullName = `${lastname} ${firstname}`;

  if (String(person.id).startsWith(trimmed)) {
    return true;
  }
  if (firstname.startsWith(normalized)) {
    return true;
  }
  if (lastname.startsWith(normalized)) {
    return true;
  }
  if (fullName.startsWith(normalized)) {
    return true;
  }
  if (reverseFullName.startsWith(normalized)) {
    return true;
  }

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

export function matchesStudentSearch(
  student: PersonSearchFields,
  query: string,
): boolean {
  return matchesPersonSearch(student, query);
}

export function matchesTeacherSearch(
  teacher: PersonSearchFields,
  query: string,
): boolean {
  return matchesPersonSearch(teacher, query);
}

export function matchesClassSearch(
  cls: ClassSearchFields,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();
  const subject = cls.subject.toLowerCase();
  const firstname = cls.teacherFirstname?.toLowerCase() ?? "";
  const lastname = cls.teacherLastname?.toLowerCase() ?? "";
  const teacherName =
    firstname && lastname
      ? `${firstname} ${lastname}`
      : firstname || lastname;

  if (String(cls.id).startsWith(trimmed)) {
    return true;
  }
  if (subject.startsWith(normalized)) {
    return true;
  }
  if (cls.teacherId != null && String(cls.teacherId).startsWith(trimmed)) {
    return true;
  }
  if (teacherName.startsWith(normalized)) {
    return true;
  }
  if (firstname.startsWith(normalized)) {
    return true;
  }
  if (lastname.startsWith(normalized)) {
    return true;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && firstname && lastname) {
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

/** Panel searches hide results until the user enters a query. */
export function filterPanelSearch<T>(
  items: T[],
  query: string,
  matcher: (item: T, query: string) => boolean,
): T[] {
  if (!query.trim()) {
    return [];
  }

  return items.filter((item) => matcher(item, query));
}
