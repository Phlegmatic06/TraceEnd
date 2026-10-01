import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  session: { strategy: 'jwt' },
  providers: [], // Added in auth.ts
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp = nextUrl.pathname.startsWith('/dashboard') || 
                      nextUrl.pathname.startsWith('/settings') ||
                      nextUrl.pathname.startsWith('/assets') ||
                      nextUrl.pathname.startsWith('/scans') ||
                      nextUrl.pathname.startsWith('/findings');
                      
      if (isOnApp) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && (nextUrl.pathname === '/' || nextUrl.pathname === '/login')) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
