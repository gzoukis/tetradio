import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value?: number;
  onChange: (timestamp: number | null) => void;
  disabled?: boolean;
}

export default function DatePickerButton({ value, onChange, disabled }: Props) {
  const [showPicker, setShowPicker] = useState(false);
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
      setShowPicker(false);
    }

    if (!selected) return;

    selected.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // HARD BLOCK past dates
    if (selected < today) {
      Alert.alert('Invalid date', 'You cannot select a past date.');
      return;
    }

    setTempDate(selected);
    onChange(selected.getTime());
  };

  const handleRemove = () => {
    onChange(null);
    setShowPicker(false);
  };

  return (
    <View>
      {value ? (
        <>
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>
              📅 {new Date(value).toDateString()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRemove}>
            <Text style={styles.remove}>Remove date</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.add}>+ Add date</Text>
        </TouchableOpacity>
      )}

      {showPicker && !disabled && (
        <DateTimePicker
          value={tempDate < new Date() ? new Date() : tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateText: { color: '#3b82f6' },
  remove: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
  add: { color: '#9ca3af' },
});
