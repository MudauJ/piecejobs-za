import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { supabase, CATEGORIES, CITIES } from '@/lib/supabase';

export default function PostJobScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [contactNumber, setContactNumber] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePost() {
    if (!title.trim() || !description.trim() || !budget.trim() || !suburb.trim() || !contactNumber.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        title: title.trim(),
        category,
        description: description.trim(),
        budget: parseFloat(budget),
        suburb: suburb.trim(),
        city,
        contact_number: contactNumber.trim(),
        poster_name: profile?.full_name ?? 'Homeowner',
        is_urgent: isUrgent,
        status: 'open',
        posted_by: user.id,
      });
      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Job Posted!', 'Workers in your city will be notified.', [
        { text: 'OK', onPress: () => router.push('/(homeowner)/(tabs)/jobs') },
      ]);

      // Reset form
      setTitle('');
      setDescription('');
      setBudget('');
      setSuburb('');
      setContactNumber('');
      setIsUrgent(false);
      setCategory(CATEGORIES[0]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not post job.');
    } finally {
      setLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 84 : 90 + insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.navy ?? '#1B2E4B' }]}>
        <Text style={styles.headerTitle}>Post a Job</Text>
        <Text style={styles.headerSub}>Find local workers fast</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Job Title *" colors={colors}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. House cleaning needed"
            placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="Category *" colors={colors}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === cat ? colors.primary : colors.card,
                    borderColor: category === cat ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: category === cat ? '#fff' : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Description *" colors={colors}>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you need done..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Budget (R) *" colors={colors}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            value={budget}
            onChangeText={setBudget}
            placeholder="e.g. 350"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Suburb *" colors={colors}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            value={suburb}
            onChangeText={setSuburb}
            placeholder="e.g. Sandton"
            placeholderTextColor={colors.mutedForeground}
          />
        </Field>

        <Field label="City *" colors={colors}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCity(c)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: city === c ? colors.primary : colors.card,
                    borderColor: city === c ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: city === c ? '#fff' : colors.mutedForeground }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Contact Number *" colors={colors}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="+27 ..."
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
          />
        </Field>

        <View style={[styles.urgentRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.urgentLeft}>
            <Feather name="zap" size={18} color="#EF4444" />
            <View>
              <Text style={[styles.urgentLabel, { color: colors.foreground }]}>Mark as Urgent</Text>
              <Text style={[styles.urgentSub, { color: colors.mutedForeground }]}>
                Workers will see this highlighted
              </Text>
            </View>
          </View>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: colors.border, true: '#EF4444' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.accent }]}
          onPress={handlePost}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1B2E4B" />
          ) : (
            <>
              <Feather name="send" size={18} color="#1B2E4B" />
              <Text style={styles.submitText}>Post Job</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 4,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  multiline: {
    height: 100,
    paddingTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  urgentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urgentLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  urgentSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1B2E4B',
  },
});
