/**
 * Web shim for react-native-tab-view
 * Provides simplified web-compatible implementations that avoid animation issues
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, Dimensions } from 'react-native';

// Get initial dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TabBar component
const TabBar = ({
  navigationState,
  position,
  jumpTo,
  renderLabel,
  renderIcon,
  renderBadge,
  renderIndicator,
  renderTabBarItem,
  onTabPress,
  onTabLongPress,
  activeColor,
  inactiveColor,
  pressColor,
  pressOpacity,
  scrollEnabled,
  bounces,
  tabStyle,
  indicatorStyle,
  indicatorContainerStyle,
  labelStyle,
  contentContainerStyle,
  style,
  gap,
  testID,
  android_ripple,
  ...rest
}) => {
  const { routes, index } = navigationState;
  const [tabMeasurements, setTabMeasurements] = useState({});

  const handleTabLayout = useCallback((i, event) => {
    const { x, width } = event.nativeEvent.layout;
    setTabMeasurements((prev) => ({
      ...prev,
      [i]: { x, width },
    }));
  }, []);

  const activeTabMeasurement = tabMeasurements[index];

  return (
    <View style={[styles.tabBar, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        bounces={bounces}
        contentContainerStyle={contentContainerStyle}
      >
        {routes.map((route, i) => {
          const focused = index === i;
          const color = focused ? activeColor : inactiveColor;

          const handlePress = () => {
            onTabPress?.({ route, preventDefault: () => {} });
            jumpTo(route.key);
          };

          if (renderTabBarItem) {
            return renderTabBarItem({
              key: route.key,
              route,
              focused,
              onPress: handlePress,
              onLongPress: () => onTabLongPress?.({ route }),
            });
          }

          return (
            <Pressable
              key={route.key}
              style={[styles.tabItem, tabStyle, gap ? { marginHorizontal: gap / 2 } : null]}
              onPress={handlePress}
              onLongPress={() => onTabLongPress?.({ route })}
              testID={testID ? `${testID}-tab-${route.key}` : undefined}
              onLayout={(e) => handleTabLayout(i, e)}
            >
              {renderIcon?.({ route, focused, color })}
              {renderLabel ? (
                renderLabel({ route, focused, color })
              ) : (
                <Text style={[styles.tabLabel, { color }, labelStyle]}>
                  {route.title || route.key}
                </Text>
              )}
              {renderBadge?.({ route })}
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Indicator */}
      <View
        style={[
          styles.indicator,
          indicatorStyle,
          activeTabMeasurement
            ? {
                width: activeTabMeasurement.width,
                left: activeTabMeasurement.x,
              }
            : {
                width: 0,
                left: 0,
              },
        ]}
      />
    </View>
  );
};

// SceneMap helper
const SceneMap = (scenes) => {
  return ({ route, jumpTo, position }) => {
    const Scene = scenes[route.key];
    return Scene ? <Scene jumpTo={jumpTo} /> : null;
  };
};

// Main TabView component
const TabView = ({
  navigationState,
  renderScene,
  renderTabBar = (props) => <TabBar {...props} />,
  renderLazyPlaceholder = () => null,
  onIndexChange,
  initialLayout,
  lazy = false,
  lazyPreloadDistance = 0,
  sceneContainerStyle,
  pagerStyle,
  style,
  swipeEnabled = true,
  tabBarPosition = 'top',
  keyboardDismissMode = 'auto',
  animationEnabled = false,
  onSwipeStart,
  onSwipeEnd,
  commonOptions,
  ...rest
}) => {
  const { routes, index } = navigationState;
  const [layout, setLayout] = useState({
    width: initialLayout?.width || SCREEN_WIDTH,
    height: initialLayout?.height || 0,
  });
  const [loadedIndices, setLoadedIndices] = useState(new Set([index]));

  const handleLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
  }, [layout]);

  const jumpTo = useCallback((key) => {
    const newIndex = routes.findIndex((route) => route.key === key);
    if (newIndex !== -1 && newIndex !== index) {
      onIndexChange(newIndex);
    }
  }, [routes, index, onIndexChange]);

  // Track loaded indices for lazy loading
  React.useEffect(() => {
    if (lazy) {
      setLoadedIndices((prev) => {
        const next = new Set(prev);
        // Add current index
        next.add(index);
        // Add indices within preload distance
        for (let i = 1; i <= lazyPreloadDistance; i++) {
          if (index + i < routes.length) next.add(index + i);
          if (index - i >= 0) next.add(index - i);
        }
        return next;
      });
    }
  }, [index, lazy, lazyPreloadDistance, routes.length]);

  // Mock position for tab bar (simplified for web)
  const position = useMemo(() => ({
    interpolate: ({ inputRange, outputRange }) => {
      // Return the output value corresponding to current index
      const i = inputRange.indexOf(index);
      return i !== -1 ? outputRange[i] : outputRange[0];
    },
  }), [index]);

  const renderSceneWithProps = useCallback((route, i) => {
    if (lazy && !loadedIndices.has(i)) {
      return renderLazyPlaceholder({ route });
    }
    return renderScene({ route, jumpTo, position });
  }, [lazy, loadedIndices, renderScene, jumpTo, position, renderLazyPlaceholder]);

  // Merge common options with renderLabel if provided
  const tabBarProps = {
    navigationState,
    position,
    jumpTo,
    ...commonOptions,
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {tabBarPosition === 'top' && renderTabBar(tabBarProps)}
      <View style={[styles.pager, pagerStyle]}>
        {routes.map((route, i) => (
          <View
            key={route.key}
            style={[
              styles.scene,
              sceneContainerStyle,
              { display: i === index ? 'flex' : 'none' },
            ]}
          >
            {renderSceneWithProps(route, i)}
          </View>
        ))}
      </View>
      {tabBarPosition === 'bottom' && renderTabBar(tabBarProps)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#2196F3',
    transition: 'all 150ms ease-out',
  },
  pager: {
    flex: 1,
  },
  scene: {  
    flex: 1,
    overflow: 'hidden',
  },
});

// Export everything
export { TabView, TabBar, SceneMap };
export default TabView;
