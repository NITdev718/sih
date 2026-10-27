import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import { DemoBanner, Footer } from '@/components/Footer';

export const metadata = {
  title: 'APAAR-Verify - One Student. One ID. Instant Verification.',
  description: 'Prototype platform for APAAR ID-based student data management and consent-based verification (SIH26263). All data is fictional.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

// Runs before first paint so there is no flash of the wrong theme.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white">
            Skip to content
          </a>
          <DemoBanner />
          <Navbar />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
