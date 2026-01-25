import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login - Subscription Manager",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
