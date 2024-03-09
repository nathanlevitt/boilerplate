"use client";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetLink } from "@/lib/auth/actions";
import { redirects } from "@/lib/constants";
import { AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";

const initialState = {
  error: "",
  success: false,
};

export function ForgotPassword() {
  const [state, formAction] = useFormState(sendPasswordResetLink, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast("Password reset link sent!", {
        icon: <CheckCircle className="h-4 w-4" />,
      });
      router.push(redirects.toLogin);
    }
    if (state.error) {
      toast(state.error, {
        icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
      });
    }
  }, [router, state.error, state.success]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Password reset link will be sent to your email.
        </p>
      </div>

      <div className="space-y-2">
        <form className="grid gap-4" action={formAction}>
          <div className="grid gap-2.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" name="email" />
          </div>

          <SubmitButton>Reset Password</SubmitButton>
        </form>

        {state.error && (
          <div className="text-sm font-medium text-center text-destructive">
            {state.error}
          </div>
        )}
      </div>

      <p className="px-8 text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          className="font-medium underline-offset-4 hover:text-primary hover:underline"
          href="/signup"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
