import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { supabase, Application, Job } from '@/lib/supabase';

type AppWithJob = Application & { job?: Job };

export default function WorkerApplicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [apps, setApps] = useState<AppWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchApplications() {
    if (!user) return;
    try {
      const { data: appData } = await supabase
        .from('applications')
        .select('*, jobs(*)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      const mapped = (appData ?? []).map((a: any) => ({
        ...a,
        job: a.jobs ?? undefined,
      }));
      setApps(mapped);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchApplications();
  }, [user]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.navy ?? '#1B2E4B' }]}>
        <Text style={styles.headerTitle}>My Applications</Text>
        <Text style={styles.headerSub}>{apps.length} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ApplicationItem
              app={item}
              onPress={() => router.push(`/(worker)/job/${item.job_id}` as any)}
              colors={colors}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 84 : 90 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No applications</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Browse jobs and apply to get started
              </Text>
            </View>
          }
          scrollEnabled={!!apps.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ApplicationItem({
  app,
  onPress,
  colors,
}: {
  app: AppWithJob;
  onPress: () => void;
  colors: any;
}) {
  const statusColor =
    app.status === 'accepted'
      ? '#16A34A'
      : app.status === 'declined'
      ? colors.destructive
      : colors.primary;

  const statusBg =
    app.status === 'accepted'
      ? '#DCFCE7'
      : app.status === 'declined'
      ? '#FEE2E2'
      : colors.primary + '18';

  const statusIcon =
    app.status === 'accepted' ? 'check-circle' : app.status === 'declined' ? 'x-circle' : 'clock';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={1}>
            {app.job?.title ?? 'Job'}
          </Text>
          <Text style={[styles.jobMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {app.job?.suburb ?? ''}{app.job?.city ? `, ${app.job.city}` : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.rate, { color: colors.accent }]}>R{app.proposed_rate}/hr</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Feather name={statusIcon} size={11} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      {!!app.message && (
        <Text style={[styles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
          {app.message}
        </Text>
      )}
    </TouchableOpacity>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  jobTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  jobMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  rate: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  message: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
