'use client';

import * as React from 'react';
import { useTheme, Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Keep import for back button icon
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Paper from '@mui/material/Paper';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import { useRouter, usePathname } from 'next/navigation';
// Import leftButtonAction and showMenuButton from useNavigationStore
import { useNavigationStore, NavLink } from '@/stores/navigationStore'; 

const DRAWER_WIDTH = 240;

const getIconForLink = (label: string): React.ReactNode => {
  if (label === 'Counter') return <AddCircleOutlineIcon />;
  if (label === 'Todo List') return <CheckCircleOutlineIcon />;
  if (label === 'Exchange Rates') return <AttachMoneyIcon />;
  if (label === 'Tickers') return <ShowChartIcon />;
  return <HomeIcon />;
};

export default function AppNavigation({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const pathname = usePathname();
  // Use state and actions from the navigation store, including new ones
  const { isDrawerOpen, toggleDrawer, closeDrawer, navLinks, appbarTitle, showMenuButton, leftButtonAction } = useNavigationStore();

   const isDetailPage = pathname.startsWith('/bybit-spot-tickers') || 
                        pathname.startsWith('/bybit-linear-tickers') || 
                        pathname.startsWith('/bybit-inverse-tickers');

  const handleNavigate = (path: string) => {
    if (path === '#') return;
    router.push(path);
    if (isMobile) {
      closeDrawer();
    }
  };

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH }} role="presentation">
      <Toolbar />
      <List>
        {navLinks.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              selected={pathname === item.path || (item.path === '/tickers' && isDetailPage)}
            >
              <ListItemIcon>{getIconForLink(item.label)}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // Determine bottom navigation value based on current path and detail page status
  let bottomNavValue = navLinks.findIndex(item =>
    pathname === item.path || (item.path === '/tickers' && isDetailPage)
  );
  if (bottomNavValue === -1 && pathname !== '/') bottomNavValue = 0;


  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {/* Conditionally render Menu or Back icon based on showMenuButton state */}
          {showMenuButton ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          ) : ( // If not showing menu button, show back button if action is defined
             leftButtonAction && (
                <IconButton
                  color="inherit"
                  aria-label="go back"
                  edge="start"
                  onClick={leftButtonAction}
                  sx={{ mr: 2 }}
                >
                  <ArrowBackIcon />
                </IconButton>
             )
          )}
          {/* Use appbarTitle from the store for the AppBar title */}
          <Typography variant="h6" noWrap component="div">
            {appbarTitle}
          </Typography>
        </Toolbar>
      </AppBar>
      {/* Drawer is hidden on detail pages, always temporary on mobile, and permanent on larger screens if not detail page */}
      <Drawer
        variant={isMobile || isDetailPage ? 'temporary' : 'permanent'}
        open={isMobile ? isDrawerOpen : !isDetailPage && isDrawerOpen} // Control open state based on mobile and detail page
        onClose={closeDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          // Adjust width based on whether it's a permanent drawer
          width: !isMobile && !isDetailPage ? DRAWER_WIDTH : 0,
          flexShrink: 0,
           // Hide permanent drawer visually when not on a normal list page
          ['& .MuiDrawer-paper']: { 
              width: DRAWER_WIDTH, 
              boxSizing: 'border-box',
              display: !isMobile && isDetailPage ? 'none' : 'block' // Hide permanent drawer on detail pages
          },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Adjust main content margin based on whether permanent drawer is visible */}
       <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: !isMobile && !isDetailPage ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          marginLeft: { sm: !isMobile && !isDetailPage ? `${DRAWER_WIDTH}px` : 0 },
        }}
      >
        <Toolbar />
        {children}
        {/* Bottom navigation visible on mobile and not on detail pages */}
        {isMobile && !isDetailPage && (
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }} elevation={3}>
            <BottomNavigation
              showLabels
              value={bottomNavValue >=0 ? bottomNavValue : 0}
              onChange={(event, newValue) => {
                const selectedLink = navLinks[newValue];
                if (selectedLink) {
                  handleNavigate(selectedLink.path);
                }
              }}
            >
              {navLinks.map((item) => (
                <BottomNavigationAction
                  key={item.label}
                  label={item.label}
                  icon={getIconForLink(item.label)}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
