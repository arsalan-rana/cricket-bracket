// app/components/NavBar.tsx
'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import DeadlineCountdown from './DeadlineCountdown';
import { getConfig } from '@/lib/useTournament';

const NavBar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const config = getConfig();

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/bracket', label: 'Your Bracket', icon: '🏏' },
    { href: '/fixtures', label: 'Fixture Picks', icon: '📊' },
    { href: '/bonus-picks', label: 'Bonus Picks', icon: '🎯' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/rules', label: 'Rules', icon: '📋' },
  ];

  const list = () => (
    <Box
      sx={{
        width: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, #10044A 0%, #1C5D9C 50%, #10044A 100%)',
        color: 'white',
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box>
        <Box sx={{ p: 3, borderBottom: '2px solid rgba(255,145,0,0.3)' }}>
          <Typography variant="h6" sx={{
            fontWeight: 800,
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            🏏 Navigation
          </Typography>
        </Box>
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} passHref>
                <ListItem
                  button
                  component="a"
                  sx={{
                    mx: 2,
                    mb: 1,
                    borderRadius: 3,
                    backgroundColor: isActive
                      ? 'linear-gradient(135deg, rgba(255,145,0,0.3) 0%, rgba(2,167,209,0.2) 100%)'
                      : 'transparent',
                    border: isActive ? '1px solid rgba(255,145,0,0.5)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,145,0,0.15)',
                      transform: 'translateX(4px)',
                      borderColor: 'rgba(255,145,0,0.3)',
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? '0 4px 12px rgba(255,145,0,0.2)' : 'none',
                  }}
                >
                  <Typography sx={{
                    mr: 2,
                    fontSize: '1.3rem',
                    filter: isActive ? 'drop-shadow(0 2px 4px rgba(255,145,0,0.5))' : 'none',
                  }}>
                    {item.icon}
                  </Typography>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500,
                      color: 'white',
                      fontSize: '0.95rem',
                    }}
                  />
                  {isActive && (
                    <Box
                      sx={{
                        width: 6,
                        height: 24,
                        background: 'linear-gradient(180deg, #FF9100 0%, #02A7D1 100%)',
                        borderRadius: 3,
                        boxShadow: '0 2px 8px rgba(255,145,0,0.5)',
                      }}
                    />
                  )}
                </ListItem>
              </Link>
            );
          })}
        </List>
      </Box>
      <Box
        sx={{
          padding: 2,
          borderTop: '2px solid rgba(255,145,0,0.3)',
        }}
      >
        <List>
          <ListItem
            button
            onClick={() => signOut()}
            sx={{
              background: 'linear-gradient(135deg, #DA2C5A 0%, #FF9100 100%)',
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(218,44,90,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #C02050 0%, #E68100 100%)',
                transform: 'scale(1.02)',
                boxShadow: '0 6px 16px rgba(218,44,90,0.4)',
              },
              transition: 'all 0.3s ease-in-out',
            }}
          >
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                align: 'center',
                sx: {
                  fontWeight: 700,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                },
              }}
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{
        background: 'linear-gradient(135deg, #10044A 0%, #1C5D9C 50%, #10044A 100%)',
        boxShadow: '0 4px 24px rgba(16, 4, 74, 0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexGrow: 1,
            justifyContent: 'center'
          }}>
            {/* ICC T20 WC Logo */}
            <Box
              component="img"
              src="https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/2026_ICC_Men%27s_T20_World_Cup_logo.svg/1280px-2026_ICC_Men%27s_T20_World_Cup_logo.svg.png"
              alt="ICC Logo"
              sx={{
                height: { xs: 28, sm: 32 },
                width: 'auto',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            />
            <Typography variant="h6" sx={{
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #02A7D1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}>
              {config.name}
            </Typography>
          </Box>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{
              backgroundColor: 'rgba(255, 145, 0, 0.1)',
              border: '1px solid rgba(255, 145, 0, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 145, 0, 0.2)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
        {/* Insert the countdown banner below the toolbar */}
        <DeadlineCountdown />
      </AppBar>
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        {list()}
      </Drawer>
    </>
  );
};

export default NavBar;