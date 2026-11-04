import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { IncidentItem, UserItem, Severity, IncidentStatus } from '../../types';
import { apiService } from '../../services/api';

interface IncidentsScreenProps {
  incidents: IncidentItem[];
  users: UserItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onIncidentUpdated: () => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({
  incidents,
  users,
  refreshing,
  onRefresh,
  onIncidentUpdated,
}) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New Incident Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<Severity>('HIGH');

  // New Comment Form State
  const [newComment, setNewComment] = useState('');

  // Filtered Incidents
  const filteredIncidents = incidents.filter(i => {
    if (statusFilter === 'ALL') return true;
    return i.status === statusFilter;
  });

  const handleCreateIncident = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter an incident title.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post('/incidents', {
      title: newTitle.trim(),
      description: newDesc.trim() || 'Manual Security Incident created via MedSIEM Mobile SOC',
      severity: newSeverity,
      status: 'OPEN',
      org_id: '00000000-0000-0000-0000-000000000000',
      alert_ids: []
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Incident Created', 'Security incident created successfully.');
      setIsCreating(false);
      setNewTitle('');
      setNewDesc('');
      onIncidentUpdated();
    } else {
      Alert.alert('Creation Failed', res.error || 'Failed to create incident.');
    }
  };

  const handleAddComment = async (id: string) => {
    if (!newComment.trim()) return;
    setActionLoading(true);
    const res = await apiService.post(`/incidents/${id}/comments`, {
      comment: newComment.trim()
    });
    setActionLoading(false);

    if (res.success) {
      setNewComment('');
      // Refresh current incident
      const updatedInc = await apiService.get(`/incidents/${id}`);
      if (updatedInc.success && updatedInc.data) {
        setSelectedIncident(updatedInc.data);
      }
      onIncidentUpdated();
    } else {
      Alert.alert('Error', res.error || 'Failed to post investigation note.');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: IncidentStatus) => {
    setActionLoading(true);
    const res = await apiService.patch(`/incidents/${id}`, {
      status: newStatus
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Status Updated', `Incident status set to ${newStatus}`);
      const updatedInc = await apiService.get(`/incidents/${id}`);
      if (updatedInc.success && updatedInc.data) {
        setSelectedIncident(updatedInc.data);
      }
      onIncidentUpdated();
    } else {
      Alert.alert('Error', res.error || 'Failed to update incident status.');
    }
  };

  const handleResolveIncident = async (id: string) => {
    setActionLoading(true);
    const res = await apiService.post(`/incidents/${id}/resolve`, {});
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Incident Closed', 'Security incident marked as RESOLVED.');
      setSelectedIncident(null);
      onIncidentUpdated();
    } else {
      Alert.alert('Error', res.error || 'Failed to resolve incident.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Create Button */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Active Incidents ({filteredIncidents.length})</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)} activeOpacity={0.8}>
          <Text style={styles.createBtnText}>+ New Incident</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filterPillsRow}>
        {['ALL', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.pill, statusFilter === st && styles.pillActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[styles.pillText, statusFilter === st && styles.pillTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Incidents List */}
      <FlatList
        data={filteredIncidents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No security incidents matching current status.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedIncident(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Badge label={item.severity} />
            </View>

            <Text style={styles.cardSub}>
              Status: <Text style={{ color: item.status === 'RESOLVED' ? THEME.colors.online : THEME.colors.high, fontWeight: 'bold' }}>{item.status}</Text>
              {' • '}Assignee: {item.assignee || 'Unassigned'}
            </Text>

            <View style={styles.footerRow}>
              <Text style={styles.timeText}>
                Linked Alerts: {item.alerts ? item.alerts.length : 0} • Notes: {item.comments ? item.comments.length : 0}
              </Text>
              <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Incident Modal */}
      {isCreating && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setIsCreating(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Declare Security Incident</Text>
              <Text style={styles.modalSubtitle}>Escalate healthcare telemetry or create a new investigation record.</Text>

              <Text style={styles.inputLabel}>INCIDENT TITLE *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Critical Patient Database Exfiltration Attempt"
                placeholderTextColor={THEME.colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>SEVERITY LEVEL</Text>
              <View style={styles.sevSelectorRow}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sevOption, newSeverity === s && styles.sevOptionActive]}
                    onPress={() => setNewSeverity(s)}
                  >
                    <Text style={[styles.sevOptionText, newSeverity === s && styles.sevOptionTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>INCIDENT DESCRIPTION / SCOPE</Text>
              <TextInput
                style={[styles.input, { height: 90 }]}
                placeholder="Detailed investigation scope, affected EHR nodes, clinical impact..."
                placeholderTextColor={THEME.colors.textMuted}
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />

              <TouchableOpacity style={styles.primaryActionBtn} onPress={handleCreateIncident} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create & Dispatch Incident</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.secondaryActionBtn, { marginTop: 10 }]} onPress={() => setIsCreating(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Incident Detail & Investigation Modal */}
      {selectedIncident && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedIncident(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedIncident.title}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedIncident.severity} size="md" />
                <Text style={{ color: selectedIncident.status === 'RESOLVED' ? THEME.colors.online : THEME.colors.high, fontWeight: 'bold' }}>
                  Status: {selectedIncident.status}
                </Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaHeader}>Investigation Parameters</Text>
                <Text style={styles.metaText}>Incident ID: <Text style={styles.metaValue}>{selectedIncident.id}</Text></Text>
                <Text style={styles.metaText}>Assignee: <Text style={styles.metaValue}>{selectedIncident.assignee || 'Unassigned (Available for Triage)'}</Text></Text>
                <Text style={styles.metaText}>Reported: <Text style={styles.metaValue}>{new Date(selectedIncident.created_at).toLocaleString()}</Text></Text>
              </View>

              <Text style={styles.sectionHeader}>Incident Description & Scope</Text>
              <Text style={styles.descText}>{selectedIncident.description || 'No incident details specified.'}</Text>

              {/* Status Transition Buttons */}
              <Text style={styles.sectionHeader}>Change Investigation Status</Text>
              <View style={styles.statusTransitionsRow}>
                {selectedIncident.status !== 'INVESTIGATING' && (
                  <TouchableOpacity
                    style={[styles.smallStatusBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={() => handleUpdateStatus(selectedIncident.id, 'INVESTIGATING')}
                    disabled={actionLoading}
                  >
                    <Text style={styles.smallStatusBtnText}>Investigating</Text>
                  </TouchableOpacity>
                )}
                {selectedIncident.status !== 'CONTAINED' && (
                  <TouchableOpacity
                    style={[styles.smallStatusBtn, { backgroundColor: '#f59e0b' }]}
                    onPress={() => handleUpdateStatus(selectedIncident.id, 'CONTAINED')}
                    disabled={actionLoading}
                  >
                    <Text style={styles.smallStatusBtnText}>Contained</Text>
                  </TouchableOpacity>
                )}
                {selectedIncident.status !== 'RESOLVED' && (
                  <TouchableOpacity
                    style={[styles.smallStatusBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleResolveIncident(selectedIncident.id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.smallStatusBtnText}>Close / Resolve</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Linked Alerts Evidence */}
              {selectedIncident.alerts && selectedIncident.alerts.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionHeader}>Linked Threat Alerts ({selectedIncident.alerts.length})</Text>
                  {selectedIncident.alerts.map((al) => (
                    <View key={al.id} style={styles.alertEvidenceCard}>
                      <Text style={{ color: '#f8fafc', fontSize: 12, fontWeight: 'bold' }}>{al.title}</Text>
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>MITRE: {al.mitre_technique || 'N/A'} • IP: {al.source_ip || 'Internal'}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Investigation Notes & Comments */}
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
                Investigation Notes ({selectedIncident.comments ? selectedIncident.comments.length : 0})
              </Text>
              {selectedIncident.comments && selectedIncident.comments.map((c, idx) => (
                <View key={c.id || idx} style={styles.commentBox}>
                  <Text style={styles.commentAuthor}>{c.author || 'SOC Analyst'}:</Text>
                  <Text style={styles.commentText}>{c.comment}</Text>
                  <Text style={styles.commentTime}>{new Date(c.created_at).toLocaleTimeString()}</Text>
                </View>
              ))}

              {/* Post Comment Input */}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Append analyst forensic observation..."
                  placeholderTextColor={THEME.colors.textMuted}
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity
                  style={styles.postCommentBtn}
                  onPress={() => handleAddComment(selectedIncident.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.postCommentText}>Post</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { marginTop: 16 }]}
                onPress={() => setSelectedIncident(null)}
              >
                <Text style={styles.secondaryBtnText}>Close Incident Details</Text>
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
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  createBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 11,
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
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
  sevSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sevOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  sevOptionActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  sevOptionText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sevOptionTextActive: {
    color: '#fb7185',
  },
  primaryActionBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryActionBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  secondaryBtnText: {
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
    marginVertical: 10,
  },
  metaHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
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
  statusTransitionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  smallStatusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  smallStatusBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertEvidenceCard: {
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  commentBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  commentAuthor: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: 'bold',
  },
  commentText: {
    color: THEME.colors.text,
    fontSize: 12,
    marginTop: 2,
  },
  commentTime: {
    color: THEME.colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 12,
  },
  postCommentBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
  },
  postCommentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
