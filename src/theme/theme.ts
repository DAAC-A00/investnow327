'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// Create a theme instance.
let theme = createTheme({
  palette: {
    mode: 'light', // Default to light mode, can be configured or made dynamic later
    primary: {
      main: '#6750A4', // Example MD3 primary color
    },
    secondary: {
      main: '#625B71', // Example MD3 secondary color
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#FFFBFE', // Example MD3 background
      paper: '#FFFBFE',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    // Apply MD3 type scale adjustments if possible, or use defaults
    // For example, slightly different default font sizes or weights
  },
  shape: {
    borderRadius: 16, // MD3 often uses more rounded corners
  },
  components: {
    // Example: Default props for MuiButton to align with MD3 a bit more
    MuiButton: {
      styleOverrides: {
        root: {
          // textTransform: 'none', // MD3 buttons tend not to have all-caps text
          borderRadius: '20px', // Pill-shaped buttons are common
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: '16px', // Rounded inputs
          backgroundColor: '#E7E0EC', // Example MD3 input background
          '&:hover': {
            backgroundColor: '#E7E0EC', // Maintain background on hover
          },
          '&.Mui-focused': {
            backgroundColor: '#E7E0EC', // Maintain background on focus
          },
        },
        underline: {
            '&:before': {
                borderBottom: 'none',
            },
            '&:hover:before': {
                borderBottom: 'none', 
            },
            '&:after': {
                borderBottom: 'none', 
            }
        }
      },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                borderRadius: '16px', // Rounded inputs
            },
        }
    },
    MuiPaper: {
        styleOverrides: {
            elevation1: {
                boxShadow: '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)', // MD3 elevation style
            }
        }
    }
    // Further component customizations can be added here
  },
});

theme = responsiveFontSizes(theme);

export default theme;
