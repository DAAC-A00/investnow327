'use client';

import React, { useState } from 'react';
import { Button, Typography, Box, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function CounterPage() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  return (
    <Paper sx={{ padding: 3, margin: 2, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Counter
      </Typography>
      <Typography variant="h5" component="p" gutterBottom>
        Current count: {count}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={increment}>
          Increment
        </Button>
        <Button variant="outlined" startIcon={<RemoveIcon />} onClick={decrement}>
          Decrement
        </Button>
      </Box>
    </Paper>
  );
}
