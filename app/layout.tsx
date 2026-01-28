'use client';

import { SessionProvider } from 'next-auth/react';
import NavBar from './components/NavBar';
import Script from 'next/script';
import '../styles/globals.css';
import { ThemeProvider, CssBaseline, Switch, Box } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import Brightness2Icon from '@mui/icons-material/Brightness2';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Define cricket-themed light and dark themes.
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { 
      main: '#1B5E20', // Cricket green
      light: '#4C8C4A',
      dark: '#003D00',
    },
    secondary: {
      main: '#FF6F00', // Cricket orange (for accents)
      light: '#FFA040',
      dark: '#C43E00',
    },
    success: {
      main: '#2E7D32', // Win green
    },
    warning: {
      main: '#ED6C02', // Draw/warning orange
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { 
      main: '#4CAF50', // Brighter cricket green for dark mode
      light: '#81C784',
      dark: '#2E7D32',
    },
    secondary: {
      main: '#FF9800', // Orange accent for dark mode
      light: '#FFB74D',
      dark: '#F57C00',
    },
    success: {
      main: '#4CAF50',
    },
    warning: {
      main: '#FF9800',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Initialize with a lazy initializer.
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('themeMode');
      return storedMode === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

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
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <NavBar />
            {/* Dark mode toggle positioned at top-left */}
            <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}>
              <Switch
                checked={mode === 'dark'}
                onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                // Always use white icons so they're visible on the black navbar.
                icon={<WbSunnyIcon sx={{ color: 'white' }} />}
                checkedIcon={<Brightness2Icon sx={{ color: 'white' }} />}
              />
            </Box>
            <div style={{ marginTop: '80px' }}>
              {children}
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}