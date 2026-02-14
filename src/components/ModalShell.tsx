import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModalShellProps {
  visible: boolean;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ITEM_HEIGHT = 56;
const MIN_VISIBLE_ITEMS = 3;
const HORIZONTAL_PADDING = 20;
const HEADER_FOOTER_PADDING = 16;

export default function ModalShell({
  visible,
  onClose,
  header,
  footer,
  children,
  animationType = 'fade',
}: ModalShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      >
        {/* Centered overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          {/* Stop propagation to prevent closing when tapping modal content */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            {/* Wrapper with maxHeight constraint */}
            <View style={[styles.wrapper, { maxHeight: SCREEN_HEIGHT * 0.75 }]}>
              {/* Card container with overflow hidden for rounded corners */}
              <View style={styles.card}>
                {/* Optional Header */}
                {header && (
                  <View
                    style={[
                      styles.header,
                      {
                        paddingHorizontal: HORIZONTAL_PADDING,
                        paddingTop: HEADER_FOOTER_PADDING,
                        paddingBottom: HEADER_FOOTER_PADDING,
                      },
                    ]}
                  >
                    {header}
                  </View>
                )}

                {/* Scrollable Body - flex: 1 to fill available space */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {children}
                </ScrollView>

                {/* Fixed Footer - never scrolls */}
                {footer && (
                  <View
                    style={[
                      styles.footer,
                      {
                        paddingHorizontal: HORIZONTAL_PADDING,
                        paddingTop: HEADER_FOOTER_PADDING,
                        paddingBottom: HEADER_FOOTER_PADDING,
                        // Safe area inset NOT added here - equal padding is the goal
                        // The modal is centered with room around it anyway
                      },
                    ]}
                  >
                    {footer}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Overlay - always centered, no platform differences
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // KeyboardAvoidingView wrapper
  keyboardView: {
    flex: 1,
  },

  // Modal container
  modalContainer: {
    width: '100%',
    alignItems: 'center',
  },

  // Wrapper with maxHeight constraint
  wrapper: {
    width: '88%',
    maxWidth: 480,
    maxHeight: '75%', // Reduced from 80% for more keyboard space
    marginHorizontal: 16,
  },

  // Card - the visible modal box
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden', // Ensures content doesn't escape rounded corners
    // No height, minHeight, or maxHeight allowed here
  },

  // Header section
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  // Scrollable body
  scrollView: {
    // flex: 1 allows it to fill available space
    flexGrow: 0,
    flexShrink: 1,
  },

  scrollContent: {
    // No padding here - items have their own padding
  },

  // Fixed footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
});
