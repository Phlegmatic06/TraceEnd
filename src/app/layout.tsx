import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'TraceEnd — Personal Attack Surface Management',
    template: '%s — TraceEnd',
  },
  description:
    'Discover your exposure. Understand the risk. Fix it. Verify it. TraceEnd brings breach exposure, asset security, technical findings and remediation into one security workspace.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
