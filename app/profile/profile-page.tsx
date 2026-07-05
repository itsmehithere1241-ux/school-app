"use client";

import { useCallback, useEffect, useState } from "react";
import { Heading } from "@/app/components/catalyst/heading";
import type { ProfileResponse } from "@/lib/profile-types";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-700 sm:text-sm/6";

const buttonClassName =
  "inline-flex justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-60";

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function Message({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  return (
    <p
      className={
        type === "success"
          ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {text}
    </p>
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mfaSetup, setMfaSetup] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const [personalMessage, setPersonalMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [prefsMessage, setPrefsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [mfaMessage, setMfaMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const applyProfile = useCallback((data: ProfileResponse) => {
    setProfile(data);
    setName(data.name);
    setPhone(data.phone);
    setBio(data.bio);
    setJobTitle(data.jobTitle);
    setEmail(data.email);
    setTimezone(data.timezone);
    setLanguage(data.language);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/profile");
      if (!response.ok) {
        throw new Error("Unable to load profile.");
      }
      const data = (await response.json()) as ProfileResponse;
      applyProfile(data);
    } catch (err) {
      setPersonalMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to load profile.",
      });
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function savePersonal() {
    setPersonalMessage(null);
    setSavingPersonal(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, bio, jobTitle }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to save profile.");
      }
      if (body?.profile) {
        applyProfile(body.profile as ProfileResponse);
      }
      setPersonalMessage({ type: "success", text: body?.message ?? "Profile saved." });
    } catch (err) {
      setPersonalMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to save profile.",
      });
    } finally {
      setSavingPersonal(false);
    }
  }

  async function saveEmail() {
    setEmailMessage(null);
    setSavingEmail(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to update email.");
      }
      if (body?.profile) {
        applyProfile(body.profile as ProfileResponse);
      }
      setEmailMessage({
        type: "success",
        text: body?.message ?? "Email updated.",
      });
    } catch (err) {
      setEmailMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to update email.",
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function savePassword() {
    setPasswordMessage(null);
    setSavingPassword(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to update password.");
      }
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: body?.message ?? "Password updated.",
      });
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to update password.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function savePreferences() {
    setPrefsMessage(null);
    setSavingPrefs(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, language }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to save preferences.");
      }
      if (body?.profile) {
        applyProfile(body.profile as ProfileResponse);
      }
      setPrefsMessage({
        type: "success",
        text: body?.message ?? "Preferences saved.",
      });
    } catch (err) {
      setPrefsMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to save preferences.",
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  async function startMfaEnroll() {
    setMfaMessage(null);
    setMfaLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to start 2FA setup.");
      }
      setMfaSetup({
        factorId: body.factorId,
        qrCode: body.qrCode,
        secret: body.secret,
      });
      setMfaCode("");
    } catch (err) {
      setMfaMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to start 2FA setup.",
      });
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyMfa() {
    if (!mfaSetup) {
      return;
    }
    setMfaMessage(null);
    setMfaLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: mfaSetup.factorId, code: mfaCode }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to verify 2FA code.");
      }
      setMfaSetup(null);
      setMfaCode("");
      await loadProfile();
      setMfaMessage({
        type: "success",
        text: body?.message ?? "Two-factor authentication enabled.",
      });
    } catch (err) {
      setMfaMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to verify 2FA code.",
      });
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMfa() {
    if (!profile?.mfaFactorId) {
      return;
    }
    setMfaMessage(null);
    setMfaLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/unenroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: profile.mfaFactorId }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to disable 2FA.");
      }
      setMfaSetup(null);
      await loadProfile();
      setMfaMessage({
        type: "success",
        text: body?.message ?? "Two-factor authentication disabled.",
      });
    } catch (err) {
      setMfaMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to disable 2FA.",
      });
    } finally {
      setMfaLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          Your profile
        </Heading>
        <p className="mt-4 text-sm text-gray-500">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Heading className="text-3xl/9 font-semibold sm:text-3xl/9">
          Your profile
        </Heading>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account details, security settings, and preferences.
        </p>
      </div>

      <Section title="Account overview">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Member since</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(profile?.createdAt ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last signed in</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(profile?.lastSignInAt ?? null)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email verified</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile?.emailConfirmed ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">2FA status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {profile?.twoFactorEnabled ? "Enabled" : "Not enabled"}
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Personal information"
        description="Update your name, contact details, and bio."
      >
        {personalMessage && (
          <Message type={personalMessage.type} text={personalMessage.text} />
        )}
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-gray-900">
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-900">
            Phone number
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 0100"
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <div>
          <label htmlFor="profile-job" className="block text-sm font-medium text-gray-900">
            Job title
          </label>
          <input
            id="profile-job"
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="School administrator"
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <div>
          <label htmlFor="profile-bio" className="block text-sm font-medium text-gray-900">
            Bio
          </label>
          <textarea
            id="profile-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short note about your role at the school."
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <button
          type="button"
          onClick={savePersonal}
          disabled={savingPersonal}
          className={buttonClassName}
        >
          {savingPersonal ? "Saving…" : "Save personal info"}
        </button>
      </Section>

      <Section
        title="Email address"
        description="Changing your email may require confirmation via a link sent to the new address."
      >
        {emailMessage && <Message type={emailMessage.type} text={emailMessage.text} />}
        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-gray-900">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <button
          type="button"
          onClick={saveEmail}
          disabled={savingEmail}
          className={buttonClassName}
        >
          {savingEmail ? "Updating…" : "Update email"}
        </button>
      </Section>

      <Section title="Password" description="Choose a strong password with at least 6 characters.">
        {passwordMessage && (
          <Message type={passwordMessage.type} text={passwordMessage.text} />
        )}
        <div>
          <label htmlFor="profile-password" className="block text-sm font-medium text-gray-900">
            New password
          </label>
          <input
            id="profile-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <div>
          <label
            htmlFor="profile-confirm-password"
            className="block text-sm font-medium text-gray-900"
          >
            Confirm new password
          </label>
          <input
            id="profile-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className={`mt-2 ${inputClassName}`}
          />
        </div>
        <button
          type="button"
          onClick={savePassword}
          disabled={savingPassword}
          className={buttonClassName}
        >
          {savingPassword ? "Updating…" : "Update password"}
        </button>
      </Section>

      <Section
        title="Two-factor authentication"
        description="Add an extra layer of security with an authenticator app."
      >
        {mfaMessage && <Message type={mfaMessage.type} text={mfaMessage.text} />}

        <p className="text-sm text-gray-700">
          Status:{" "}
          <span className="font-semibold text-gray-900">
            {profile?.twoFactorEnabled ? "Enabled" : "Not enabled"}
          </span>
        </p>

        {profile?.twoFactorEnabled ? (
          <button
            type="button"
            onClick={disableMfa}
            disabled={mfaLoading}
            className={secondaryButtonClassName}
          >
            {mfaLoading ? "Disabling…" : "Disable 2FA"}
          </button>
        ) : mfaSetup ? (
          <div className="space-y-4">
            <div
              className="inline-block rounded-md border border-gray-200 bg-white p-3"
              dangerouslySetInnerHTML={{ __html: mfaSetup.qrCode }}
            />
            <p className="text-sm text-gray-600">
              Or enter this setup key manually:{" "}
              <span className="font-mono text-gray-900">{mfaSetup.secret}</span>
            </p>
            <div>
              <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-900">
                Verification code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="6-digit code"
                className={`mt-2 ${inputClassName}`}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={verifyMfa}
                disabled={mfaLoading || !mfaCode}
                className={buttonClassName}
              >
                {mfaLoading ? "Verifying…" : "Verify and enable"}
              </button>
              <button
                type="button"
                onClick={() => setMfaSetup(null)}
                className={secondaryButtonClassName}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startMfaEnroll}
            disabled={mfaLoading}
            className={buttonClassName}
          >
            {mfaLoading ? "Starting…" : "Enable 2FA"}
          </button>
        )}
      </Section>

      <Section title="Preferences" description="Regional and display settings for your account.">
        {prefsMessage && <Message type={prefsMessage.type} text={prefsMessage.text} />}
        <div>
          <label htmlFor="profile-timezone" className="block text-sm font-medium text-gray-900">
            Timezone
          </label>
          <select
            id="profile-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={`mt-2 ${inputClassName}`}
          >
            <option value="America/New_York">Eastern Time (US)</option>
            <option value="America/Chicago">Central Time (US)</option>
            <option value="America/Denver">Mountain Time (US)</option>
            <option value="America/Los_Angeles">Pacific Time (US)</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
        <div>
          <label htmlFor="profile-language" className="block text-sm font-medium text-gray-900">
            Language
          </label>
          <select
            id="profile-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`mt-2 ${inputClassName}`}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        <button
          type="button"
          onClick={savePreferences}
          disabled={savingPrefs}
          className={buttonClassName}
        >
          {savingPrefs ? "Saving…" : "Save preferences"}
        </button>
      </Section>
    </div>
  );
}
