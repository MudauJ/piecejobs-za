import React from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function WorkerProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, worker, user, signOut } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 84 : 90 + insets.bottom;

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await signOut();
        },
      },
    ]);
  }

  const badgeColor =
    worker?.badge === 'diamond'
      ? '#60A5FA'
      : worker?.badge === 'gold'
      ? '#F59E0B'
      : worker?.badge === 'silver'
      ? '#9CA3AF'
      : worker?.badge === 'bronze'
      ? '#CD7F32'
      : colors.mutedForeground;

  const badgeLabel =
    worker?.badge
      ? worker.badge.charAt(0).toUpperCase() + worker.badge.slice(1)
      : 'New';

  const initials = worker
    ? `${worker.first_name[0] ?? ''}${worker.last_name[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.navy ?? '#1B2E4B' }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & Badge */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {worker ? `${worker.first_name} ${worker.last_name}` : profile?.full_name ?? 'Worker'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="briefcase" size={12} color={colors.primary} />
              <Text style={[styles.roleText, { color: colors.primary }]}>Worker</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: badgeColor + '20' }]}>
              <Feather name="award" size={12} color={badgeColor} />
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
            </View>
          </View>
          {/* Rating */}
          {worker && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather
                  key={star}
                  name="star"
                  size={16}
                  color={star <= Math.round(worker.rating) ? '#F5A623' : colors.border}
                />
              ))}
              <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                {worker.rating.toFixed(1)} ({worker.review_count} reviews)
              </Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="mail" label="Email" value={user?.email ?? '—'} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="phone" label="Phone" value={worker?.phone ?? profile?.phone ?? '—'} colors={colors} />
          <Divider colors={colors} />
          <InfoRow icon="map-pin" label="City" value={worker?.city ?? profile?.city ?? '—'} colors={colors} />
          <Divider colors={colors} />
          <InfoRow
            icon="dollar-sign"
            label="Hourly Rate"
            value={worker ? `R${worker.hourly_rate}/hr` : '—'}
            colors={colors}
          />
          <Divider colors={colors} />
          <InfoRow
            icon="check-circle"
            label="Verified"
            value={worker?.is_verified ? 'Verified' : 'Pending verification'}
            colors={colors}
            valueColor={worker?.is_verified ? '#16A34A' : colors.mutedForeground}
          />
        </View>

        {/* Skills */}
        {worker && worker.skills.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16 }]}>
            <Text style={[styles.skillsTitle, { color: colors.mutedForeground }]}>SKILLS</Text>
            <View style={styles.skillsGrid}>
              {worker.skills.map((skill) => (
                <View
                  key={skill}
                  style={[styles.skillChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.skillText, { color: colors.foreground }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.destructive }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors, valueColor }: {
  icon: any; label: string; value: string; colors: any; valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
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
  content: { padding: 16 },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: { gap: 2 },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  divider: { height: 1, marginLeft: 62 },
  skillsTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  skillText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
