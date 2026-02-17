/**
 * Screen Transition Wrapper
 * 
 * TICKET 17F: Navigation & Transition Cohesion System
 * 
 * Provides smooth transitions between screens in manual tab navigation.
 * Wraps screen content with fade + slide animations that respect reduced motion.
 * 
 * Usage:
 * ```typescript
 * <ScreenTransition screenKey="tasks">
 *   <TasksScreen />
 * </ScreenTransition>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { durations, translate, patterns, opacity as opacityValues } from '../animations/motion';

interface ScreenTransitionProps {
  /** Unique key for the screen - changes trigger animation */
  screenKey: string;
  
  /** Screen content to animate */
  children: React.ReactNode;
  
  /** Whether to respect reduced motion (disable animations) */
  reduceMotion?: boolean;
  
  /** Optional style overrides */
  style?: ViewStyle;
}

/**
 * ScreenTransition Component
 * 
 * TICKET 17F: Provides cohesive transitions between screens
 * 
 * Animation Characteristics:
 * - Fade in: 0 → 1
 * - Slight slide: 16px → 0 (horizontal)
 * - Duration: 240ms (from motion constants)
 * - Easing: ease-out (natural, not bouncy)
 * 
 * Respects reduced motion:
 * - If reduceMotion=true, shows instantly (no animation)
 * - No partial animations
 * - Fully accessible
 */
export default function ScreenTransition({
  screenKey,
  children,
  reduceMotion = false,
  style,
}: ScreenTransitionProps) {
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current; // Start visible
  const slideAnim = useRef(new Animated.Value(0)).current; // Start in place
  const prevScreenKey = useRef(screenKey);
  
  useEffect(() => {
    // Only animate if screen changed
    if (screenKey !== prevScreenKey.current) {
      prevScreenKey.current = screenKey;
      
      if (reduceMotion) {
        // Instant transition (accessibility)
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      } else {
        // Reset and animate
        fadeAnim.setValue(0);
        slideAnim.setValue(patterns.screenTransition.distance);
        
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: patterns.screenTransition.duration,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: patterns.screenTransition.duration,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [screenKey, reduceMotion, fadeAnim, slideAnim]);
  
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          opacity: reduceMotion ? 1 : fadeAnim,
          transform: reduceMotion ? [] : [
            { translateX: slideAnim }
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
