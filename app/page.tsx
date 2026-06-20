import { Heading } from "@/app/components/catalyst/heading";

export default function Home() {
  return (
    <div className="text-left">
      <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
        Dashboard
      </Heading>
      <p className="mt-4 text-base/7 text-zinc-600">
        Welcome to the school management app. Use the sidebar to view students,
        teachers, and classes.
      </p>
    </div>
  );
}
