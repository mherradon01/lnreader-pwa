// Web shim for react-native-reanimated
// Provides web-compatible implementations that work without native worklets

// Import our web-compatible Easing implementation
import { Easing, EasingNameSymbol } from './reanimated-easing.web.js';
export { Easing, EasingNameSymbol };

// ============ Animation Functions ============

// withTiming - animates a value over time
export function withTiming(toValue, config = {}, callback) {
  'worklet';
  return toValue;
}

// withSpring - animates a value with spring physics
export function withSpring(toValue, config = {}, callback) {
  'worklet';
  return toValue;
}

// withDecay - animates a value with decay
export function withDecay(config = {}, callback) {
  'worklet';
  return config.velocity || 0;
}

// withDelay - delays an animation
export function withDelay(delayMs, animation) {
  'worklet';
  return animation;
}

// withRepeat - repeats an animation
export function withRepeat(animation, numberOfReps = 2, reverse = false, callback) {
  'worklet';
  return animation;
}

// withSequence - sequences animations
export function withSequence(...animations) {
  'worklet';
  return animations[animations.length - 1];
}

// withClamp - clamps animation values
export function withClamp(config, animation) {
  'worklet';
  return animation;
}

// cancelAnimation - cancels an animation on a shared value
export function cancelAnimation(sharedValue) {
  'worklet';
}

// defineAnimation - defines a custom animation
export function defineAnimation(starting, factory) {
  'worklet';
  return factory;
}

// ============ Shared Values & Hooks ============

// Helper to create a shared value with all required methods
function createSharedValue(initialValue) {
  const sharedValue = {
    value: initialValue,
    // set - sets the value directly
    set: function(newValue) {
      this.value = newValue;
    },
    // modify - modifies the value using a callback
    modify: function(modifier) {
      'worklet';
      const newValue = modifier(this.value);
      if (newValue !== undefined) {
        this.value = newValue;
      }
    },
    // addListener - adds a listener for value changes (no-op on web)
    addListener: function(id, listener) {
      return () => {}; // Return unsubscribe function
    },
    // removeListener - removes a listener (no-op on web)
    removeListener: function(id) {},
  };
  return sharedValue;
}

// useSharedValue - creates a shared value
export function useSharedValue(initialValue) {
  return createSharedValue(initialValue);
}

// useDerivedValue - creates a derived value
export function useDerivedValue(updater, dependencies) {
  const value = typeof updater === 'function' ? updater() : updater;
  return createSharedValue(value);
}

// useAnimatedStyle - creates animated styles
export function useAnimatedStyle(updater, dependencies) {
  return typeof updater === 'function' ? updater() : {};
}

// useAnimatedProps - creates animated props
export function useAnimatedProps(updater, dependencies) {
  return typeof updater === 'function' ? updater() : {};
}

// useAnimatedRef - creates an animated ref
export function useAnimatedRef() {
  const ref = { current: null };
  ref.current = ref;
  return ref;
}

// useAnimatedReaction - creates a reaction to shared value changes
export function useAnimatedReaction(prepare, react, dependencies) {
  // No-op on web
}

// useAnimatedScrollHandler - creates a scroll handler
export function useAnimatedScrollHandler(handlers, dependencies) {
  return (event) => {
    if (typeof handlers === 'function') {
      handlers(event);
    } else if (handlers.onScroll) {
      handlers.onScroll(event);
    }
  };
}

// useAnimatedKeyboard - tracks keyboard state
export function useAnimatedKeyboard(config) {
  return { height: { value: 0 }, state: { value: 0 } };
}

// useAnimatedSensor - tracks device sensor data
export function useAnimatedSensor(sensorType, config) {
  return { sensor: { value: { x: 0, y: 0, z: 0 } } };
}

// useScrollOffset - gets scroll offset from a ref
export function useScrollOffset(ref) {
  return { value: 0 };
}

// useReducedMotion - checks if reduced motion is enabled
export function useReducedMotion() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

// useEvent - creates an event handler
export function useEvent(handler, eventNames, rebuild) {
  return handler;
}

// useHandler - creates a handler with shared values
export function useHandler(handlers, dependencies) {
  return { context: {}, doDependenciesDiffer: false, useWeb: true };
}

// useFrameCallback - runs callback every frame
export function useFrameCallback(callback, autostart = true) {
  return { setActive: () => {}, isActive: false, callbackId: -1 };
}

// useComposedEventHandler - composes multiple event handlers
export function useComposedEventHandler(handlers) {
  return (event) => {
    handlers.forEach(handler => handler && handler(event));
  };
}

// ============ Interpolation ============

export const Extrapolation = {
  EXTEND: 'extend',
  CLAMP: 'clamp',
  IDENTITY: 'identity',
};

// Deprecated alias
export const Extrapolate = Extrapolation;

export function interpolate(value, inputRange, outputRange, extrapolation) {
  'worklet';
  if (inputRange.length < 2 || outputRange.length < 2) {
    return outputRange[0] || 0;
  }
  
  // Find the range segment
  let i = 1;
  for (; i < inputRange.length && inputRange[i] < value; i++) {}
  
  const inMin = inputRange[i - 1];
  const inMax = inputRange[i] || inputRange[i - 1];
  const outMin = outputRange[i - 1];
  const outMax = outputRange[i] || outputRange[i - 1];
  
  // Handle extrapolation
  const extrapolationType = typeof extrapolation === 'object' 
    ? extrapolation 
    : { extrapolateLeft: extrapolation, extrapolateRight: extrapolation };
    
  if (value < inputRange[0]) {
    if (extrapolationType.extrapolateLeft === 'clamp') {
      return outMin;
    }
  }
  if (value > inputRange[inputRange.length - 1]) {
    if (extrapolationType.extrapolateRight === 'clamp') {
      return outputRange[outputRange.length - 1];
    }
  }
  
  // Linear interpolation
  const progress = (value - inMin) / (inMax - inMin || 1);
  return outMin + progress * (outMax - outMin);
}

export function clamp(value, min, max) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// ============ Color Interpolation ============

export function interpolateColor(value, inputRange, outputRange, colorSpace) {
  'worklet';
  // Simple implementation - just return nearest color
  const index = Math.round(interpolate(value, inputRange, [0, outputRange.length - 1], 'clamp'));
  return outputRange[index] || outputRange[0];
}

export function useInterpolateConfig(inputRange, outputRange, colorSpace) {
  return { inputRange, outputRange, colorSpace };
}

export function convertToRGBA(color) {
  'worklet';
  // Basic color parsing
  if (typeof color === 'number') {
    return [
      ((color >> 16) & 255) / 255,
      ((color >> 8) & 255) / 255,
      (color & 255) / 255,
      ((color >> 24) & 255) / 255 || 1,
    ];
  }
  return [0, 0, 0, 1];
}

export function isColor(value) {
  'worklet';
  return typeof value === 'string' && (
    value.startsWith('#') || 
    value.startsWith('rgb') || 
    value.startsWith('hsl')
  );
}

export function processColor(color) {
  'worklet';
  return color;
}

// ============ Animated Components ============

import { 
  View as RNView, 
  Text as RNText, 
  Image as RNImage, 
  ScrollView as RNScrollView, 
  FlatList as RNFlatList 
} from 'react-native';

export function createAnimatedComponent(Component) {
  // Return the component as-is for web (no native animation needed)
  const AnimatedComponent = Component;
  AnimatedComponent.displayName = `Animated(${Component.displayName || Component.name || 'Component'})`;
  return AnimatedComponent;
}

// Pre-built animated components
export const View = RNView;
export const Text = RNText;
export const Image = RNImage;
export const ScrollView = RNScrollView;
export const FlatList = RNFlatList;

// Namespace export for default (Animated.View, etc.)
const Animated = {
  View: RNView,
  Text: RNText,
  Image: RNImage,
  ScrollView: RNScrollView,
  FlatList: RNFlatList,
  createAnimatedComponent,
  addWhitelistedNativeProps: () => {},
  addWhitelistedUIProps: () => {},
};

export default Animated;

// ============ Common Types ============

export const ReduceMotion = {
  System: 'system',
  Always: 'always',
  Never: 'never',
};

export const SensorType = {
  ACCELEROMETER: 1,
  GYROSCOPE: 2,
  GRAVITY: 3,
  MAGNETIC_FIELD: 4,
  ROTATION: 5,
};

export const InterfaceOrientation = {
  PORTRAIT: 1,
  PORTRAIT_UPSIDE_DOWN: 2,
  LANDSCAPE_LEFT: 3,
  LANDSCAPE_RIGHT: 4,
};

export const IOSReferenceFrame = {
  XArbitraryZVertical: 1,
  XArbitraryCorrectedZVertical: 2,
  XMagneticNorthZVertical: 3,
  XTrueNorthZVertical: 4,
};

export const KeyboardState = {
  UNKNOWN: 0,
  OPENING: 1,
  OPEN: 2,
  CLOSING: 3,
  CLOSED: 4,
};

// ============ Core Functions ============

export function makeMutable(initial) {
  return { value: initial };
}

export function enableLayoutAnimations(flag) {
  // No-op on web
}

export function getViewProp(viewTag, propName, callback) {
  // No-op on web
}

export function isConfigured() {
  return true;
}

export function isReanimated3() {
  return true;
}

export function configureReanimatedLogger(config) {
  // No-op on web
}

// ============ Worklet Functions ============

export function runOnJS(fn) {
  return fn;
}

export function runOnUI(fn) {
  return fn;
}

export function runOnRuntime(runtime, fn) {
  return fn;
}

export function createWorkletRuntime(name, initializer) {
  return {};
}

export function executeOnUIRuntimeSync(fn) {
  return fn();
}

export function isWorkletFunction(value) {
  return typeof value === 'function';
}

export function makeShareableCloneRecursive(value) {
  return value;
}

// ============ Platform Functions ============

export function measure(ref) {
  return null;
}

export function scrollTo(ref, x, y, animated) {
  if (ref && ref.current && ref.current.scrollTo) {
    ref.current.scrollTo({ x, y, animated });
  }
}

export function dispatchCommand(ref, command, args) {
  // No-op on web
}

export function setNativeProps(ref, props) {
  // No-op on web
}

export function getRelativeCoords(ref, x, y) {
  return { x, y };
}

export function setGestureState(handlerTag, state) {
  // No-op on web
}

// ============ Mappers ============

export function startMapper(mapper, inputs, outputs) {
  return -1;
}

export function stopMapper(mapperId) {
  // No-op
}

// ============ Shared Value Utils ============

export function isSharedValue(value) {
  return value && typeof value === 'object' && 'value' in value;
}

// ============ Prop Adapters ============

export function createAnimatedPropAdapter(adapter, nativeProps) {
  return adapter;
}

// ============ Components ============

export function LayoutAnimationConfig({ skipEntering, skipExiting, children }) {
  return children;
}

export function PerformanceMonitor({ children }) {
  return children;
}

export function ReducedMotionConfig({ mode, children }) {
  return children;
}

// ============ Layout Animations ============

// Base class for animation builders
class BaseAnimationBuilderClass {
  static duration(ms) { return new this(); }
  static delay(ms) { return new this(); }
  static withCallback(callback) { return new this(); }
  static randomDelay() { return new this(); }
  static withInitialValues(values) { return new this(); }
  static build() { return () => ({}); }
  
  duration(ms) { return this; }
  delay(ms) { return this; }
  withCallback(callback) { return this; }
  randomDelay() { return this; }
  withInitialValues(values) { return this; }
  build() { return () => ({}); }
}

class ComplexAnimationBuilderClass extends BaseAnimationBuilderClass {
  static easing(fn) { return new this(); }
  static rotate(deg) { return new this(); }
  static springify() { return new this(); }
  static damping(value) { return new this(); }
  static mass(value) { return new this(); }
  static stiffness(value) { return new this(); }
  static overshootClamping(value) { return new this(); }
  static restDisplacementThreshold(value) { return new this(); }
  static restSpeedThreshold(value) { return new this(); }
  
  easing(fn) { return this; }
  rotate(deg) { return this; }
  springify() { return this; }
  damping(value) { return this; }
  mass(value) { return this; }
  stiffness(value) { return this; }
  overshootClamping(value) { return this; }
  restDisplacementThreshold(value) { return this; }
  restSpeedThreshold(value) { return this; }
}

// Create animation builder classes
function createAnimationBuilder() {
  return class extends ComplexAnimationBuilderClass {};
}

export const BaseAnimationBuilder = BaseAnimationBuilderClass;
export const ComplexAnimationBuilder = ComplexAnimationBuilderClass;

// Fade animations
export const FadeIn = createAnimationBuilder();
export const FadeInRight = createAnimationBuilder();
export const FadeInLeft = createAnimationBuilder();
export const FadeInUp = createAnimationBuilder();
export const FadeInDown = createAnimationBuilder();
export const FadeOut = createAnimationBuilder();
export const FadeOutRight = createAnimationBuilder();
export const FadeOutLeft = createAnimationBuilder();
export const FadeOutUp = createAnimationBuilder();
export const FadeOutDown = createAnimationBuilder();

// Slide animations
export const SlideInRight = createAnimationBuilder();
export const SlideInLeft = createAnimationBuilder();
export const SlideInUp = createAnimationBuilder();
export const SlideInDown = createAnimationBuilder();
export const SlideOutRight = createAnimationBuilder();
export const SlideOutLeft = createAnimationBuilder();
export const SlideOutUp = createAnimationBuilder();
export const SlideOutDown = createAnimationBuilder();

// Zoom animations
export const ZoomIn = createAnimationBuilder();
export const ZoomInDown = createAnimationBuilder();
export const ZoomInUp = createAnimationBuilder();
export const ZoomInLeft = createAnimationBuilder();
export const ZoomInRight = createAnimationBuilder();
export const ZoomInRotate = createAnimationBuilder();
export const ZoomInEasyUp = createAnimationBuilder();
export const ZoomInEasyDown = createAnimationBuilder();
export const ZoomOut = createAnimationBuilder();
export const ZoomOutDown = createAnimationBuilder();
export const ZoomOutUp = createAnimationBuilder();
export const ZoomOutLeft = createAnimationBuilder();
export const ZoomOutRight = createAnimationBuilder();
export const ZoomOutRotate = createAnimationBuilder();
export const ZoomOutEasyUp = createAnimationBuilder();
export const ZoomOutEasyDown = createAnimationBuilder();

// Bounce animations
export const BounceIn = createAnimationBuilder();
export const BounceInDown = createAnimationBuilder();
export const BounceInUp = createAnimationBuilder();
export const BounceInLeft = createAnimationBuilder();
export const BounceInRight = createAnimationBuilder();
export const BounceOut = createAnimationBuilder();
export const BounceOutDown = createAnimationBuilder();
export const BounceOutUp = createAnimationBuilder();
export const BounceOutLeft = createAnimationBuilder();
export const BounceOutRight = createAnimationBuilder();

// Flip animations
export const FlipInXDown = createAnimationBuilder();
export const FlipInXUp = createAnimationBuilder();
export const FlipInYLeft = createAnimationBuilder();
export const FlipInYRight = createAnimationBuilder();
export const FlipInEasyX = createAnimationBuilder();
export const FlipInEasyY = createAnimationBuilder();
export const FlipOutXDown = createAnimationBuilder();
export const FlipOutXUp = createAnimationBuilder();
export const FlipOutYLeft = createAnimationBuilder();
export const FlipOutYRight = createAnimationBuilder();
export const FlipOutEasyX = createAnimationBuilder();
export const FlipOutEasyY = createAnimationBuilder();

// Rotate animations
export const RotateInDownLeft = createAnimationBuilder();
export const RotateInDownRight = createAnimationBuilder();
export const RotateInUpLeft = createAnimationBuilder();
export const RotateInUpRight = createAnimationBuilder();
export const RotateOutDownLeft = createAnimationBuilder();
export const RotateOutDownRight = createAnimationBuilder();
export const RotateOutUpLeft = createAnimationBuilder();
export const RotateOutUpRight = createAnimationBuilder();

// Roll animations
export const RollInLeft = createAnimationBuilder();
export const RollInRight = createAnimationBuilder();
export const RollOutLeft = createAnimationBuilder();
export const RollOutRight = createAnimationBuilder();

// Pinwheel animations
export const PinwheelIn = createAnimationBuilder();
export const PinwheelOut = createAnimationBuilder();

// LightSpeed animations
export const LightSpeedInLeft = createAnimationBuilder();
export const LightSpeedInRight = createAnimationBuilder();
export const LightSpeedOutLeft = createAnimationBuilder();
export const LightSpeedOutRight = createAnimationBuilder();

// Stretch animations
export const StretchInX = createAnimationBuilder();
export const StretchInY = createAnimationBuilder();
export const StretchOutX = createAnimationBuilder();
export const StretchOutY = createAnimationBuilder();

// Layout transitions
export const Layout = createAnimationBuilder();
export const LinearTransition = createAnimationBuilder();
export const FadingTransition = createAnimationBuilder();
export const SequencedTransition = createAnimationBuilder();
export const JumpingTransition = createAnimationBuilder();
export const CurvedTransition = createAnimationBuilder();
export const EntryExitTransition = createAnimationBuilder();

// Keyframe
export class Keyframe {
  constructor(definitions) {
    this.definitions = definitions;
  }
  duration(ms) { return this; }
  delay(ms) { return this; }
  withCallback(callback) { return this; }
  build() { return () => ({}); }
}

// ============ Color Space ============

export const ColorSpace = {
  RGB: 0,
  HSV: 1,
};
