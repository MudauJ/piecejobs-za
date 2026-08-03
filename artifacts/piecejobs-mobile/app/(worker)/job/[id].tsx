import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { supabase, Job, Application } from '@/lib/supabase';

export default function WorkerJobDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, worker } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyModal, setApplyModal] = useState(false);
  const [message, setMessage] = useState('');
  const [proposedRate, setProposedRate] = useState(worker?.hourly_rate?.toString() ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      const [{ data: jobData }, { data: appData }] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', id).single(),
        supabase
          .from('applications')
          .select('*')
          .eq('job_id', id)
          .eq('applicant_id', user?.id ?? '')
          .maybeSingle(),
      ]);
      setJob(jobData ?? null);
      setMyApplication(appData ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id, user]);

  async function handleApply() {
    if (!message.trim()) {
      Alert.alert('Message required', 'Please write a short message to the homeowner.');
      return;
    }
    if (!proposedRate.trim()) {
      Alert.alert('Rate required', 'Please enter your hourly rate.');
      return;
    }
    if (!user || !worker) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('applications').insert({
        job_id: id,
        worker_name: `${worker.first_name} ${worker.last_name}`,
        worker_phone: worker.phone,
        message: message.trim(),
        proposed_rate: parseFloat(proposedRate),
        status: 'pending',
        applicant_id: user.id,
      });
      if (error) throw error;

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setApplyModal(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
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

  const canApply = !myApplication && job.status === 'open';

  const appStatusColor =
    myApplication?.status === 'accepted'
      ? '#16A34A'
      : myApplication?.status === 'declined'
      ? colors.destructive
      : colors.primary;

  const appStatusBg =
    myApplication?.status === 'accepted'
      ? '#DCFCE7'
      : myApplication?.status === 'declined'
      ? '#FEE2E2'
      : colors.primary + '18';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Header */}
        <View style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.jobTop}>
            <View style={styles.jobLeft}>
              {job.is_urgent && (
                <View style={[styles.urgentBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="zap" size={11} color="#EF4444" />
                  <Text style={[styles.urgentText, { color: '#EF4444' }]}>Urgent</Text>
                </View>
              )}
              <Text style={[styles.jobTitle, { color: colors.foreground }]}>{job.title}</Text>
              <Text style={[styles.jobCategory, { color: colors.mutedForeground }]}>{job.category}</Text>
            </View>
            <Text style={[styles.jobBudget, { color: colors.accent }]}>R{job.budget}</Text>
          </View>

          <Text style={[styles.jobDesc, { color: colors.foreground }]}>{job.description}</Text>

          <View style={styles.metaGrid}>
            <MetaChip icon="map-pin" value={`${job.suburb}, ${job.city}`} colors={colors} />
            <MetaChip icon="user" value={job.poster_name} colors={colors} />
            <MetaChip icon="phone" value={job.contact_number} colors={colors} />
            <MetaChip icon="activity" value={job.status.replace('_', ' ')} colors={colors} />
          </View>
        </View>

        {/* Application Status */}
        {myApplication && (
          <View style={[styles.statusCard, { backgroundColor: appStatusBg, borderColor: appStatusColor + '40' }]}>
            <Feather
              name={
                myApplication.status === 'accepted'
                  ? 'check-circle'
                  : myApplication.status === 'declined'
                  ? 'x-circle'
                  : 'clock'
              }
              size={20}
              color={appStatusColor}
            />
            <View>
              <Text style={[styles.statusTitle, { color: appStatusColor }]}>
                {myApplication.status === 'accepted'
                  ? 'Application Accepted!'
                  : myApplication.status === 'declined'
                  ? 'Application Declined'
                  : 'Application Pending'}
              </Text>
              <Text style={[styles.statusSub, { color: appStatusColor + 'B0' }]}>
                {myApplication.status === 'accepted'
                  ? 'The homeowner has accepted your application.'
                  : myApplication.status === 'declined'
                  ? 'The homeowner declined your application.'
                  : 'Waiting for homeowner to review.'}
              </Text>
            </View>
          </View>
        )}

        {/* Your application details */}
        {myApplication && (
          <View style={[styles.appDetail, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.appDetailTitle, { color: colors.foreground }]}>Your Application</Text>
            <Text style={[styles.appDetailRate, { color: colors.accent }]}>
              R{myApplication.proposed_rate}/hr
            </Text>
            <Text style={[styles.appDetailMsg, { color: colors.mutedForeground }]}>
              {myApplication.message}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Apply Button */}
      {canApply && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 16 },
          ]}
        >
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            onPress={() => setApplyModal(true)}
            activeOpacity={0.85}
          >
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.applyBtnText}>Apply for this Job</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Apply Modal */}
      <Modal
        visible={applyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setApplyModal(false)}
      >
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Apply for Job</Text>
            <TouchableOpacity onPress={() => setApplyModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.modalJobTitle, { color: colors.foreground }]}>{job.title}</Text>
            <Text style={[styles.modalJobMeta, { color: colors.mutedForeground }]}>
              {job.suburb}, {job.city} · Budget: R{job.budget}
            </Text>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Your Hourly Rate (R) *
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                value={proposedRate}
                onChangeText={setProposedRate}
                placeholder={`e.g. ${worker?.hourly_rate ?? 100}`}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Message to Homeowner *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multiline,
                  { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Introduce yourself and describe your experience..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function MetaChip({ icon, value, colors }: { icon: any; value: string; colors: any }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  jobCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  jobTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobLeft: { flex: 1, gap: 4, marginRight: 10 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  urgentText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  jobTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  jobCategory: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  jobBudget: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  jobDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  statusSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  appDetail: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  appDetailTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  appDetailRate: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  appDetailMsg: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  modalContent: { flex: 1 },
  modalJobTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  modalJobMeta: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  multiline: {
    height: 120,
    paddingTop: 12,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
