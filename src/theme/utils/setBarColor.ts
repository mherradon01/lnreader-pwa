import { Platform, StatusBar } from 'react-native';
import { ThemeColors } from '@theme/types';
import * as NavigationBar from 'expo-navigation-bar';
import Color, { ColorInstance } from 'color';

const setWebThemeColor = (color: string) => {
  if (typeof document === 'undefined') return;
  
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', color);
};

export const setStatusBarColor = (color: ThemeColors | ColorInstance) => {
  if (Platform.OS === 'web') {
    if (color instanceof Color) {
      setWebThemeColor(color.hexa());
    }
    return;
  }
  if (color instanceof Color) {
    // fullscreen reader mode
    StatusBar.setBarStyle(color.isDark() ? 'light-content' : 'dark-content');
    StatusBar.setBackgroundColor(color.hexa());
  } else {
    StatusBar.setTranslucent(true);
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setBarStyle(color.isDark ? 'light-content' : 'dark-content');
  }
};

export const changeNavigationBarColor = (color: string, isDark = false) => {
  if (Platform.OS === 'web') {
    setWebThemeColor(color);
    return;
  }
  NavigationBar.setBackgroundColorAsync(color);
  NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
};
