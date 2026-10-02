/**
 * M.A. GROUP OF COMPANIES - Enterprise Design System Tokens
 * Premium Black + Grey + Blue Palette
 */

export const THEME = {
  primary: {
    deepBlack: '#0B0D10', // Deepest background foundation
    richBlack: '#111318', // Surface cards & containers
  },
  secondary: {
    darkGrey: '#1A1D23',   // Elevated surfaces, borders, table headers
    mediumGrey: '#2B3038', // Muted borders, hover states, dividers
    lightGrey: '#6B7280',  // Subtext, tertiary information, icons
    softGrey: '#E5E7EB',   // Subtle tags, light backgrounds, borders
  },
  blue: {
    premium: '#2563EB',    // Primary action buttons, active states, key links
    bright: '#3B82F6',     // Interactive hover states, focus rings, highlights
    dark: '#1D4ED8',       // Pressed states, active badges
  },
  neutral: {
    white: '#FFFFFF',      // High-contrast headings and reading text
    offWhite: '#F8FAFC',   // Secondary readable text and light card canvas
  },
} as const;

export type ThemeColors = typeof THEME;
