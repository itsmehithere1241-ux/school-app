import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileResponse } from "@/lib/profile-types";

function formatProfileUser(user: User): ProfileResponse {
  const metadata = user.user_metadata ?? {};
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "User";

  return {
    name,
    email: user.email ?? "",
    phone: user.phone ?? "",
    bio: typeof metadata.bio === "string" ? metadata.bio : "",
    jobTitle: typeof metadata.job_title === "string" ? metadata.job_title : "",
    timezone:
      typeof metadata.timezone === "string" ? metadata.timezone : "America/New_York",
    language: typeof metadata.language === "string" ? metadata.language : "en",
    twoFactorEnabled: false,
    mfaFactorId: null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const profile = formatProfileUser(user);

  const { data: factorsData, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (!factorsError && factorsData) {
    const verifiedFactor = factorsData.totp.find(
      (factor) => factor.status === "verified",
    );
    profile.twoFactorEnabled = Boolean(verifiedFactor);
    profile.mfaFactorId = verifiedFactor?.id ?? null;
  }

  return NextResponse.json<ProfileResponse>(profile);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const metadata = user.user_metadata ?? {};
  const dataUpdates: Record<string, string> = {};

  if (typeof body?.name === "string") {
    dataUpdates.full_name = body.name.trim();
  }
  if (typeof body?.bio === "string") {
    dataUpdates.bio = body.bio.trim();
  }
  if (typeof body?.jobTitle === "string") {
    dataUpdates.job_title = body.jobTitle.trim();
  }
  if (typeof body?.timezone === "string") {
    dataUpdates.timezone = body.timezone.trim();
  }
  if (typeof body?.language === "string") {
    dataUpdates.language = body.language.trim();
  }

  const updatePayload: {
    phone?: string;
    email?: string;
    data?: Record<string, string>;
  } = {};

  if (typeof body?.phone === "string") {
    updatePayload.phone = body.phone.trim();
  }

  if (typeof body?.email === "string") {
    const email = body.email.trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    updatePayload.email = email;
  }

  if (Object.keys(dataUpdates).length > 0) {
    updatePayload.data = {
      full_name:
        dataUpdates.full_name ??
        (typeof metadata.full_name === "string" ? metadata.full_name : ""),
      bio:
        dataUpdates.bio ??
        (typeof metadata.bio === "string" ? metadata.bio : ""),
      job_title:
        dataUpdates.job_title ??
        (typeof metadata.job_title === "string" ? metadata.job_title : ""),
      timezone:
        dataUpdates.timezone ??
        (typeof metadata.timezone === "string"
          ? metadata.timezone
          : "America/New_York"),
      language:
        dataUpdates.language ??
        (typeof metadata.language === "string" ? metadata.language : "en"),
    };
  }

  if (
    !updatePayload.email &&
    !updatePayload.phone &&
    !updatePayload.data
  ) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.updateUser(updatePayload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }

  const profile = formatProfileUser(data.user);
  const emailChanged = typeof body?.email === "string" && body.email.trim() !== user.email;

  return NextResponse.json({
    profile,
    emailConfirmationRequired: emailChanged,
    message: emailChanged
      ? "Profile updated. Check your inbox to confirm your new email address."
      : "Profile updated.",
  });
}
