"use server";

import bcrypt from "bcrypt";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";
import { redirects } from "@/lib/constants";
import { User, users } from "@/lib/db/schema";
import { auth, validateRequest } from "@/lib/auth";
import { loginSchema, signupSchema } from "@/lib/validators/auth";
import { generateResetPasswordToken } from "@/lib/api/auth";

import { sendMail } from "@/lib/email/send-email";
import { renderResetPasswordEmail } from "@/lib/email/templates/reset-password";

export async function login(prevState: unknown, formData: FormData) {
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsedData = loginSchema.safeParse(data);
  if (!parsedData.success) {
    return { error: "Incorrect email or password." };
  }

  const { email, password } = parsedData.data;
  const existingUser = (
    await db.select().from(users).where(eq(users.email, email))
  )?.[0];
  if (!existingUser) {
    return { error: "Incorrect email or password." };
  }

  const validPassword = await bcrypt.compare(password, existingUser.password);
  if (!validPassword) {
    return { error: "Incorrect email or password." };
  }

  const session = await auth.createSession(existingUser.id, {});
  const sessionCookie = auth.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect(redirects.afterLogin);
}

export async function signup(prevState: unknown, formData: FormData) {
  const data = {
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  };

  const parsedData = signupSchema.safeParse(data);
  if (!parsedData.success) {
    return {
      error:
        parsedData.error.issues[0]?.message ||
        "An error occurred, please try again.",
    };
  }

  const { email, name, password } = parsedData.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  let userId: User["id"];
  try {
    const user = await db.insert(users).values({
      email,
      name,
      password: hashedPassword,
    });
    userId = Number(user.insertId);
  } catch (error) {
    return { error: "An account with that email already exists." };
  }

  const session = await auth.createSession(userId, {});
  console.log("Created session:", session);
  const sessionCookie = auth.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect(redirects.afterLogin);
}

export async function logout() {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "No session found.",
    };
  }

  await auth.invalidateSession(session.id);
  const sessionCookie = auth.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  return redirect(redirects.afterLogout);
}

export async function sendPasswordResetLink(
  prevState: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const raw = formData.get("email");
  const email = z.string().trim().email().safeParse(raw);
  if (!email.success) {
    return { error: "Invalid email." };
  }

  try {
    const ipAddress =
      headers().get("x-real-ip") ||
      headers().get("x-forwarded-for") ||
      "0.0.0.0";

    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, email.data),
    });
    console.log("User:", user);

    if (!user) {
      return { error: "Invalid email." };
    }

    const verificationToken = await generateResetPasswordToken(user.id);
    const verificationLink = absoluteUrl(
      `/reset-password/${verificationToken}`
    );

    const mail = await sendMail({
      to: user.email,
      subject: "Reset your password",
      body: renderResetPasswordEmail({
        name: user.name,
        link: verificationLink,
        ipAddress,
      }),
    });
    console.log("Mail:", mail);

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to send reset password email." };
  }
}