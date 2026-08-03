import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
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

type Mode = 'login' | 'register';
type Role = 'homeowner' | 'worker';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, role: authRole, loading: authLoading } = useAuth();

  // Navigate away once auth state is confirmed
  React.useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    if (authRole === 'homeowner' || authRole === 'super_admin') {
      router.replace('/(homeowner)/(tabs)/jobs' as any);
    } else if (authRole === 'worker') {
      router.replace('/(worker)/(tabs)/browse' as any);
    }
    // If role not yet resolved, keep waiting
  }, [session, authRole, authLoading]);

  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<Role>('homeowner');
  const [loading, setLoading] = useState(false);

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Homeowner
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(CITIES[0]);

  // Worker
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerCity, setWorkerCity] = useState(CITIES[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    const emailVal = email.trim();
    if (!emailVal || !password) {
      Alert.alert('Missing fields', 'Email and password are required.');
      return;
    }

    if (role === 'homeowner') {
      if (!fullName.trim() || !phone.trim()) {
        Alert.alert('Missing fields', 'Please fill in all fields.');
        return;
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !workerPhone.trim() || !hourlyRate.trim()) {
        Alert.alert('Missing fields', 'Please fill in all fields.');
        return;
      }
      if (selectedSkills.length === 0) {
        Alert.alert('No skills selected', 'Please select at least one skill.');
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailVal,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Registration failed.');

      const userId = data.user.id;

      if (role === 'homeowner') {
        const { error: profileErr } = await supabase.from('user_profiles').insert({
          id: userId,
          role: 'homeowner',
          full_name: fullName.trim(),
          phone: phone.trim(),
          city,
        });
        if (profileErr) throw profileErr;
      } else {
        const { error: profileErr } = await supabase.from('user_profiles').insert({
          id: userId,
          role: 'worker',
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: workerPhone.trim(),
          city: workerCity,
        });
        if (profileErr) throw profileErr;

        const { error: workerErr } = await supabase.from('workers').insert({
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: workerPhone.trim(),
          city: workerCity,
          suburb: '',
          id_number: '',
          hourly_rate: parseFloat(hourlyRate) || 0,
          skills: selectedSkills,
          is_verified: false,
          rating: 0,
          review_count: 0,
        });
        if (workerErr) throw workerErr;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Registration failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.navy ?? '#1B2E4B' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 20 }]}>
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Feather name="briefcase" size={28} color="#1B2E4B" />
        </View>
        <Text style={styles.logoTitle}>PieceJobs ZA</Text>
        <Text style={styles.logoSub}>Local work, done by local people</Text>
      </View>

      {/* Card */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Mode Toggle */}
          <View style={[styles.toggle, { backgroundColor: colors.muted }]}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.toggleBtn,
                  mode === m && { backgroundColor: colors.card, shadowColor: '#000' },
                ]}
                onPress={() => setMode(m)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: mode === m ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role Picker (Register only) */}
          {mode === 'register' && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>I am a...</Text>
              <View style={styles.roleRow}>
                {(['homeowner', 'worker'] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleBtn,
                      {
                        borderColor: role === r ? colors.primary : colors.border,
                        backgroundColor: role === r ? colors.primary + '12' : colors.card,
                      },
                    ]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={r === 'homeowner' ? 'home' : 'briefcase'}
                      size={20}
                      color={role === r ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.roleText,
                        { color: role === r ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {r === 'homeowner' ? 'Homeowner' : 'Worker'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Homeowner register fields */}
          {mode === 'register' && role === 'homeowner' && (
            <>
              <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                colors={colors}
              />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+27 ..."
                keyboardType="phone-pad"
                colors={colors}
              />
              <CityPicker value={city} onChange={setCity} colors={colors} />
            </>
          )}

          {/* Worker register fields */}
          {mode === 'register' && role === 'worker' && (
            <>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                colors={colors}
              />
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                colors={colors}
              />
              <Input
                label="Phone"
                value={workerPhone}
                onChangeText={setWorkerPhone}
                placeholder="+27 ..."
                keyboardType="phone-pad"
                colors={colors}
              />
              <CityPicker value={workerCity} onChange={setWorkerCity} colors={colors} />
              <Input
                label="Hourly Rate (R)"
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="e.g. 120"
                keyboardType="numeric"
                colors={colors}
              />
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Skills (select all that apply)
                </Text>
                <View style={styles.skillsGrid}>
                  {CATEGORIES.map((cat) => {
                    const selected = selectedSkills.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => toggleSkill(cat)}
                        style={[
                          styles.skillChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.muted,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.skillText,
                            { color: selected ? '#fff' : colors.mutedForeground },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* Email */}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
          />

          {/* Password */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={mode === 'login' ? handleLogin : handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Input({
  label,
  colors,
  ...props
}: {
  label: string;
  colors: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <TextInput
          style={[styles.textInput, { color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
          {...props}
        />
      </View>
    </View>
  );
}

function CityPicker({
  value,
  onChange,
  colors,
}: {
  value: string;
  onChange: (c: string) => void;
  colors: any;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>City</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll}>
        {CITIES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onChange(c)}
            style={[
              styles.cityChip,
              {
                backgroundColor: value === c ? colors.primary : colors.muted,
                borderColor: value === c ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.cityText, { color: value === c ? '#fff' : colors.mutedForeground }]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowOpacity: 0,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  textInput: {
    height: 46,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  cityScroll: {
    flexGrow: 0,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  cityText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
