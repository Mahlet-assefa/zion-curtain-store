import type { Metadata } from 'next'; import './globals.css';
export const metadata: Metadata = { title: 'Zion | Curtain store operations', description: 'Inventory, finance and debit management for Zion Curtains' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
