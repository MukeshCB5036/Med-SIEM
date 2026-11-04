import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { AlertItem, UserItem } from '../../types';
import { apiService } from '../../services/api';

interface AlertsScreenProps {
  alerts: AlertItem[];
  users: UserItem[];
  deduplicate: boolean;
  onToggleDeduplicate: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  selectedAlert: AlertItem | null;
  onSelectAlert: (alert: AlertItem | null) => void;
  onAlertUpdated: () => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  users,
  deduplicate,
  onToggleDeduplicate,
  refreshing,
  onRefresh,
  selectedAlert,
  onSelectAlert,
  onAlertUpdated,
}) => {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('Resolved via MedSIEM Mobile SOC');
  const [assigneeId, setAssigneeId] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateTitle, setEscalateTitle] = useState('');
  const [escalateDesc, setEscalateDesc] = useState('');

  // Filter alerts by severity
  const filteredAlerts = alerts.filter(a => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  const handleResolve = async (id: string) => {
    setActionLoading(true);
    const res = await apiService.post(`/alerts/${id}/resolve`, {
      resolution_notes: resolutionNotes || 'Resolved by SOC Analyst'
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Alert Resolved', 'Security threat marked as RESOLVED.');
      onSelectAlert(null);
      onAlertUpdated();
    } else {
      Alert.alert('Action Failed', res.error || 'Unable to resolve alert.');
    }
  };

  const handleAssign = async (alertId: string, userId: string) => {
    if (!userId) return;
    setActionLoading(true);
    const res = await apiService.post(`/alerts/${alertId}/assign?user_id=${userId}`, {});
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Analyst Assigned', 'Alert investigation ownership updated.');
      onSelectAlert(null);
      onAlertUpdated();
    } else {
      Alert.alert('Action Failed', res.error || 'Failed to assign alert.');
    }
  };

  const handleEscalateToIncident = async (alert: AlertItem) => {
    if (!escalateTitle.trim()) {
      Alert.alert('Validation Error', 'Please provide a title for the new incident.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post('/incidents', {
      title: escalateTitle.trim(),
      description: escalateDesc.trim() || alert.description || `Escalated from security alert: ${alert.title}`,
      severity: alert.severity,
      status: 'OPEN',
      org_id: alert.org_id || '00000000-0000-0000-0000-000000000000',
      alert_ids: [alert.id]
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Incident Escalated', `Incident #${res.data?.id?.substring(0, 8) || 'NEW'} created successfully.`);
      setIsEscalating(false);
      onSelectAlert(null);
      onAlertUpdated();
    } else {
      Alert.alert('Escalation Failed', res.error || 'Unable to create security incident.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Filter and Deduplication Toggle Bar */}
      <View style={styles.topControlBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, deduplicate && styles.toggleBtnActive]}
          onPress={onToggleDeduplicate}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleBtnText, deduplicate && styles.toggleBtnTextActive]}>
            {deduplicate ? '✓ Correlated Threats View (Deduplicated)' : 'Raw Event Feed (All Alerts)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Severity Filter Pills */}
      <View style={styles.filterPillsRow}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
          <TouchableOpacity
            key={sev}
            style={[styles.pill, severityFilter === sev && styles.pillActive]}
            onPress={() => setSeverityFilter(sev)}
          >
            <Text style={[styles.pillText, severityFilter === sev && styles.pillTextActive]}>{sev}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alerts Feed */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No alerts matching current filter criteria.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setEscalateTitle(`Investigation: ${item.title}`);
              setEscalateDesc(item.description || '');
              onSelectAlert(item);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.badgeRow}>
                {item.occurrence_count > 1 && (
                  <View style={styles.occurrenceBadge}>
                    <Text style={styles.occurrenceText}>x{item.occurrence_count}</Text>
                  </View>
                )}
                <Badge label={item.severity} />
              </View>
            </View>

            <Text style={styles.cardSub}>
              Status: <Text style={{ color: item.status === 'RESOLVED' ? THEME.colors.online : THEME.colors.critical, fontWeight: 'bold' }}>{item.status}</Text>
              {' • '}IP: {item.source_ip || 'Internal'}
            </Text>

            <Text style={styles.cardSub}>MITRE ATT&CK: {item.mitre_technique || 'N/A'}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.timeText}>First: {new Date(item.first_seen || item.created_at).toLocaleTimeString()}</Text>
              <Text style={styles.timeText}>Last: {new Date(item.last_seen || item.created_at).toLocaleTimeString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Alert Detail & Triage Action Modal */}
      {selectedAlert && (
        <Modal visible={true} animationType="slide" onRequestClose={() => onSelectAlert(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                {selectedAlert.occurrence_count > 1 && (
                  <View style={[styles.occurrenceBadge, { paddingHorizontal: 8, paddingVertical: 4 }]}>
                    <Text style={[styles.occurrenceText, { fontSize: 11 }]}>x{selectedAlert.occurrence_count} occurrences</Text>
                  </View>
                )}
              </View>

              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedAlert.severity} size="md" />
                <Text style={{ color: selectedAlert.status === 'RESOLVED' ? THEME.colors.online : THEME.colors.critical, fontWeight: 'bold', fontSize: 13 }}>
                  Status: {selectedAlert.status}
                </Text>
              </View>

              {/* Correlation & Metadata Box */}
              <View style={styles.metaCard}>
                <Text style={styles.metaHeader}>Correlation & Telemetry Info</Text>
                <Text style={styles.metaText}>Correlation Key: <Text style={styles.metaValue}>{selectedAlert.correlation_key ? `${selectedAlert.correlation_key.substring(0, 20)}...` : 'Direct Detection'}</Text></Text>
                <Text style={styles.metaText}>First Seen: <Text style={styles.metaValue}>{new Date(selectedAlert.first_seen || selectedAlert.created_at).toLocaleString()}</Text></Text>
                <Text style={styles.metaText}>Last Seen: <Text style={styles.metaValue}>{new Date(selectedAlert.last_seen || selectedAlert.updated_at).toLocaleString()}</Text></Text>
                <Text style={styles.metaText}>Source IP: <Text style={styles.metaValue}>{selectedAlert.source_ip || '127.0.0.1'}</Text></Text>
                <Text style={styles.metaText}>MITRE Technique: <Text style={styles.metaValue}>{selectedAlert.mitre_technique || 'N/A'}</Text></Text>
              </View>

              <Text style={styles.sectionHeader}>Threat Intelligence Abstract</Text>
              <Text style={styles.descText}>{selectedAlert.description || 'No detailed rule description provided.'}</Text>

              {/* Correlated Event History */}
              {selectedAlert.supporting_events && selectedAlert.supporting_events.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionHeader}>Correlated Event Logs ({selectedAlert.supporting_events.length})</Text>
                  {selectedAlert.supporting_events.slice(-5).map((ev: any, idx: number) => (
                    <View key={idx} style={styles.subEventCard}>
                      <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>{ev.event_type || 'Matched Log'}</Text>
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>Time: {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'N/A'}</Text>
                      {ev.message && <Text style={{ color: THEME.colors.textSecondary, fontSize: 11, marginTop: 2 }}>{ev.message}</Text>}
                    </View>
                  ))}
                </View>
              )}

              {/* Escalation Form */}
              {isEscalating ? (
                <View style={styles.escalateBox}>
                  <Text style={styles.sectionHeader}>Escalate Alert to Security Incident</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Incident Title..."
                    placeholderTextColor={THEME.colors.textMuted}
                    value={escalateTitle}
                    onChangeText={setEscalateTitle}
                  />
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    placeholder="Incident Scope & Impact..."
                    placeholderTextColor={THEME.colors.textMuted}
                    multiline
                    value={escalateDesc}
                    onChangeText={setEscalateDesc}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: THEME.colors.primary }]}
                      onPress={() => handleEscalateToIncident(selectedAlert)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirm Escalation</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: THEME.colors.surfaceElevated }]}
                      onPress={() => setIsEscalating(false)}
                    >
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                    onPress={() => setIsEscalating(true)}
                  >
                    <Text style={styles.btnText}>🛡️ Escalate to Incident</Text>
                  </TouchableOpacity>

                  {selectedAlert.status !== 'RESOLVED' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                      onPress={() => handleResolve(selectedAlert.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>✓ Resolve Alert</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.colors.surfaceElevated, marginTop: 12 }]}
                onPress={() => {
                  setIsEscalating(false);
                  onSelectAlert(null);
                }}
              >
                <Text style={styles.btnText}>Close Triage Inspector</Text>
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
  topControlBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  toggleBtn: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  toggleBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  pillText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#ffffff',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occurrenceBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  occurrenceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
  },
  timeText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
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
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    flex: 1,
    marginRight: 8,
  },
  metaCard: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 12,
  },
  metaHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  metaText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  metaValue: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  descText: {
    color: THEME.colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  subEventCard: {
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  escalateBox: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 12,
  },
  input: {
    backgroundColor: THEME.colors.bg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 12,
    marginBottom: 8,
  }
});
