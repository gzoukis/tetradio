import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateTimeDisplay, hasTimeComponent } from '../utils/timeClassification';

interface Props {
  value?: number;
  onChange: (timestamp: number | null) => void;
  disabled?: boolean;
}

export default function DatePickerButton({ value, onChange, disabled }: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(
    value ? new Date(value) : new Date()
  );

  useEffect(() => {
    if (value) {
      setTempDate(new Date(value));
    }
  }, [value]);

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!selected) return;

    // Preserve existing time if there is one
    const currentDate = value ? new Date(value) : new Date();
    const hasTime = value && hasTimeComponent(value);

    if (hasTime) {
      // Keep the time from current value
      selected.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
    } else {
      // Set to midnight
      selected.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Block past dates
    if (selected < today) {
      Alert.alert('Invalid date', 'You cannot select a past date.');
      return;
    }

    setTempDate(selected);
    onChange(selected.getTime());
  };

  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (!selected || !value) return;

    const currentDate = new Date(value);
    
    // Combine existing date with new time
    currentDate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    // Check if time is in the past for today's date
    const now = new Date();
    const isToday = currentDate.toDateString() === now.toDateString();
    
    if (isToday && currentDate < now) {
      Alert.alert('Invalid time', 'You cannot select a past time for today.');
      return;
    }

    setTempDate(currentDate);
    onChange(currentDate.getTime());
  };

  const handleRemoveDate = () => {
    onChange(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleRemoveTime = () => {
    if (!value) return;
    
    const dateOnly = new Date(value);
    dateOnly.setHours(0, 0, 0, 0);
    onChange(dateOnly.getTime());
  };

  const canShowTimePicker = value && !disabled;
  const currentHasTime = value && hasTimeComponent(value);

  // Calculate minimum time for today
  const getMinimumTime = () => {
    if (!value) return undefined;
    const selectedDate = new Date(value);
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    return isToday ? now : undefined;
  };

  return (
    <View style={styles.container}>
      {value ? (
        <View style={styles.dateTimeContainer}>
          <TouchableOpacity 
            onPress={() => !disabled && setShowDatePicker(true)}
            disabled={disabled}
          >
            <Text style={[styles.dateText, disabled && styles.disabled]}>
              {formatDateTimeDisplay(value)}
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            {canShowTimePicker && (
              <>
                {currentHasTime ? (
                  <TouchableOpacity onPress={handleRemoveTime}>
                    <Text style={styles.actionLink}>Remove time</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.actionLink}>+ Add time</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.separator}> • </Text>
              </>
            )}
            <TouchableOpacity onPress={handleRemoveDate} disabled={disabled}>
              <Text style={[styles.actionLink, disabled && styles.disabled]}>
                Remove date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={() => !disabled && setShowDatePicker(true)}
          disabled={disabled}
        >
          <Text style={[styles.add, disabled && styles.disabled]}>
            + Add date
          </Text>
        </TouchableOpacity>
      )}

      {showDatePicker && !disabled && (
        <DateTimePicker
          value={tempDate < new Date() ? new Date() : tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && canShowTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          minimumDate={getMinimumTime()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  dateTimeContainer: {
    gap: 4,
  },
  dateText: { 
    color: '#3b82f6',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLink: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 12,
    color: '#9ca3af',
  },
  add: { 
    color: '#9ca3af',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
});