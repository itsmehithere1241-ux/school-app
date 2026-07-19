import { Heading } from "@/components/catalyst/heading";
import { TeachersTable } from "./teachers-table";

export default function TeachersPage() {
  return (
    <div className="text-left">
      <header className="mb-8">
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          Teachers
        </Heading>
      </header>

      <div className="rounded-xl border border-zinc-300 bg-zinc-100/50 p-6 shadow-sm">
        <TeachersTable />
      </div>
    </div>
  );
}
