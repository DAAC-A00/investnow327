'use client';

import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  // Grid, // Removed Grid
  useTheme, // Added useTheme to access spacing
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface TickerLink {
  label: string;
  path: string;
  description: string;
}

const tickerPages: TickerLink[] = [
  {
    label: 'Bybit Spot Tickers',
    path: '/bybit-spot-tickers',
    description: 'View live spot market data from Bybit, sorted by turnover.',
  },
  {
    label: 'Bybit Linear Tickers',
    path: '/bybit-linear-tickers',
    description: 'View live linear perpetual contract data from Bybit, sorted by turnover.',
  },
  {
    label: 'Bybit Inverse Tickers',
    path: '/bybit-inverse-tickers',
    description: 'View live inverse contract data from Bybit, sorted by turnover.',
  },
];

export default function TickersHubPage() {
  const router = useRouter();
  const theme = useTheme(); // For accessing theme.spacing

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Ticker Pages
        </Typography>

        <Box 
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center', // Or 'flex-start' if you prefer items to align left
            gap: theme.spacing(3), // Replicates Grid spacing={3}
          }}
        >
          {tickerPages.map((page) => (
            <Box 
              key={page.label} 
              sx={{
                width: { 
                  xs: '100%', 
                  sm: `calc(50% - ${theme.spacing(1.5)})`, // (spacing/2) for 2 items per row
                  md: `calc(33.333% - ${theme.spacing(2)})`  // (spacing*2/3) for 3 items per row, approximation
                },
                minWidth: { 
                    xs: '100%', 
                    sm: '280px', // Ensure a minimum reasonable width for items
                    md: '280px'
                },
                display: 'flex', // To make Paper inside take full height if needed
              }}
            >
              <Paper elevation={2} sx={{ p: 2, textAlign: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {page.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {page.description}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  onClick={() => handleNavigate(page.path)} 
                  fullWidth
                >
                  Go to {page.label.replace('Bybit ', '').replace(' Tickers','')}
                </Button>
              </Paper>
            </Box>
          ))}
        </Box>
      </Paper>
    </Container>
  );
}
