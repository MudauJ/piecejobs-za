import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { supabase, Job, Application } from '@/lib/supabase';

export default function HomeownerJobDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchData() {
    try {
      const [{ data: jobData }, { data: appData }] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', id).single(),
        supabase
          .from('applications')
          .select('*')
          .eq('job_id', id)
          .order('created_at', { ascending: false }),
      ]);
      setJob(jobData ?? null);
      setApplications(appData ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [id]);

  async function handleAccept(appId: string, workerName: string) {
    Alert.alert('Accept Application', `Accept ${workerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setActionLoading(appId);
          try {
            const { error: acceptErr } = await supabase
              .from('applications')
              .update({ status: 'accepted' })
              .eq('id', appId);
            if (acceptErr) throw acceptErr;
            // Decline all others
            const { error: declineErr } = await supabase
              .from('applications')
              .update({ status: 'declined' })
              .eq('job_id', id)
              .neq('id', appId);
            if (declineErr) throw declineErr;
            // Update job status
            const { error: jobErr } = await supabase
              .from('jobs')
              .update({ status: 'in_progress' })
              .eq('id', id);
            if (jobErr) throw jobErr;
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not accept application.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  async function handleDecline(appId: string) {
    setActionLoading(appId);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'declined' })
        .eq('id', appId);
      if (error) throw error;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not decline application.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkComplete() {
    Alert.alert('Mark Complete', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('jobs')
              .update({ status: 'completed' })
              .eq('id', id);
            if (error) throw error;
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not mark job complete.');
          }
        },
      },
    ]);
  }

  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Job not found.</Text>
      </View>
    );
  }

  const acceptedApp = applications.find((a) => a.status === 'accepted');
  const canComplete = job.status === 'in_progress' && !!acceptedApp;
  const canMarkComplete = canComplete;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Job Info Card */}
            <View style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.jobCardTop}>
                <View>
                  <Text style={[styles.jobTitle, { color: colors.foreground }]}>{job.title}</Text>
                  <Text style={[styles.jobCategory, { color: colors.mutedForeground }]}>{job.category}</Text>
                </View>
                <Text style={[styles.jobBudget, { color: colors.accent }]}>R{job.budget}</Text>
              </View>
              <Text style={[styles.jobDesc, { color: colors.foreground }]}>{job.description}</Text>
              <View style={styles.jobMeta}>
                <MetaItem icon="map-pin" value={`${job.suburb}, ${job.city}`} colors={colors} />
                <MetaItem icon="phone" value={job.contact_number} colors={colors} />
                <MetaItem icon="activity" value={job.status.replace('_', ' ')} colors={colors} />
              </View>
              {canMarkComplete && (
                <TouchableOpacity
                  style={[styles.completeBtn, { backgroundColor: '#16A34A' }]}
                  onPress={handleMarkComplete}
                  activeOpacity={0.85}
                >
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
              {job.status === 'completed' && (
                <View style={[styles.completedBanner, { backgroundColor: '#DCFCE7' }]}>
                  <Feather name="check-circle" size={16} color="#16A34A" />
                  <Text style={[styles.completedText, { color: '#16A34A' }]}>Job Completed</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Applications ({applications.length})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ApplicationCard
            app={item}
            onAccept={() => handleAccept(item.id, item.worker_name)}
            onDecline={() => handleDecline(item.id)}
            actionLoading={actionLoading === item.id}
            colors={colors}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 16 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No applications yet
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function MetaItem({ icon, value, colors }: { icon: any; value: string; colors: any }) {
  return (
    <View style={styles.metaItem}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

function ApplicationCard({
  app,
  onAccept,
  onDecline,
  actionLoading,
  colors,
}: {
  app: Application;
  onAccept: () => void;
  onDecline: () => void;
  actionLoading: boolean;
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

  return (
    <View style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.appHeader}>
        <View>
          <Text style={[styles.workerName, { color: colors.foreground }]}>{app.worker_name}</Text>
          <Text style={[styles.workerPhone, { color: colors.mutedForeground }]}>{app.worker_phone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.rate, { color: colors.accent }]}>R{app.proposed_rate}/hr</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      {!!app.message && (
        <Text style={[styles.message, { color: colors.foreground }]}>{app.message}</Text>
      )}
      {app.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.declineBtn, { borderColor: colors.destructive }]}
            onPress={onDecline}
            activeOpacity={0.8}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Feather name="x" size={18} color={colors.destructive} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#16A34A', flex: 1 }]}
            onPress={onAccept}
            activeOpacity={0.85}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.acceptText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  listHeader: { marginBottom: 8 },
  jobCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    flexShrink: 1,
    maxWidth: 220,
  },
  jobCategory: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  jobBudget: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  jobDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  jobMeta: { gap: 6 },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  completeBtn: {
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  completedText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  appCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workerName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  workerPhone: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  rate: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
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
  message: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  declineBtn: {
    width: 46,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  acceptText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});
