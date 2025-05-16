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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Added for back button
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
// import InfoIcon from '@mui/icons-material/Info'; // Service Description 아이콘이므로 제거

import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore, NavLink } from '@/stores/navigationStore';

const DRAWER_WIDTH = 240;

const getIconForLink = (label: string): React.ReactNode => {
  // if (label === 'Service Description') return <InfoIcon />;
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
  const { isDrawerOpen, toggleDrawer, closeDrawer, navLinks } = useNavigationStore();

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

  let currentPageLabel = ' '; 
  if (isDetailPage) {
    if (pathname.startsWith('/bybit-spot-tickers')) {
      currentPageLabel = 'Bybit Spot Tickers';
    } else if (pathname.startsWith('/bybit-linear-tickers')) {
      currentPageLabel = 'Bybit Linear Tickers';
    } else if (pathname.startsWith('/bybit-inverse-tickers')) {
      currentPageLabel = 'Bybit Inverse Tickers';
    }
  } else {
    const activeLink = navLinks.find(item => item.path === pathname);
    if (activeLink) {
      currentPageLabel = activeLink.label;
    } else if (pathname === '/') {
      const homeLink = navLinks.find(item => item.path === '/');
      currentPageLabel = homeLink ? homeLink.label : 'Dashboard';
    }
  }
  
  let bottomNavValue = navLinks.findIndex(item => 
    pathname === item.path || (item.path === '/tickers' && isDetailPage)
  );
  if (bottomNavValue === -1 && pathname !== '/') bottomNavValue = 0; 

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme: Theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isDetailPage ? (
            <IconButton
              color="inherit"
              aria-label="go back"
              edge="start"
              onClick={() => router.back()}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div">
            {currentPageLabel}
          </Typography>
        </Toolbar>
      </AppBar>
      {!isDetailPage && (
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isDrawerOpen}
          onClose={closeDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
       <Box 
        component="main" 
        sx={{
          flexGrow: 1, 
          p: 3, 
          width: { sm: !isDetailPage ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          marginLeft: { sm: !isDetailPage ? `${DRAWER_WIDTH}px` : 0 }, // Adjust margin when drawer is hidden
        }}
      >
        <Toolbar />  
        {children}
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
