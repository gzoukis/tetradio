/**
 * SpiralBindingRings Component
 * 
 * TICKET 17B: Tetradio Notebook Visual Enhancement
 * 
 * Decorative component that simulates the double metal spiral rings
 * running vertically along the left edge of a classic notebook,
 * adding to the tactile, physical feel of the interface.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SpiralBindingRings() {
  // Create 8 pairs of rings evenly spaced vertically
  const ringPairs = Array.from({ length: 8 }, (_, i) => i);
  
  return (
    <View style={styles.container}>
      {ringPairs.map((i) => (
        <View key={i} style={styles.ringPair}>
          {/* Left ring */}
          <View style={styles.ringOuter}>
            <View style={styles.ringInner} />
          </View>
          {/* Right ring */}
          <View style={styles.ringOuter}>
            <View style={styles.ringInner} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
    pointerEvents: 'none', // Allow touches to pass through
  },
  ringPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ringOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#A0AEC0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  ringInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5F7FA',
    borderWidth: 0.5,
    borderColor: '#8896A8',
  },
});
