/**
 * Web shim for @gorhom/bottom-sheet
 * Provides simplified web-compatible implementations that avoid the animation issues
 */

import React, { forwardRef, useCallback, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions } from 'react-native';

// Simple bottom sheet implementation for web
const BottomSheet = forwardRef(({ 
  children, 
  index = -1, 
  snapPoints = ['50%'],
  onChange,
  onClose,
  enablePanDownToClose = true,
  backgroundStyle,
  handleIndicatorStyle,
  style,
  ...props 
}, ref) => {
  const [currentIndex, setCurrentIndex] = useState(index);
  const translateY = useRef(new Animated.Value(0)).current;
  
  useImperativeHandle(ref, () => ({
    snapToIndex: (idx) => {
      setCurrentIndex(idx);
      onChange?.(idx);
    },
    snapToPosition: (position) => {
      // Simplified - just show/hide
      setCurrentIndex(position > 0 ? 0 : -1);
    },
    expand: () => {
      setCurrentIndex(0);
      onChange?.(0);
    },
    collapse: () => {
      setCurrentIndex(-1);
      onChange?.(-1);
      onClose?.();
    },
    close: () => {
      setCurrentIndex(-1);
      onChange?.(-1);
      onClose?.();
    },
    forceClose: () => {
      setCurrentIndex(-1);
      onChange?.(-1);
      onClose?.();
    },
  }));

  const isVisible = currentIndex >= 0;

  if (!isVisible) {
    return null;
  }

  // Parse snap point height
  const getHeight = () => {
    const snapPoint = snapPoints[Math.max(0, currentIndex)] || snapPoints[0];
    if (typeof snapPoint === 'string' && snapPoint.endsWith('%')) {
      const percentage = parseInt(snapPoint, 10);
      return `${percentage}%`;
    }
    return snapPoint;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.sheet, backgroundStyle, { height: getHeight() }]}>
        <View style={styles.handleContainer}>
          <View style={[styles.handle, handleIndicatorStyle]} />
        </View>
        {children}
      </View>
    </View>
  );
});

// Modal-based bottom sheet for web
const BottomSheetModal = forwardRef(({ 
  children, 
  snapPoints = ['50%'],
  onChange,
  onDismiss,
  enablePanDownToClose = true,
  backgroundStyle,
  handleIndicatorStyle,
  backdropComponent: BackdropComponent,
  ...props 
}, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useImperativeHandle(ref, () => ({
    present: () => {
      setIsVisible(true);
      setCurrentIndex(0);
      onChange?.(0);
    },
    dismiss: () => {
      setIsVisible(false);
      setCurrentIndex(-1);
      onChange?.(-1);
      onDismiss?.();
    },
    snapToIndex: (idx) => {
      setCurrentIndex(idx);
      onChange?.(idx);
    },
    snapToPosition: (position) => {
      setCurrentIndex(position > 0 ? 0 : -1);
    },
    expand: () => {
      setCurrentIndex(snapPoints.length - 1);
      onChange?.(snapPoints.length - 1);
    },
    collapse: () => {
      setCurrentIndex(0);
      onChange?.(0);
    },
    close: () => {
      setIsVisible(false);
      setCurrentIndex(-1);
      onChange?.(-1);
      onDismiss?.();
    },
    forceClose: () => {
      setIsVisible(false);
      setCurrentIndex(-1);
      onChange?.(-1);
      onDismiss?.();
    },
  }));

  const handleBackdropPress = useCallback(() => {
    if (enablePanDownToClose) {
      setIsVisible(false);
      setCurrentIndex(-1);
      onChange?.(-1);
      onDismiss?.();
    }
  }, [enablePanDownToClose, onChange, onDismiss]);

  // Parse snap point height
  const getHeight = () => {
    const snapPoint = snapPoints[Math.max(0, currentIndex)] || snapPoints[0];
    if (typeof snapPoint === 'string' && snapPoint.endsWith('%')) {
      const percentage = parseInt(snapPoint, 10);
      return `${percentage}%`;
    }
    return snapPoint;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />
        <View style={[styles.modalSheet, backgroundStyle, { height: getHeight() }]}>
          <View style={styles.handleContainer}>
            <View style={[styles.handle, handleIndicatorStyle]} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
});

// Context provider (no-op for web)
const BottomSheetModalProvider = ({ children }) => {
  return <>{children}</>;
};

// Backdrop component
const BottomSheetBackdrop = ({ 
  animatedIndex, 
  style, 
  pressBehavior = 'close',
  opacity = 0.5,
  appearsOnIndex = 0,
  disappearsOnIndex = -1,
  ...props 
}) => {
  return (
    <Pressable 
      style={[styles.backdrop, { opacity }, style]} 
      {...props}
    />
  );
};

// View components - just regular Views for web
const BottomSheetView = ({ children, style, ...props }) => (
  <View style={style} {...props}>{children}</View>
);

const BottomSheetScrollView = ({ children, style, ...props }) => (
  <View style={[{ flex: 1, overflow: 'auto' }, style]} {...props}>{children}</View>
);

const BottomSheetFlatList = ({ data, renderItem, keyExtractor, style, ...props }) => (
  <View style={[{ flex: 1, overflow: 'auto' }, style]} {...props}>
    {data?.map((item, index) => (
      <React.Fragment key={keyExtractor?.(item, index) || index}>
        {renderItem({ item, index })}
      </React.Fragment>
    ))}
  </View>
);

const BottomSheetSectionList = ({ sections, renderItem, renderSectionHeader, keyExtractor, style, ...props }) => (
  <View style={[{ flex: 1, overflow: 'auto' }, style]} {...props}>
    {sections?.map((section, sectionIndex) => (
      <React.Fragment key={sectionIndex}>
        {renderSectionHeader?.({ section })}
        {section.data?.map((item, index) => (
          <React.Fragment key={keyExtractor?.(item, index) || index}>
            {renderItem({ item, index, section })}
          </React.Fragment>
        ))}
      </React.Fragment>
    ))}
  </View>
);

// FlashList replacement (uses same implementation as FlatList for web)
const BottomSheetFlashList = ({ data, renderItem, keyExtractor, estimatedItemSize, style, ...props }) => (
  <View style={[{ flex: 1, overflow: 'auto' }, style]} {...props}>
    {data?.map((item, index) => (
      <React.Fragment key={keyExtractor?.(item, index) || index}>
        {renderItem({ item, index })}
      </React.Fragment>
    ))}
  </View>
);

const BottomSheetTextInput = forwardRef((props, ref) => {
  // Use regular TextInput for web
  const { TextInput } = require('react-native');
  return <TextInput ref={ref} {...props} />;
});

const BottomSheetHandle = ({ style, indicatorStyle, children, ...props }) => (
  <View style={[styles.handleContainer, style]} {...props}>
    <View style={[styles.handle, indicatorStyle]} />
    {children}
  </View>
);

const BottomSheetFooter = ({ children, style, ...props }) => (
  <View style={style} {...props}>{children}</View>
);

// Hooks - simplified for web
const useBottomSheet = () => ({
  snapToIndex: () => {},
  snapToPosition: () => {},
  expand: () => {},
  collapse: () => {},
  close: () => {},
  forceClose: () => {},
  animatedIndex: { value: 0 },
  animatedPosition: { value: 0 },
});

const useBottomSheetModal = () => ({
  dismiss: () => {},
  dismissAll: () => {},
});

const useBottomSheetInternal = () => ({
  animatedIndex: { value: 0 },
  animatedPosition: { value: 0 },
  animatedSnapPoints: { value: [] },
  animatedHandleHeight: { value: 0 },
  animatedContentHeight: { value: 0 },
  animatedContainerHeight: { value: 0 },
});

const useBottomSheetDynamicSnapPoints = (initialSnapPoints) => ({
  animatedSnapPoints: { value: initialSnapPoints },
  animatedHandleHeight: { value: 24 },
  animatedContentHeight: { value: 0 },
  handleContentLayout: () => {},
});

const useBottomSheetSpringConfigs = (config) => config;
const useBottomSheetTimingConfigs = (config) => config;

// Constants
const SNAP_POINT_TYPE = {
  PROVIDED: 'PROVIDED',
  CONTENT_HEIGHT: 'CONTENT_HEIGHT',
};

const ANIMATION_SOURCE = {
  NONE: 0,
  MOUNT: 1,
  USER: 2,
  CONTAINER_RESIZE: 3,
  SNAP_POINT_CHANGE: 4,
  CONTENT_RESIZE: 5,
};

const KEYBOARD_BEHAVIOR = {
  interactive: 'interactive',
  extend: 'extend',
  fillParent: 'fillParent',
};

const KEYBOARD_BLUR_BEHAVIOR = {
  none: 'none',
  restore: 'restore',
};

const KEYBOARD_INPUT_MODE = {
  adjustPan: 'adjustPan',
  adjustResize: 'adjustResize',
};

const SCROLLABLE_TYPE = {
  UNDETERMINED: 0,
  VIEW: 1,
  FLATLIST: 2,
  SCROLLVIEW: 3,
  SECTIONLIST: 4,
  VIRTUALIZEDLIST: 5,
};

// Screen dimensions
const SCREEN_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 375;
const SCREEN_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 812;
const WINDOW_WIDTH = SCREEN_WIDTH;
const WINDOW_HEIGHT = SCREEN_HEIGHT;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
});

// Default export
export default BottomSheet;

// Named exports
export {
  BottomSheet,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetFlashList,
  BottomSheetSectionList,
  BottomSheetTextInput,
  BottomSheetHandle,
  BottomSheetFooter,
  // Hooks
  useBottomSheet,
  useBottomSheetModal,
  useBottomSheetInternal,
  useBottomSheetDynamicSnapPoints,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
  // Constants
  SNAP_POINT_TYPE,
  ANIMATION_SOURCE,
  KEYBOARD_BEHAVIOR,
  KEYBOARD_BLUR_BEHAVIOR,
  KEYBOARD_INPUT_MODE,
  SCROLLABLE_TYPE,
  // Screen dimensions
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
};
