import { type NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// İcazəli e-poçt domenləri (tək-tenant tətbiq onsuz da təşkilatla məhdudlaşdırır)
const ALLOWED_DOMAINS = ["adda.edu.az", "asco.az"];

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as any;
        token.email = (p.email || p.preferred_username || p.upn || token.email || "").toLowerCase();
        token.name = p.name || token.name;
      }
      return token;
    },
    async signIn({ profile }) {
      const p = profile as any;
      const email = String(p?.email || p?.preferred_username || p?.upn || "").toLowerCase();
      if (!email) return true;
      return ALLOWED_DOMAINS.some((d) => email.endsWith("@" + d));
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
