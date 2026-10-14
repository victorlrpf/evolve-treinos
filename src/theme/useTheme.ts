import { useColorScheme } from 'react-native';
import { useApp } from '../store/AppContext';
import { Palette, palettes } from './colors';

export function useTheme(): { isDark: boolean; colors: Palette } {
  const { themeMode } = useApp();
  const system = useColorScheme();
  const isDark = themeMode === 'system' ? system === 'dark' : themeMode === 'dark';
  return { isDark, colors: isDark ? palettes.dark : palettes.light };
}
