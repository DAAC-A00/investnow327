'use client';

import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';

interface TickerDetailPageProps {
  params: {
    category: string;
    symbol: string;
  };
}

export default function TickerDetailPage({ params }: TickerDetailPageProps) {
  const { category, symbol } = params;

  // In a real application, you would fetch more details about the ticker here
  // using the category and symbol.

  if (!category || !symbol) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ padding: 3, marginY: 2 }}>
          <Alert severity="error">Category or Symbol not provided.</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: { xs: 2, sm: 3 }, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ticker Detail
        </Typography>
        <Box sx={{ marginTop: 2 }}>
          <Typography variant="h6">
            Category: <Typography component="span" sx={{ fontWeight: 'bold' }}>{decodeURIComponent(category)}</Typography>
          </Typography>
          <Typography variant="h6" sx={{ marginTop: 1 }}>
            Symbol: <Typography component="span" sx={{ fontWeight: 'bold' }}>{decodeURIComponent(symbol)}</Typography>
          </Typography>
        </Box>
        <Box sx={{ marginTop: 3, textAlign: 'center' }}>
           {/* TODO: Add more detailed information about the ticker here */}
          <Typography variant="body1" color="text.secondary">
            More details for {decodeURIComponent(symbol)} will be displayed here.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
