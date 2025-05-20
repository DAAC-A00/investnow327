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

const tickerPages: TickerLink[] = [
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

export default function TickersHubPage() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Container maxWidth="sm" sx={{ py: theme.spacing(4) }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          mb: theme.spacing(3) 
        }}
      >
        <Image 
          src="/bybit_logo.svg" // Assuming your logo is here
          alt="Bybit Logo"
          width={40} // Adjust width as needed
          height={40} // Adjust height as needed
          style={{ marginRight: theme.spacing(1.5) }} // Add some space between logo and text
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
        }}
      >
        {tickerPages.map((page) => (
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
    </Container>
  );
}
