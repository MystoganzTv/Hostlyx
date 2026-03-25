import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();

      if (!email) {
        return false;
      }

      if (allowedEmails.length === 0) {
        return true;
      }

      return allowedEmails.includes(email);
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = String(token.email);
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireUserEmail() {
  const session = await getAuthSession();
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    return null;
  }

  return email;
}
