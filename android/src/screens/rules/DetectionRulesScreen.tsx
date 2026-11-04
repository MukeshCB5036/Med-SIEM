import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  Switch, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { DetectionRuleItem } from '../../types';
import { apiService } from '../../services/api';

interface DetectionRulesScreenProps {
  rules: DetectionRuleItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onRuleUpdated: () => void;
}

export const DetectionRulesScreen: React.FC<DetectionRulesScreenProps> = ({
  rules,
  refreshing,
  onRefresh,
  onRuleUpdated,
}) => {
  const [selectedRule, setSelectedRule] = useState<DetectionRuleItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleRule = async (rule: DetectionRuleItem) => {
    setActionLoading(true);
    const newStatus = !rule.enabled;
    const res = await apiService.patch(`/rules/${rule.id}`, {
      enabled: newStatus
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Rule Updated', `Rule '${rule.name}' is now ${newStatus ? 'ENABLED' : 'DISABLED'}.`);
      if (selectedRule && selectedRule.id === rule.id) {
        setSelectedRule({ ...selectedRule, enabled: newStatus });
      }
      onRuleUpdated();
    } else {
      Alert.alert('Error', res.error || 'Failed to update rule status.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Detection Rules Engine ({rules.length})</Text>
        <Text style={styles.subtitle}>Configured correlation conditions, thresholds & MITRE mappings</Text>
      </View>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No detection rules configured in database.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedRule(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Badge label={item.severity} />
            </View>

            <View style={[styles.row, { marginTop: 8 }]}>
              <Text style={styles.cardSub}>
                Category: <Text style={{ color: '#38bdf8' }}>{item.event_category}</Text>
                {' • '}MITRE: {item.mitre_technique || 'N/A'}
              </Text>
              <Switch
                value={item.enabled}
                onValueChange={() => handleToggleRule(item)}
                trackColor={{ false: '#334155', true: THEME.colors.primaryLight }}
                thumbColor={item.enabled ? THEME.colors.primary : '#94a3b8'}
              />
            </View>

            <Text style={styles.timeText}>
              Threshold: {item.threshold_count} matches in {item.time_window_seconds}s window
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Rule Detail Modal */}
      {selectedRule && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedRule(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedRule.name}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedRule.severity} size="md" />
                <Badge label={selectedRule.enabled ? 'ACTIVE' : 'DISABLED'} size="md" />
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaHeader}>Rule Architecture Parameters</Text>
                <Text style={styles.metaText}>Event Category: <Text style={styles.metaValue}>{selectedRule.event_category}</Text></Text>
                <Text style={styles.metaText}>Rule Type: <Text style={styles.metaValue}>{selectedRule.rule_type}</Text></Text>
                <Text style={styles.metaText}>MITRE Technique: <Text style={styles.metaValue}>{selectedRule.mitre_technique || 'None'}</Text></Text>
                <Text style={styles.metaText}>Threshold Count: <Text style={styles.metaValue}>{selectedRule.threshold_count} occurrences</Text></Text>
                <Text style={styles.metaText}>Time Window: <Text style={styles.metaValue}>{selectedRule.time_window_seconds} seconds</Text></Text>
                <Text style={styles.metaText}>Author / Creator: <Text style={styles.metaValue}>{selectedRule.created_by || 'MedSIEM Security Team'}</Text></Text>
              </View>

              <Text style={styles.sectionHeader}>Rule Condition Criteria</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{selectedRule.conditions}</Text>
              </View>

              <Text style={styles.sectionHeader}>Description & Clinical Impact</Text>
              <Text style={styles.descText}>{selectedRule.description || 'Detects anomalous events matching healthcare threat conditions.'}</Text>

              <TouchableOpacity
                style={[styles.toggleActionBtn, { backgroundColor: selectedRule.enabled ? '#b91c1c' : '#059669', marginTop: 16 }]}
                onPress={() => handleToggleRule(selectedRule)}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.btnText}>
                    {selectedRule.enabled ? 'Disable Detection Rule' : 'Enable Detection Rule'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { marginTop: 10 }]}
                onPress={() => setSelectedRule(null)}
              >
                <Text style={styles.cancelBtnText}>Close Rule Details</Text>
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
  },
  timeText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 6,
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
  codeBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  codeText: {
    color: '#34d399',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  descText: {
    color: THEME.colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  toggleActionBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
  },
  cancelBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  }
});
