import { Heading } from "@/components/catalyst/heading";
import { StudentsTable } from "./students-table";

export default function StudentsPage() {
  return (
    <div className="text-left">
      <header className="mb-8">
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          Students
        </Heading>
      </header>

      <div className="rounded-xl border border-zinc-300 bg-zinc-100/50 p-6 shadow-sm">
        <StudentsTable />
      </div>
    </div>
  );
}
