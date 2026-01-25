/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      billingStatus: string;
      trialEndDate: string | null;
      onboardingCompleted: boolean;
      displayCurrency: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    billingStatus?: string;
    trialEndDate?: Date | null;
    onboardingCompleted?: boolean;
    displayCurrency?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    billingStatus: string;
    trialEndDate: string | null;
    onboardingCompleted: boolean;
    displayCurrency: string;
  }
}
