import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { AssetItem, AgentItem, EnrollmentTokenItem } from '../../types';
import { apiService } from '../../services/api';

interface AssetsScreenProps {
  assets: AssetItem[];
  agents: AgentItem[];
  tokens: EnrollmentTokenItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onAssetUpdated: () => void;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({
  assets,
  agents,
  tokens,
  refreshing,
  onRefresh,
  onAssetUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'AGENTS' | 'TOKENS'>('ASSETS');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);

  // Modals & Action States
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Asset Form
  const [newHostname, setNewHostname] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newType, setNewType] = useState('Medical PACS Server');
  const [newCriticality, setNewCriticality] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  // New Token Form
  const [tokenName, setTokenName] = useState('');
  const [tokenUses, setTokenUses] = useState('10');
  const [tokenHours, setTokenHours] = useState('72');
  const [createdTokenStr, setCreatedTokenStr] = useState<string | null>(null);

  const handleCreateAsset = async () => {
    if (!newHostname.trim() || !newIp.trim()) {
      Alert.alert('Validation Error', 'Please specify both hostname and IP address.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post('/assets', {
      hostname: newHostname.trim(),
      ip_address: newIp.trim(),
      asset_type: newType,
      criticality: newCriticality,
      status: 'Online',
      org_id: '00000000-0000-0000-0000-000000000000'
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Asset Registered', `Asset ${newHostname} added to inventory.`);
      setIsAddingAsset(false);
      setNewHostname('');
      setNewIp('');
      onAssetUpdated();
    } else {
      Alert.alert('Registration Failed', res.error || 'Failed to add asset.');
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      Alert.alert('Validation Error', 'Please enter a name for the enrollment token.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post('/agents/enrollment-tokens', {
      name: tokenName.trim(),
      max_uses: parseInt(tokenUses, 10) || 5,
      expires_in_hours: parseInt(tokenHours, 10) || 72,
      org_id: '00000000-0000-0000-0000-000000000000'
    });
    setActionLoading(false);

    if (res.success && res.data) {
      setCreatedTokenStr(res.data.token || res.data.enrollment_token || 'TOKEN_GENERATED');
      onAssetUpdated();
    } else {
      Alert.alert('Creation Failed', res.error || 'Failed to create enrollment token.');
    }
  };

  const handleRevokeAgent = async (agentId: string) => {
    setActionLoading(true);
    const res = await apiService.post(`/agents/${agentId}/revoke`, {});
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Agent Revoked', 'Agent credentials have been permanently revoked.');
      setSelectedAgent(null);
      onAssetUpdated();
    } else {
      Alert.alert('Revocation Failed', res.error || 'Failed to revoke agent.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ASSETS' && styles.tabItemActive]}
          onPress={() => setActiveTab('ASSETS')}
        >
          <Text style={[styles.tabText, activeTab === 'ASSETS' && styles.tabTextActive]}>
            Assets ({assets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'AGENTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('AGENTS')}
        >
          <Text style={[styles.tabText, activeTab === 'AGENTS' && styles.tabTextActive]}>
            Agents ({agents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TOKENS' && styles.tabItemActive]}
          onPress={() => setActiveTab('TOKENS')}
        >
          <Text style={[styles.tabText, activeTab === 'TOKENS' && styles.tabTextActive]}>
            Enrollment ({tokens.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Header */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>
          {activeTab === 'ASSETS' ? 'Monitored Healthcare Assets' : activeTab === 'AGENTS' ? 'Endpoint Agent Fleet' : 'Pre-Shared Enrollment Tokens'}
        </Text>
        {activeTab === 'ASSETS' ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => setIsAddingAsset(true)}>
            <Text style={styles.actionBtnText}>+ Add Asset</Text>
          </TouchableOpacity>
        ) : activeTab === 'TOKENS' ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setCreatedTokenStr(null); setIsCreatingToken(true); }}>
            <Text style={styles.actionBtnText}>+ Generate Token</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tab 1: Assets List */}
      {activeTab === 'ASSETS' && (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedAsset(item)} activeOpacity={0.8}>
              <View style={styles.row}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.hostname}</Text>
                <Badge label={item.status} />
              </View>
              <Text style={styles.cardSub}>IP Address: <Text style={{ color: '#38bdf8' }}>{item.ip_address}</Text> • Criticality: {item.criticality}</Text>
              <Text style={styles.cardSub}>Asset Type: {item.asset_type || 'Clinical Server'} • OS: {item.os_type || 'Linux'}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Tab 2: Agents List */}
      {activeTab === 'AGENTS' && (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No registered endpoint agents found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedAgent(item)} activeOpacity={0.8}>
              <View style={styles.row}>
                <Text style={styles.cardTitle} numberOfLines={1}>Agent: {item.id.substring(0, 12)}...</Text>
                <Badge label={item.status} />
              </View>
              <Text style={styles.cardSub}>Platform: {item.os_name} {item.os_version} (v{item.agent_version})</Text>
              <Text style={styles.cardSub}>Last Heartbeat: {new Date(item.last_heartbeat).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Tab 3: Enrollment Tokens */}
      {activeTab === 'TOKENS' && (
        <FlatList
          data={tokens}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active agent enrollment tokens.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Badge label={item.is_revoked ? 'REVOKED' : 'ACTIVE'} />
              </View>
              <Text style={styles.cardSub}>Uses: {item.used_count} of {item.max_uses}</Text>
              <Text style={styles.cardSub}>Expires: {new Date(item.expires_at).toLocaleString()}</Text>
            </View>
          )}
        />
      )}

      {/* Add Asset Modal */}
      {isAddingAsset && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setIsAddingAsset(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Register Healthcare Asset</Text>
              <Text style={styles.modalSubtitle}>Enroll medical servers, EHR endpoints, or DICOM imaging nodes.</Text>

              <Text style={styles.inputLabel}>HOSTNAME / FQDN *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. pacs-dicom-node01.hospital.org"
                placeholderTextColor={THEME.colors.textMuted}
                value={newHostname}
                onChangeText={setNewHostname}
              />

              <Text style={styles.inputLabel}>IP ADDRESS *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10.0.1.55"
                placeholderTextColor={THEME.colors.textMuted}
                value={newIp}
                onChangeText={setNewIp}
              />

              <Text style={styles.inputLabel}>ASSET CLASSIFICATION</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Medical Imaging Archive (PACS)"
                placeholderTextColor={THEME.colors.textMuted}
                value={newType}
                onChangeText={setNewType}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAsset} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register Healthcare Asset</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddingAsset(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Generate Enrollment Token Modal */}
      {isCreatingToken && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setIsCreatingToken(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Generate Agent Enrollment Token</Text>
              <Text style={styles.modalSubtitle}>Create single-use or multi-use pre-shared keys for native agents.</Text>

              {createdTokenStr ? (
                <View style={styles.tokenCreatedBox}>
                  <Text style={styles.tokenSuccessText}>✓ Enrollment Token Created</Text>
                  <Text style={styles.tokenCodeText}>{createdTokenStr}</Text>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                    Copy this token into agent/.env or pass to agent registration CLI.
                  </Text>
                  <TouchableOpacity style={[styles.submitBtn, { marginTop: 14 }]} onPress={() => setIsCreatingToken(false)}>
                    <Text style={styles.btnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>TOKEN NAME / IDENTIFIER *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ICU_WORKSTATIONS_Q4"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={tokenName}
                    onChangeText={setTokenName}
                  />

                  <Text style={styles.inputLabel}>MAX USES</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="number-pad"
                    value={tokenUses}
                    onChangeText={setTokenUses}
                  />

                  <Text style={styles.inputLabel}>EXPIRATION (HOURS)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="72"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="number-pad"
                    value={tokenHours}
                    onChangeText={setTokenHours}
                  />

                  <TouchableOpacity style={styles.submitBtn} onPress={handleCreateToken} disabled={actionLoading}>
                    {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Generate Secure Token</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreatingToken(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedAsset(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedAsset.hostname}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedAsset.status} size="md" />
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: 'bold' }}>{selectedAsset.ip_address}</Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaText}>Asset Type: <Text style={styles.metaValue}>{selectedAsset.asset_type || 'Server'}</Text></Text>
                <Text style={styles.metaText}>Criticality Level: <Text style={styles.metaValue}>{selectedAsset.criticality}</Text></Text>
                <Text style={styles.metaText}>Operating System: <Text style={styles.metaValue}>{selectedAsset.os_type || 'Linux / Windows Server'}</Text></Text>
                <Text style={styles.metaText}>Organization UUID: <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>{selectedAsset.org_id}</Text></Text>
                <Text style={styles.metaText}>Registered Date: <Text style={styles.metaValue}>{new Date(selectedAsset.created_at).toLocaleString()}</Text></Text>
              </View>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedAsset(null)}>
                <Text style={styles.cancelBtnText}>Close Asset Details</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Agent Detail Modal & Revocation */}
      {selectedAgent && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedAgent(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Endpoint Agent Details</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedAgent.status} size="md" />
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>v{selectedAgent.agent_version}</Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaText}>Agent ID: <Text style={styles.metaValue}>{selectedAgent.id}</Text></Text>
                <Text style={styles.metaText}>Associated Asset ID: <Text style={styles.metaValue}>{selectedAgent.asset_id}</Text></Text>
                <Text style={styles.metaText}>Platform Host OS: <Text style={styles.metaValue}>{selectedAgent.os_name} {selectedAgent.os_version}</Text></Text>
                <Text style={styles.metaText}>Last Heartbeat: <Text style={styles.metaValue}>{new Date(selectedAgent.last_heartbeat).toLocaleString()}</Text></Text>
              </View>

              {selectedAgent.status !== 'Revoked' && (
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: THEME.colors.critical, marginTop: 12 }]}
                  onPress={() => handleRevokeAgent(selectedAgent.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>⚠️ Revoke Agent Credentials</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.cancelBtn, { marginTop: 10 }]} onPress={() => setSelectedAgent(null)}>
                <Text style={styles.cancelBtnText}>Close Inspector</Text>
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
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
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
  emptyCard: {
    backgroundColor: THEME.colors.surface,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
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
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
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
  },
  tokenCreatedBox: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    marginTop: 10,
  },
  tokenSuccessText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  tokenCodeText: {
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 6,
  }
});
