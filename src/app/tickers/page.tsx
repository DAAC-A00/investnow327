'use client';

import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  useTheme,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import the Next.js Image component

interface TickerLink {
  name: string;
  path: string;
}

const bybitTickerPages: TickerLink[] = [
  {
    name: 'Spot',
    path: '/tickers/bybit/spot',
  },
  {
    name: 'Linear',
    path: '/tickers/bybit/linear',
  },
  {
    name: 'Inverse',
    path: '/tickers/bybit/inverse',
  },
];

const bithumbTickerPages: TickerLink[] = [
  {
    name: 'Spot',
    path: '/tickers/bithumb/spot',
  },
];

export default function TickersHubPage() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Container maxWidth="sm" sx={{ py: theme.spacing(4) }}>
      {/* Bybit Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: theme.spacing(3) 
        }}
      >
        <Image 
          src="/images/exchangeBybit.jpeg"
          alt="Bybit Logo"
          width={40}
          height={40}
          style={{ marginRight: theme.spacing(1.5), }}
        />
        <Typography variant="h4" component="h1">
          Bybit
        </Typography>
      </Box>
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(2),
          mb: theme.spacing(5),
        }}
      >
        {bybitTickerPages.map((page) => (
          <Button
            key={page.path}
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => router.push(page.path)}
            sx={{
              py: theme.spacing(1.5),
              fontSize: '1rem',
            }}
          >
            {page.name}
          </Button>
        ))}
      </Box>

      {/* Bithumb Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: theme.spacing(3) 
        }}
      >
        <Image 
          src="/images/exchangeBithumb.png"
          alt="Bithumb Logo"
          width={40}
          height={40}
          style={{ marginRight: theme.spacing(1.5), }}
        />
        <Typography variant="h4" component="h1">
          Bithumb
        </Typography>
      </Box>
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(2),
        }}
      >
        {bithumbTickerPages.map((page) => (
          <Button
            key={page.path}
            variant="contained"
            color="secondary"
            fullWidth
            onClick={() => router.push(page.path)}
            sx={{
              py: theme.spacing(1.5),
              fontSize: '1rem',
            }}
          >
            {page.name}
          </Button>
        ))}
      </Box>
    </Container>
  );
}
