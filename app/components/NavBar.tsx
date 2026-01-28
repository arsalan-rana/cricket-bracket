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
        background: 'linear-gradient(180deg, #1B5E20 0%, #2E7D32 100%)',
        color: 'white',
      }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box>
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
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
                    borderRadius: 2,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <Typography sx={{ mr: 2, fontSize: '1.2rem' }}>
                    {item.icon}
                  </Typography>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      color: 'white',
                    }}
                  />
                  {isActive && (
                    <Box
                      sx={{
                        width: 4,
                        height: 20,
                        backgroundColor: '#FF6F00',
                        borderRadius: 2,
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
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <List>
          <ListItem
            button
            onClick={() => signOut()}
            sx={(theme) => ({
              backgroundColor: theme.palette.error.light,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: theme.palette.error.main,
              },
            })}
          >
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                align: 'center',
                sx: { fontWeight: 600, color: (theme) => theme.palette.error.contrastText },
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
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
        boxShadow: '0 4px 20px rgba(27, 94, 32, 0.3)'
      }}>
        <Toolbar>
          <Typography variant="h6" sx={{
            flexGrow: 1,
            textAlign: 'center',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            🏏 {config.name}
          </Typography>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="menu" 
            onClick={toggleDrawer(true)}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(255,255,255,0.1)' 
              } 
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