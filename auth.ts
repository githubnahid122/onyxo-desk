import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/**
 * Single-admin credentials auth for the /dashboard area.
 *
 * ADMIN_EMAIL / ADMIN_PASSWORD_HASH live in env vars (see .env.example).
 * Generate a hash with:
 *   node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
 *
 * Swap this provider for a real identity provider (Google Workspace, Okta,
 * a users table, etc.) once there's more than one admin.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const adminHash = process.env.ADMIN_PASSWORD_HASH;

        if (!email || !password || !adminEmail || !adminHash) return null;
        if (email !== adminEmail) return null;

        const valid = await bcrypt.compare(password, adminHash);
        if (!valid) return null;

        return { id: "admin", email: adminEmail, name: "Onyxo Admin" };
      },
    }),
  ],
});
