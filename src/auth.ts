import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import { env } from '@/lib/config/env';
import { authConfig } from './auth.config';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    }),
    ...(env.NODE_ENV === 'development'
      ? [
          Credentials({
            name: 'Development Login',
            credentials: {
              email: { label: 'Email', type: 'email', placeholder: 'dev@traceend.local' },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              
              const user = await db.user.findUnique({
                where: { email: credentials.email as string }
              });

              if (user) {
                return user;
              }

              // Create user if not exists for easy dev
              return await db.user.create({
                data: {
                  email: credentials.email as string,
                  name: (credentials.email as string).split('@')[0],
                }
              });
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});
