import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>School Management App</h1>
      <nav>
        <ul>
          <li>
            <Link href="/students">Students</Link>
          </li>
          <li>
            <Link href="/teachers">Teachers</Link>
          </li>
          <li>
            <Link href="/classes">Classes</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
