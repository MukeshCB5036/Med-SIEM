import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { UserItem, RoleItem, AuditLogItem } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { apiService } from '../../services/api';

interface AdminScreenProps {
  users: UserItem[];
  roles: RoleItem[];
  auditLogs: AuditLogItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onUserUpdated: () => void;
}

export const AdministrationScreen: React.FC<AdminScreenProps> = ({
  users,
  roles,
  auditLogs,
  refreshing,
  onRefresh,
  onUserUpdated,
}) => {
  const { isSuperAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'AUDIT'>('USERS');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Audit Search State
  const [auditSearch, setAuditSearch] = useState('');

  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  const handleCreateUser = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newFullName.trim()) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post('/users', {
      email: newEmail.trim(),
      password: newPassword,
      full_name: newFullName.trim(),
      org_id: '00000000-0000-0000-0000-000000000000',
      role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('User Created', `User account ${newEmail} created successfully.`);
      setIsCreatingUser(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setSelectedRoleIds([]);
      onUserUpdated();
    } else {
      Alert.alert('Creation Failed', res.error || 'Failed to create user account.');
    }
  };

  const handleToggleUserActive = async (user: UserItem) => {
    setActionLoading(true);
    const nextStatus = !user.is_active;
    const res = await apiService.patch(`/users/${user.id}`, {
      is_active: nextStatus
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('User Updated', `Account ${user.email} is now ${nextStatus ? 'ACTIVE' : 'DEACTIVATED'}.`);
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, is_active: nextStatus });
      }
      onUserUpdated();
    } else {
      Alert.alert('Update Failed', res.error || 'Unable to update account status.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'USERS' && styles.tabItemActive]}
          onPress={() => setActiveTab('USERS')}
        >
          <Text style={[styles.tabText, activeTab === 'USERS' && styles.tabTextActive]}>
            Operators ({users.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ROLES' && styles.tabItemActive]}
          onPress={() => setActiveTab('ROLES')}
        >
          <Text style={[styles.tabText, activeTab === 'ROLES' && styles.tabTextActive]}>
            Roles ({roles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'AUDIT' && styles.tabItemActive]}
          onPress={() => setActiveTab('AUDIT')}
        >
          <Text style={[styles.tabText, activeTab === 'AUDIT' && styles.tabTextActive]}>
            Audit Trail ({auditLogs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subheader with Super Admin badge and action button */}
      <View style={styles.subHeader}>
        <View>
          <Text style={styles.subHeaderTitle}>
            {activeTab === 'USERS' ? 'Authorized SOC Personnel' : activeTab === 'ROLES' ? 'RBAC Access Roles' : 'Forensic Audit Logs'}
          </Text>
          <Text style={styles.subHeaderSub}>
            {isSuperAdmin() ? 'Super Admin Privileges Active' : 'Analyst Access Controls Enforced'}
          </Text>
        </View>

        {activeTab === 'USERS' && isSuperAdmin() && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setIsCreatingUser(true)}>
            <Text style={styles.actionBtnText}>+ Add Operator</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab 1: Users List */}
      {activeTab === 'USERS' && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedUser(item)} activeOpacity={0.8}>
              <View style={styles.row}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.full_name}</Text>
                <Badge label={item.is_active ? 'ACTIVE' : 'DEACTIVATED'} />
              </View>
              <Text style={styles.cardSub}>Email: <Text style={{ color: '#38bdf8' }}>{item.email}</Text></Text>
              <Text style={styles.cardSub}>
                Roles: {item.roles ? item.roles.map(r => r.name).join(', ') : 'SOC Analyst'}
                {item.is_superuser ? ' • (Super Admin)' : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Tab 2: Roles List */}
      {activeTab === 'ROLES' && (
        <FlatList
          data={roles}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Badge label={item.is_system ? 'SYSTEM' : 'CUSTOM'} />
              </View>
              <Text style={styles.cardSub}>{item.description || 'Predefined security authorization role.'}</Text>
              <Text style={[styles.cardSub, { marginTop: 6, color: '#34d399' }]}>
                Permissions ({item.permissions ? item.permissions.length : 0}): {item.permissions ? item.permissions.map(p => p.name).join(', ') : 'None'}
              </Text>
            </View>
          )}
        />
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'AUDIT' && (
        <View style={{ flex: 1 }}>
          <View style={styles.auditSearchBox}>
            <TextInput
              style={styles.input}
              placeholder="Filter audit actions, email, IP address..."
              placeholderTextColor={THEME.colors.textMuted}
              value={auditSearch}
              onChangeText={setAuditSearch}
            />
          </View>

          <FlatList
            data={filteredAuditLogs}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={[styles.cardTitle, { color: '#fb7185' }]}>{item.action}</Text>
                  <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.cardSub}>Operator: {item.user_email || 'System Agent'} ({item.ip_address || '127.0.0.1'})</Text>
                {item.details ? (
                  <Text style={[styles.cardSub, { color: THEME.colors.textMuted, marginTop: 4 }]}>
                    {item.details}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </View>
      )}

      {/* Create Operator Modal */}
      {isCreatingUser && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setIsCreatingUser(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Provision Operator Account</Text>
              <Text style={styles.modalSubtitle}>Create new SOC Analyst, Responder, or Auditor account.</Text>

              <Text style={styles.inputLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Jane Foster"
                placeholderTextColor={THEME.colors.textMuted}
                value={newFullName}
                onChangeText={setNewFullName}
              />

              <Text style={styles.inputLabel}>WORK EMAIL *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. jfoster@hospital.org"
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.inputLabel}>INITIAL PASSWORD *</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 characters with symbols"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>ASSIGN SECURITY ROLE</Text>
              {roles.map((r) => {
                const isSelected = selectedRoleIds.includes(r.id);
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleSelectPill, isSelected && styles.roleSelectPillActive]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.id));
                      } else {
                        setSelectedRoleIds([...selectedRoleIds, r.id]);
                      }
                    }}
                  >
                    <Text style={[styles.roleSelectText, isSelected && styles.roleSelectTextActive]}>
                      {isSelected ? '✓ ' : '+ '}{r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateUser} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Provision Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreatingUser(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* User Detail & Status Toggle Modal */}
      {selectedUser && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedUser(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedUser.full_name}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedUser.is_active ? 'ACTIVE' : 'DEACTIVATED'} size="md" />
                {selectedUser.is_superuser && <Badge label="SUPER ADMIN" size="md" />}
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaText}>Work Email: <Text style={styles.metaValue}>{selectedUser.email}</Text></Text>
                <Text style={styles.metaText}>Account ID: <Text style={styles.metaValue}>{selectedUser.id}</Text></Text>
                <Text style={styles.metaText}>Assigned Roles: <Text style={styles.metaValue}>{selectedUser.roles ? selectedUser.roles.map(r => r.name).join(', ') : 'None'}</Text></Text>
                <Text style={styles.metaText}>Created Date: <Text style={styles.metaValue}>{new Date(selectedUser.created_at).toLocaleString()}</Text></Text>
              </View>

              {isSuperAdmin() && !selectedUser.is_superuser && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: selectedUser.is_active ? '#b91c1c' : '#059669', marginTop: 12 }]}
                  onPress={() => handleToggleUserActive(selectedUser)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.primaryBtnText}>
                      {selectedUser.is_active ? '⚠️ Deactivate Account' : '✓ Activate Account'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedUser(null)}>
                <Text style={styles.cancelBtnText}>Close User Details</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.primary,
  },
  tabText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fb7185',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subHeaderTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textTransform: 'uppercase',
  },
  subHeaderSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  auditSearchBox: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  cardSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  timeText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 14,
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
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 12,
    marginBottom: 8,
  },
  roleSelectPill: {
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 6,
  },
  roleSelectPillActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  roleSelectText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  roleSelectTextActive: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaCard: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 12,
  },
  metaText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  metaValue: {
    color: '#38bdf8',
    fontWeight: '600',
  }
});
