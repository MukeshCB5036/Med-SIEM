import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  RefreshControl, StyleSheet
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { ThreatIndicatorItem } from '../../types';

interface ThreatIntelScreenProps {
  indicators: ThreatIndicatorItem[];
  refreshing: boolean;
  onRefresh: () => void;
}

export const ThreatIntelScreen: React.FC<ThreatIntelScreenProps> = ({
  indicators,
  refreshing,
  onRefresh,
}) => {
  const [selectedIoc, setSelectedIoc] = useState<ThreatIndicatorItem | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Threat Intelligence & IOC Engine ({indicators.length})</Text>
        <Text style={styles.subtitle}>Curated healthcare adversary feeds, MISP & VirusTotal mappings</Text>
      </View>

      <FlatList
        data={indicators}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No threat intelligence indicators loaded.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedIoc(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <Text style={styles.iocCode} numberOfLines={1}>{item.indicator}</Text>
              <Badge label={item.reputation} />
            </View>

            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={styles.cardSub}>Type: {item.type} • Confidence: <Text style={{ color: '#34d399', fontWeight: 'bold' }}>{item.confidence}</Text></Text>
              <Text style={styles.matchedText}>Matches: {item.matched_events_count}</Text>
            </View>

            <Text style={styles.mitreText}>MITRE: {item.mitre_technique}</Text>
            <Text style={styles.sourceText}>Source: {item.source}</Text>
          </TouchableOpacity>
        )}
      />

      {/* IOC Detail Modal */}
      {selectedIoc && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedIoc(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Threat Indicator Intelligence</Text>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Badge label={selectedIoc.reputation} size="md" />
                <Text style={{ color: '#34d399', fontWeight: 'bold', fontSize: 13 }}>Confidence: {selectedIoc.confidence}</Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaHeader}>Indicator of Compromise (IOC)</Text>
                <Text style={styles.codeText}>{selectedIoc.indicator}</Text>
                <Text style={[styles.metaText, { marginTop: 8 }]}>Indicator Type: <Text style={styles.metaValue}>{selectedIoc.type}</Text></Text>
                <Text style={styles.metaText}>Source Provider: <Text style={styles.metaValue}>{selectedIoc.source}</Text></Text>
                <Text style={styles.metaText}>MITRE Technique: <Text style={styles.metaValue}>{selectedIoc.mitre_technique}</Text></Text>
                <Text style={styles.metaText}>First Identified: <Text style={styles.metaValue}>{selectedIoc.first_seen}</Text></Text>
                <Text style={styles.metaText}>Last Identified: <Text style={styles.metaValue}>{selectedIoc.last_seen}</Text></Text>
                <Text style={styles.metaText}>Matched Events in SIEM: <Text style={{ color: THEME.colors.primary, fontWeight: 'bold' }}>{selectedIoc.matched_events_count}</Text></Text>
              </View>

              <Text style={styles.sectionHeader}>Adversary Tradecraft & Context</Text>
              <Text style={styles.descText}>{selectedIoc.description}</Text>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedIoc(null)}>
                <Text style={styles.closeBtnText}>Close Threat Details</Text>
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
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
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
  iocCode: {
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  cardSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  matchedText: {
    color: THEME.colors.critical,
    fontSize: 11,
    fontWeight: 'bold',
  },
  mitreText: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 4,
  },
  sourceText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
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
  metaHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeText: {
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#020617',
    padding: 8,
    borderRadius: 4,
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
  closeBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  }
});
