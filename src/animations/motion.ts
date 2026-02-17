/**
 * Motion Constants
 * 
 * TICKET 17D: Animation System
 * 
 * Centralized animation values for consistency and scalability.
 * All animations in the app should reference these constants.
 * 
 * Benefits:
 * - Consistency across components
 * - Easy to adjust globally
 * - Clear documentation of animation patterns
 * - Scalable for future features
 */

/**
 * Animation Durations (milliseconds)
 * 
 * Fast: Quick feedback (button press)
 * Normal: Standard transitions (card scale)
 * Slow: Emphasis animations (mount, fade)
 * Navigation: Screen transitions (17F)
 */
export const durations = {
  /** Quick press feedback (100-150ms) */
  fast: 150,
  
  /** Standard transitions (200ms) */
  normal: 200,
  
  /** Emphasis animations (300ms) */
  slow: 300,
  
  /** Subtle fades (400ms) */
  fade: 400,
  
  /** Badge pulse (90ms each direction = 180ms total) */
  pulse: 90,
  
  /** TICKET 17F: Screen transitions (240ms) */
  navigation: 240,
} as const;

/**
 * Scale Values
 * 
 * Subtle, premium feel - no dramatic scaling
 */
export const scale = {
  /** Card press feedback (0.98 = 2% smaller) */
  press: 0.98,
  
  /** FAB press feedback (0.95 = 5% smaller) */
  fab: 0.95,
  
  /** Badge pulse (1.08 = 8% larger) */
  pulse: 1.08,
  
  /** Default/rest state */
  rest: 1.0,
} as const;

/**
 * Translate Values (pixels)
 * 
 * For slide/mount animations
 */
export const translate = {
  /** Card mount animation (slides up 12px) */
  cardMount: 12,
  
  /** Screen transition slide (horizontal) */
  screenTransition: 16,
  
  /** Modal slide (vertical) */
  modalSlide: 24,
} as const;

/**
 * Opacity Values
 * 
 * For fade animations
 */
export const opacity = {
  /** Fully transparent */
  hidden: 0,
  
  /** View More initial state */
  viewMoreStart: 0.7,
  
  /** Fully opaque */
  visible: 1,
  
  /** Touch feedback (from tokens) */
  touchActive: 0.7,
} as const;

/**
 * Timing & Delays
 */
export const timing = {
  /** Stagger between cards (50ms) */
  cardStagger: 50,
  
  /** View More fade delay (200ms after card) */
  viewMoreDelay: 200,
} as const;

/**
 * Easing
 * 
 * Note: React Native Animated uses timing functions, not cubic-bezier.
 * For spring animations, use friction/tension values.
 */
export const easing = {
  /** FAB spring release (friction: 3) */
  fabSpringFriction: 3,
  
  /** Standard spring (future use) */
  standardSpringFriction: 5,
} as const;

/**
 * Animation Patterns
 * 
 * Pre-configured animation objects for common patterns
 */
export const patterns = {
  /** Card press animation config */
  cardPress: {
    scale: scale.press,
    durationIn: durations.fast,
    durationOut: durations.normal,
  },
  
  /** FAB press animation config */
  fabPress: {
    scale: scale.fab,
    durationIn: 100,
    springFriction: easing.fabSpringFriction,
  },
  
  /** Card mount animation config */
  cardMount: {
    duration: durations.slow,
    translateY: translate.cardMount,
    stagger: timing.cardStagger,
  },
  
  /** Badge pulse animation config */
  badgePulse: {
    scale: scale.pulse,
    duration: durations.pulse,
  },
  
  /** View More fade animation config */
  viewMoreFade: {
    opacityStart: opacity.viewMoreStart,
    opacityEnd: opacity.visible,
    duration: durations.fade,
    delay: timing.viewMoreDelay,
  },
  
  /** TICKET 17F: Screen transition config */
  screenTransition: {
    duration: durations.navigation,
    distance: translate.screenTransition,
  },
  
  /** TICKET 17F: Modal presentation config */
  modalPresentation: {
    duration: durations.navigation,
    distance: translate.modalSlide,
    backdropOpacity: 0.4,
  },
} as const;

/**
 * Usage Examples:
 * 
 * ```typescript
 * import { durations, scale, patterns } from '@/animations/motion';
 * 
 * // Direct values
 * Animated.timing(scaleAnim, {
 *   toValue: scale.press,
 *   duration: durations.fast,
 *   useNativeDriver: true,
 * }).start();
 * 
 * // Pre-configured patterns
 * const { scale, durationIn } = patterns.cardPress;
 * Animated.timing(anim, {
 *   toValue: scale,
 *   duration: durationIn,
 *   useNativeDriver: true,
 * }).start();
 * ```
 */

/**
 * FUTURE ADDITIONS (as needed):
 * 
 * - Navigation transition configs (17F)
 * - Modal animation configs
 * - List item animations
 * - Swipe gesture configs
 * - Loading state animations
 * - Success/error feedback
 */
