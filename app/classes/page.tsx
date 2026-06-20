import { Heading } from "@/app/components/catalyst/heading";
import { ClassesTable } from "./classes-table";

export default function ClassesPage() {
  return (
    <div className="text-left">
      <header className="mb-8">
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          Classes
        </Heading>
      </header>

      <div className="rounded-xl border border-zinc-300 bg-zinc-100/50 p-6 shadow-sm">
        <ClassesTable />
      </div>
    </div>
  );
}
