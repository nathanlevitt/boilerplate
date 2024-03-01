import { cache } from "react";
import { cookies } from "next/headers";
import { InferSelectModel } from "drizzle-orm";
import { TimeSpan } from "oslo";

import { Auth } from "@/lib/auth/core";
import { sessions, users } from "@/lib/db/schema/users";

export type User = InferSelectModel<typeof users>;
export type Session = InferSelectModel<typeof sessions>;
export type UserId = User["id"];
export type SessionId = Session["id"];

export type AuthUser = Pick<User, "id" | "email" | "name">;
export type AuthSession = Pick<Session, "id" | "userId" | "expiresAt"> & {
  fresh: boolean;
};

export const auth = new Auth({
  sessionCookie: {
    name: "auth_session",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  sessionExpiresIn: new TimeSpan(1, "m"),
});

export const validateRequest = cache(
  async (): Promise<
    { user: AuthUser; session: AuthSession } | { user: null; session: null }
  > => {
    const sessionId = cookies().get(auth.sessionCookieName)?.value ?? null;
    if (!sessionId) {
      return {
        user: null,
        session: null,
      };
    }

    const result = await auth.validateSession(sessionId);

    // Next.js throws when you attempt to set cookie when rendering page
    try {
      if (result.session && result.session.fresh) {
        const sessionCookie = auth.createSessionCookie(result.session.id);
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
      if (!result.session) {
        const sessionCookie = auth.createBlankSessionCookie();
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
    } catch {}
    return result;
  }
);
