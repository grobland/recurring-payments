import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  authenticators,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";

const TRIAL_DAYS = 14;

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign in - fetch full user data
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id!),
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.billingStatus = dbUser.billingStatus;
          token.trialEndDate = dbUser.trialEndDate?.toISOString() ?? null;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.displayCurrency = dbUser.displayCurrency;
        }
      }

      // Refresh token data periodically
      if (trigger === "update") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        });

        if (dbUser) {
          token.billingStatus = dbUser.billingStatus;
          token.trialEndDate = dbUser.trialEndDate?.toISOString() ?? null;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.displayCurrency = dbUser.displayCurrency;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Type-safe session updates using double cast
        const user = session.user as unknown as Record<string, unknown>;
        user.id = token.id;
        user.billingStatus = token.billingStatus;
        user.trialEndDate = token.trialEndDate;
        user.onboardingCompleted = token.onboardingCompleted;
        user.displayCurrency = token.displayCurrency;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, set up trial if new user
      if (account?.provider !== "credentials" && user.id) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (existingUser && !existingUser.trialStartDate) {
          const now = new Date();
          await db
            .update(users)
            .set({
              trialStartDate: now,
              trialEndDate: addDays(now, TRIAL_DAYS),
              updatedAt: now,
            })
            .where(eq(users.id, user.id));
        }
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Set trial dates for new users
      if (user.id) {
        const now = new Date();
        await db
          .update(users)
          .set({
            trialStartDate: now,
            trialEndDate: addDays(now, TRIAL_DAYS),
            billingStatus: "trial",
            updatedAt: now,
          })
          .where(eq(users.id, user.id));
      }
    },
  },
};
