"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-700 sm:text-sm/6";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to reset password.");
      }

      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/sign-in?reset=success");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-svh w-full grid-cols-1 bg-white lg:grid-cols-2 lg:gap-10 lg:p-10">
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-4 lg:py-0">
        <div className="mx-auto w-full max-w-sm">
          <div>
            <div className="flex h-10 items-center">
              <span className="text-lg font-semibold text-gray-900">
                School App
              </span>
            </div>
            <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900">
              Set a new password
            </h2>
            <p className="mt-2 text-sm/6 text-gray-500">
              Enter your new password below.
            </p>
          </div>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  New password
                </label>
                <div className="mt-2">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  Confirm new password
                </label>
                <div className="mt-2">
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Updating…" : "Update password"}
                </button>
              </div>

              <p className="text-center text-sm/6 text-gray-500">
                <Link
                  href="/sign-in"
                  className="font-semibold text-gray-900 hover:text-gray-700"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <div className="relative hidden h-full min-h-0 overflow-hidden rounded-xl lg:block">
        <div className="absolute inset-0 bg-gray-900" />
        <img
          alt=""
          src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
          className="absolute inset-0 size-full object-cover opacity-40"
        />
        <div className="relative flex h-full items-end p-10">
          <p className="max-w-md text-sm/6 text-gray-200">
            Manage students, teachers, and classes from one place.
          </p>
        </div>
      </div>
    </div>
  );
}
