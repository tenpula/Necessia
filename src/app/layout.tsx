import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

const FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Averia+Gruesa+Libre&display=swap',
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
] as const;

const BODY_CLASS_NAME =
  'bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden h-screen flex flex-col';

export const metadata: Metadata = {
  title: 'Necessia - Research Gap Visualizer',
  description: 'Visualize citation networks and discover research gaps in Computer Science papers',
  keywords: ['research', 'citation', 'network', 'visualization', 'computer science', 'arXiv'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {FONT_STYLESHEETS.map((href) => (
          <link key={href} href={href} rel="stylesheet" />
        ))}
      </head>
      <body className={BODY_CLASS_NAME}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
