'use client';

import { SessionProvider } from 'next-auth/react';
import NavBar from './components/NavBar';
import Script from 'next/script';
import '../styles/globals.css';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1C5D9C', // Lapis Blue for dark mode
      light: '#02A7D1',
      dark: '#10044A',
    },
    secondary: {
      main: '#FF9100', // ICC Orange
      light: '#FFB74D',
      dark: '#F57C00',
    },
    success: {
      main: '#02A7D1', // Electric Blue
    },
    warning: {
      main: '#FF9100',
    },
    error: {
      main: '#DA2C5A', // Cerise Pink
    },
    background: {
      default: '#0A0A0A', // Vampire Black
      paper: '#1A1A2E',
    },
    info: {
      main: '#02A7D1',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(2, 167, 209, 0.08)',
    '0px 4px 8px rgba(2, 167, 209, 0.12)',
    '0px 8px 16px rgba(2, 167, 209, 0.16)',
    '0px 12px 24px rgba(2, 167, 209, 0.20)',
    '0px 16px 32px rgba(2, 167, 209, 0.24)',
    '0px 20px 40px rgba(2, 167, 209, 0.28)',
    '0px 24px 48px rgba(2, 167, 209, 0.32)',
    '0px 2px 4px rgba(2, 167, 209, 0.08)',
    '0px 4px 8px rgba(2, 167, 209, 0.12)',
    '0px 8px 16px rgba(2, 167, 209, 0.16)',
    '0px 12px 24px rgba(2, 167, 209, 0.20)',
    '0px 16px 32px rgba(2, 167, 209, 0.24)',
    '0px 20px 40px rgba(2, 167, 209, 0.28)',
    '0px 24px 48px rgba(2, 167, 209, 0.32)',
    '0px 2px 4px rgba(2, 167, 209, 0.08)',
    '0px 4px 8px rgba(2, 167, 209, 0.12)',
    '0px 8px 16px rgba(2, 167, 209, 0.16)',
    '0px 12px 24px rgba(2, 167, 209, 0.20)',
    '0px 16px 32px rgba(2, 167, 209, 0.24)',
    '0px 20px 40px rgba(2, 167, 209, 0.28)',
    '0px 24px 48px rgba(2, 167, 209, 0.32)',
    '0px 2px 4px rgba(2, 167, 209, 0.08)',
    '0px 4px 8px rgba(2, 167, 209, 0.12)',
    '0px 8px 16px rgba(2, 167, 209, 0.16)',
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Cricket Bracket</title>
        <meta name="description" content="Cricket Bracket Challenge - Make your predictions and compete with friends!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏏</text></svg>" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
          `}
        </Script>
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <NavBar />
            <div style={{ marginTop: '80px' }}>
              {children}
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}