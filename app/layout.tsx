import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = {
  title: 'ClipSpill',
  description: 'Turn real viewer questions into your next video.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
