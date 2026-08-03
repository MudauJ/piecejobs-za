import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { session, role, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth" />;
  }

  if (role === 'homeowner' || role === 'super_admin') {
    return <Redirect href="/(homeowner)/(tabs)/jobs" />;
  }

  if (role === 'worker') {
    return <Redirect href="/(worker)/(tabs)/browse" />;
  }

  // Profile still loading
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
