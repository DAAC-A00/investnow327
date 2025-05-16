'use client';

import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

export default function ServiceDescriptionPage() {
  return (
    <Container maxWidth="md">
      <Paper sx={{ padding: 3, marginY: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Our Simple Service
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to our application! This is a simple service designed to demonstrate key features
          of a Next.js application built with Material UI, Zustand, and TypeScript.
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom sx={{ marginTop: 3 }}>
          Features Implemented:
        </Typography>
        <ul>
          <li>
            <Typography variant="body1">A fully functional Counter.</Typography>
          </li>
          <li>
            <Typography variant="body1">A basic To-Do list manager.</Typography>
          </li>
          <li>
            <Typography variant="body1">Responsive navigation (Bottom Navigation for mobile, Drawer for desktop).</Typography>
          </li>
          <li>
            <Typography variant="body1">Modern UI styled with Material Design 3 principles using MUI.</Typography>
          </li>
        </ul>
        <Typography variant="body1" paragraph sx={{ marginTop: 2 }}>
          Explore the different sections using the navigation menu. We hope you find this demonstration helpful!
        </Typography>
      </Paper>
    </Container>
  );
}

// Replace the existing content of src/app/page.tsx with this
// if you want the service description to be the home page.
// For now, this will be available at /service-description route.
// We will make this the root page shortly.
