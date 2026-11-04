import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { NormalizedEvent } from '../../types';
import { apiService } from '../../services/api';

interface EventsScreenProps {
  events: NormalizedEvent[];
  refreshing: boolean;
  onRefresh: () => void;
  onFilterChange: (query: string, severity: string) => void;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({
  events,
  refreshing,
  onRefresh,
  onFilterChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [activeTab, setActiveTab] = useState<'NORMALIZED' | 'RAW'>('NORMALIZED');
  const [rawLogData, setRawLogData] = useState<any>(null);
  const [rawLogLoading, setRawLogLoading] = useState(false);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onFilterChange(text, severityFilter);
  };

  const handleSeverityChange = (sev: string) => {
    setSeverityFilter(sev);
    onFilterChange(searchQuery, sev);
  };

  const openEventInspector = async (ev: NormalizedEvent) => {
    setSelectedEvent(ev);
    setActiveTab('NORMALIZED');
    setRawLogData(null);

    if (ev.raw_log_id) {
      setRawLogLoading(true);
      const res = await apiService.get(`/events/raw/${ev.raw_log_id}`);
      setRawLogLoading(false);
      if (res.success && res.data) {
        setRawLogData(res.data);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs by keyword, host, event type, IP..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Severity Filter Pills */}
      <View style={styles.filterPillsRow}>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'].map((sev) => (
          <TouchableOpacity
            key={sev}
            style={[styles.pill, severityFilter === sev && styles.pillActive]}
            onPress={() => handleSeverityChange(sev)}
          >
            <Text style={[styles.pillText, severityFilter === sev && styles.pillTextActive]}>{sev}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events Stream */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No matching security log events found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEventInspector(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.event_type}</Text>
              <Badge label={item.severity} />
            </View>

            <Text style={styles.cardSub}>
              Host: <Text style={{ color: '#38bdf8' }}>{item.hostname}</Text> • Source: {item.source}
            </Text>
            <Text style={styles.cardSub}>
              Category: {item.event_category} • User: {item.username || 'SYSTEM'}
            </Text>

            {item.source_ip && (
              <Text style={styles.cardSub}>
                Network: {item.source_ip} {item.destination_ip ? `→ ${item.destination_ip}` : ''}
              </Text>
            )}

            {item.message ? (
              <Text style={styles.messageSnippet} numberOfLines={2}>
                "{item.message}"
              </Text>
            ) : null}

            <View style={styles.footerRow}>
              <Text style={styles.timeText}>
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
              </Text>
              <Text style={styles.inspectLink}>Inspect Payload →</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Event Payload Inspector Modal */}
      {selectedEvent && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedEvent.event_type}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedEvent.severity} size="md" />
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11 }}>
                  {selectedEvent.timestamp ? new Date(selectedEvent.timestamp).toLocaleString() : 'N/A'}
                </Text>
              </View>

              {/* Event Attributes Box */}
              <View style={styles.metaCard}>
                <Text style={styles.metaText}>Hostname: <Text style={styles.metaValue}>{selectedEvent.hostname}</Text></Text>
                <Text style={styles.metaText}>Event Category: <Text style={styles.metaValue}>{selectedEvent.event_category}</Text></Text>
                <Text style={styles.metaText}>Log Source: <Text style={styles.metaValue}>{selectedEvent.source}</Text></Text>
                <Text style={styles.metaText}>User Identity: <Text style={styles.metaValue}>{selectedEvent.username || 'SYSTEM'}</Text></Text>
                {selectedEvent.source_ip && (
                  <Text style={styles.metaText}>Source IP: <Text style={styles.metaValue}>{selectedEvent.source_ip}</Text></Text>
                )}
                {selectedEvent.destination_ip && (
                  <Text style={styles.metaText}>Destination IP: <Text style={styles.metaValue}>{selectedEvent.destination_ip}</Text></Text>
                )}
                {selectedEvent.raw_log_id && (
                  <Text style={styles.metaText}>Raw Log UUID: <Text style={{ color: THEME.colors.textMuted, fontSize: 10 }}>{selectedEvent.raw_log_id}</Text></Text>
                )}
              </View>

              {/* Tab Selector: Normalized JSON vs Raw Log Container */}
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'NORMALIZED' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('NORMALIZED')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'NORMALIZED' && styles.tabBtnTextActive]}>
                    Canonical Normalized Object
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'RAW' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('RAW')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'RAW' && styles.tabBtnTextActive]}>
                    Preserved Raw Ingestion
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'NORMALIZED' ? (
                <View style={styles.jsonBox}>
                  <Text style={styles.jsonText}>
                    {JSON.stringify(selectedEvent.normalized_json || selectedEvent, null, 2)}
                  </Text>
                </View>
              ) : (
                <View>
                  {rawLogLoading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={THEME.colors.primary} />
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 8 }}>Fetching raw log container from MinIO/PostgreSQL...</Text>
                    </View>
                  ) : rawLogData ? (
                    <View style={styles.jsonBox}>
                      <Text style={{ color: THEME.colors.primary, fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                        Source: {rawLogData.source_name} ({rawLogData.created_at})
                      </Text>
                      <Text style={[styles.jsonText, { color: '#f8fafc' }]}>
                        {rawLogData.raw_content}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>Direct Ingestion Event</Text>
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 4 }}>
                        This telemetry event was ingested directly via canonical JSON API.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedEvent(null)}>
                <Text style={styles.closeBtnText}>Close Event Inspector</Text>
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
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchInput: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 13,
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
    marginTop: 3,
  },
  messageSnippet: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
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
  inspectLink: {
    color: '#0ea5e9',
    fontSize: 10,
    fontWeight: 'bold',
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
    marginTop: 2,
  },
  metaValue: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.surfaceElevated,
  },
  tabBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: THEME.colors.text,
  },
  jsonBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 6,
  },
  jsonText: {
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  }
});
