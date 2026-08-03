import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Job } from '@/lib/supabase';

type Props = {
  job: Job;
  onPress: () => void;
};

export function JobCard({ job, onPress }: Props) {
  const colors = useColors();

  const statusColor =
    job.status === 'open'
      ? colors.primary
      : job.status === 'in_progress'
      ? colors.accent
      : colors.mutedForeground;

  const statusLabel =
    job.status === 'open'
      ? 'Open'
      : job.status === 'in_progress'
      ? 'In Progress'
      : job.status === 'completed'
      ? 'Completed'
      : job.status;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {job.is_urgent && (
            <View style={[styles.urgentBadge, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="zap" size={10} color="#EF4444" />
              <Text style={[styles.urgentText, { color: '#EF4444' }]}>Urgent</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={[styles.budget, { color: colors.accent }]}>R{job.budget}</Text>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {job.title}
      </Text>

      <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
        {job.category}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {job.suburb}, {job.city}
          </Text>
        </View>
        {job.application_count != null && (
          <View style={styles.footerItem}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              {job.application_count} applied
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  budget: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  category: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 4,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
