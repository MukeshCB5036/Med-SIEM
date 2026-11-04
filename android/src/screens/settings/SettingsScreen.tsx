import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';

export const SettingsScreen = () => {
  const { user, logout } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Please complete both current and new password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    const res = await apiService.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    setLoading(false);

    if (res.success) {
      Alert.alert('Password Updated', 'Your account credentials have been successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Update Failed', res.error || 'Failed to change password.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Security Settings & Operator Profile</Text>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Authenticated Operator Profile</Text>
        <Text style={styles.profileName}>{user?.full_name || 'SOC Operator'}</Text>
        <Text style={styles.cardSub}>Work Email: <Text style={{ color: '#38bdf8' }}>{user?.email}</Text></Text>
        <Text style={styles.cardSub}>Authorization: <Text style={{ color: '#fb7185', fontWeight: 'bold' }}>{user?.is_superuser ? 'Super Admin' : 'SOC Analyst'}</Text></Text>
        <Text style={styles.cardSub}>Organization UUID: <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>{user?.org_id}</Text></Text>
        
        <View style={[styles.row, { marginTop: 10 }]}>
          <Text style={styles.label}>Multi-Factor Authentication (MFA):</Text>
          <Badge label={user?.mfa_enabled ? 'ENABLED' : 'MANDATORY ON SUPERUSER'} />
        </View>

        <View style={[styles.row, { marginTop: 6 }]}>
          <Text style={styles.label}>Email Verification Status:</Text>
          <Badge label={user?.email_verified ? 'VERIFIED' : 'PENDING'} />
        </View>
      </View>

      {/* Password Change Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Credential Security & Rotation</Text>
        
        <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter current password"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Text style={styles.inputLabel}>NEW PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter complex new password"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter new password"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Update Credentials</Text>}
        </TouchableOpacity>
      </View>

      {/* Session Management & Endpoints */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Session Telemetry & Environment</Text>
        <Text style={styles.cardSub}>Backend Service: <Text style={{ color: '#34d399' }}>FastAPI REST Gateway (v1.0.0)</Text></Text>
        <Text style={styles.cardSub}>Database: <Text style={{ color: '#38bdf8' }}>PostgreSQL 16 (Alembic Head 0003)</Text></Text>
        <Text style={styles.cardSub}>Search Engine: <Text style={{ color: '#f59e0b' }}>OpenSearch 2.13 Distributed Cluster</Text></Text>
        <Text style={styles.cardSub}>Object Storage: <Text style={{ color: '#a855f7' }}>MinIO S3 Telemetry Bucket</Text></Text>
        <Text style={styles.cardSub}>Cache Broker: <Text style={{ color: '#ef4444' }}>Redis 7 In-Memory Session Cache</Text></Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
        <Text style={styles.signOutBtnText}>Sign Out of Mobile SOC</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginVertical: 4,
  },
  cardSub: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: THEME.colors.bg,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  signOutBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutBtnText: {
    color: THEME.colors.critical,
    fontSize: 13,
    fontWeight: 'bold',
  }
});
