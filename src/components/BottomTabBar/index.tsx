/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useRef } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { ThemeColors } from '@theme/types';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomBottomTabBarProps extends BottomTabBarProps {
  theme: ThemeColors;
  showLabelsInNav: boolean;
  renderIcon: ({
    color,
    route,
  }: {
    route: { name: string };
    color: string;
  }) => React.ReactNode;
}

function CustomBottomTabBar({
  navigation,
  state,
  descriptors,
  insets,
  theme,
  showLabelsInNav,
  renderIcon,
}: CustomBottomTabBarProps) {
  // Use the hook to get insets for native platforms
  const safeInsets = useSafeAreaInsets();
  // On native, use the insets; on web, CSS handles safe area via data attribute
  const bottomInset =
    Platform.OS === 'web' ? 0 : safeInsets.bottom || insets?.bottom || 0;

  const containerRef = useRef<View>(null);

  const getLabelText = useCallback(
    (route: any) => {
      if (!showLabelsInNav && route.name !== state.routeNames[state.index]) {
        return '';
      }

      const { options } = descriptors[route.key];
      const label =
        typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : typeof options.title === 'string'
          ? options.title
          : route.name;

      return label;
    },
    [descriptors, showLabelsInNav, state.index, state.routeNames],
  );

  // Web-specific props for safe area handling
  const webProps =
    Platform.OS === 'web'
      ? {
          'data-bottom-tab-bar': 'true',
        }
      : {};

  return (
    <View
      ref={containerRef}
      {...webProps}
      style={[
        styles.container,
        {
          backgroundColor: theme.surface2 || theme.surface,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const label = getLabelText(route);
        const isFocused = state.index === index;
        const showLabel = (showLabelsInNav || isFocused) && label;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconColor = isFocused
          ? theme.onPrimaryContainer
          : theme.onSurfaceVariant;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.pressable}
          >
            {/* Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transitionProperty: ['width', 'backgroundColor'],
                  transitionDuration: 250,
                  transitionTimingFunction: 'ease-in-out',
                  marginBottom: showLabel ? 4 : 20,
                  width: isFocused ? 52 : 32,
                  backgroundColor: isFocused
                    ? theme.primaryContainer
                    : 'transparent',
                },
              ]}
            >
              {renderIcon({ color: iconColor, route })}
            </Animated.View>

            {/* Label */}
            {showLabel ? (
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.onSurfaceVariant,
                    fontWeight: '700',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default CustomBottomTabBar;
export type { CustomBottomTabBarProps };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 80,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    borderRadius: 24,
  },
  label: {
    height: 16,
    fontSize: 12,
    textAlign: 'center',
  },
});
