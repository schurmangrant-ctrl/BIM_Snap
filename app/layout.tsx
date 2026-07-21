import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BIMsnap',
  description: 'Client-side BIM asset generation for architects and designers.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
