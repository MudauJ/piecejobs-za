import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
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
import { JobCard } from '@/components/JobCard';
import { supabase, Job, CITIES } from '@/lib/supabase';

export default function WorkerBrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { worker } = useAuth();

  const [selectedCity, setSelectedCity] = useState<string>(worker?.city ?? CITIES[0]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchJobs(city: string) {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('city', city)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setJobs(data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchJobs(selectedCity);
  }, [selectedCity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs(selectedCity);
  }, [selectedCity]);

  function handleCityChange(city: string) {
    setSelectedCity(city);
    setLoading(true);
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.navy ?? '#1B2E4B' }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Browse Jobs</Text>
            <Text style={styles.headerSub}>{jobs.length} open in {selectedCity}</Text>
          </View>
          <Feather name="map-pin" size={20} color="#F5A623" />
        </View>
        {/* City Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.cityScroll}
          contentContainerStyle={styles.cityScrollContent}
        >
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => handleCityChange(c)}
              style={[
                styles.cityChip,
                {
                  backgroundColor: selectedCity === c ? '#F5A623' : 'rgba(255,255,255,0.15)',
                  borderColor: selectedCity === c ? '#F5A623' : 'transparent',
                },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.cityText,
                  { color: selectedCity === c ? '#1B2E4B' : 'rgba(255,255,255,0.85)' },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push(`/(worker)/job/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 84 : 90 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No open jobs
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                No jobs available in {selectedCity} right now
              </Text>
            </View>
          }
          scrollEnabled={!!jobs.length}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  cityScroll: { flexGrow: 0 },
  cityScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  cityText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
