import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AuthHashHandler from './AuthHashHandler';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Claimsy - Recognition made easy',
  description: 'Build a culture of recognition with Claimsy. Give karma, celebrate wins, and redeem rewards with simple workflows that drive engagement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthHashHandler />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
