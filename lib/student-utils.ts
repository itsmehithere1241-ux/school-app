export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/** US approximate: Grade 3 ≈ age 8, so grade = age - 5. */
export function calculateGradeLevel(dob: string): number {
  return calculateAge(dob) - 5;
}

export function formatGradeLevel(dob: string): string {
  return `Grade ${calculateGradeLevel(dob)}`;
}
