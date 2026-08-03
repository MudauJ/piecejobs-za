/**
 * PieceJobs ZA brand palette — synced from the sibling web artifact's index.css.
 * Primary: #2D7DD2 (blue), Accent: #F5A623 (amber), Navy: #1B2E4B (dark navy)
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#1B2E4B',
    tint: '#2D7DD2',

    // Core surfaces
    background: '#F0F2F6',
    foreground: '#1B2E4B',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1B2E4B',

    // Primary action color (buttons, links, active states) — brand blue
    primary: '#2D7DD2',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#EBF2FB',
    secondaryForeground: '#1B2E4B',

    // Muted / subdued
    muted: '#F0F2F6',
    mutedForeground: '#6B7B8E',

    // Accent highlights — brand amber
    accent: '#F5A623',
    accentForeground: '#1B2E4B',

    // Destructive
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E1E6ED',
    input: '#E1E6ED',

    // Brand navy (used for headers / sidebar)
    navy: '#1B2E4B',
  },

  dark: {
    text: '#E8EDF2',
    tint: '#5B9EE0',
    background: '#0D1B2A',
    foreground: '#E8EDF2',
    card: '#1B2E4B',
    cardForeground: '#E8EDF2',
    primary: '#5B9EE0',
    primaryForeground: '#0D1B2A',
    secondary: '#243D5A',
    secondaryForeground: '#E8EDF2',
    muted: '#1B2E4B',
    mutedForeground: '#8CA0B5',
    accent: '#F5A623',
    accentForeground: '#0D1B2A',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    border: '#243D5A',
    input: '#243D5A',
    navy: '#0D1B2A',
  },

  // Border radius (px) — matches web --radius: 0.5rem = 8px
  radius: 10,
};

export default colors;
