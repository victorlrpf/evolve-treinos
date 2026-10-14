export interface Palette {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryText: string;
  hero: string;
  background: string;
  card: string;
  inputBg: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  onPrimary: string;
}

export const palettes: { light: Palette; dark: Palette } = {
  light: {
    primary: '#7C3AED',
    primaryDark: '#5B21B6',
    primarySoft: '#EDE9FE',
    primaryText: '#6D28D9',
    hero: '#6D28D9',
    background: '#F7F5FF',
    card: '#FFFFFF',
    inputBg: '#FFFFFF',
    text: '#1E1B2E',
    textMuted: '#6B6785',
    border: '#E4E0F5',
    danger: '#DC2626',
    success: '#16A34A',
    onPrimary: '#FFFFFF',
  },
  dark: {
    primary: '#8B5CF6',
    primaryDark: '#6D28D9',
    primarySoft: '#2A2145',
    primaryText: '#C4B5FD',
    hero: '#3B1D7A',
    background: '#0F0B1A',
    card: '#1A1530',
    inputBg: '#15102A',
    text: '#F3F0FF',
    textMuted: '#A39FC0',
    border: '#2E2750',
    danger: '#EF4444',
    success: '#4ADE80',
    onPrimary: '#FFFFFF',
  },
};
