import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password - Subscription Manager",
  description: "Set your new password",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
