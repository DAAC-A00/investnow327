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
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart'; // Added for Bybit Tickers
import { useRouter, usePathname } from 'next/navigation';
import { useNavigationStore } from '@/stores/navigationStore';

const NAV_ITEMS = [
  { text: 'Service Description', href: '/', icon: <HomeIcon /> },
  { text: 'Counter', href: '/counter', icon: <AddCircleOutlineIcon /> },
  { text: 'To-Do List', href: '/todo', icon: <CheckCircleOutlineIcon /> },
  { text: 'Exchange Rates', href: '/exchange-rates', icon: <AttachMoneyIcon /> },
  { text: 'Bybit Tickers', href: '/bybit-tickers', icon: <ShowChartIcon /> }, // New Menu Item
];

const DRAWER_WIDTH = 240;

export default function AppNavigation({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const pathname = usePathname();
  const { isDrawerOpen, toggleDrawer, closeDrawer } = useNavigationStore(); // Removed openDrawer as it's not used

  const [mobileNavValue, setMobileNavValue] = React.useState(pathname);

  React.useEffect(() => {
    const currentItem = NAV_ITEMS.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
    if (currentItem) {
      setMobileNavValue(currentItem.href);
    } else {
      // If no exact match (e.g. a sub-route not in NAV_ITEMS), find the closest parent
      const parentItem = NAV_ITEMS.find(item => item.href !== '/' && pathname.startsWith(item.href));
      if (parentItem) {
        setMobileNavValue(parentItem.href);
      } else if (pathname === '/') {
        setMobileNavValue('/');
      }
    }
  }, [pathname]);

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile) { // Only close drawer if it's a temporary mobile one (if implemented)
        closeDrawer(); 
    }
  };

  const drawerContent = (
    <Box
      sx={{ width: DRAWER_WIDTH }}
      role="presentation"
      // onClick={isMobile ? toggleDrawer : undefined} // Example for temporary mobile drawer
      // onKeyDown={isMobile ? toggleDrawer : undefined}
    >
      <Toolbar /> 
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation(item.href)} 
              selected={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          top: isMobile ? 'auto' : 0,
          bottom: isMobile ? 0 : 'auto',
          backgroundColor: theme.palette.background.paper,
          zIndex: (theme: Theme) => theme.zIndex.drawer + (isMobile? 0 : 1) 
        }}
      >
        {isMobile ? (
          <BottomNavigation
            showLabels
            value={mobileNavValue}
            onChange={(event, newValue) => {
              handleNavigation(newValue);
            }}
          >
            {NAV_ITEMS.map((item) => (
              <BottomNavigationAction key={item.text} label={item.text} value={item.href} icon={item.icon} />
            ))}
          </BottomNavigation>
        ) : (
          <Toolbar>
            {/* Hamburger for temporary mobile drawer, if implemented */}
            {/* {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={toggleDrawer} // Only if mobile drawer is temporary, not persistent
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )} */}
            <Typography variant="h6" noWrap component="div">
              {NAV_ITEMS.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))?.text || 'App'}
            </Typography>
          </Toolbar>
        )}
      </AppBar>

      {!isMobile && (
        <Drawer
          variant="persistent"
          open={true} // Persistent drawer is always open on desktop
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: DRAWER_WIDTH, 
              boxSizing: 'border-box', 
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Main Content Box */}
      <Box 
        component="main" 
        sx={{
          flexGrow: 1, 
          p: 3, 
          width: isMobile? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
          marginTop: isMobile ? 0 : `64px`, // Desktop AppBar height
          marginBottom: isMobile ? `56px` : 0, // Mobile BottomNavigation height
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
