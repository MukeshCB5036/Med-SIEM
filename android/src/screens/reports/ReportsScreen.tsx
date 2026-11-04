import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, RefreshControl, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { ReportItem } from '../../types';
import { apiService } from '../../services/api';

interface ReportsScreenProps {
  reports: ReportItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onReportCreated: () => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  reports,
  refreshing,
  onRefresh,
  onReportCreated,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState('HIPAA Security Rule Audit');
  const [reportFormat, setReportFormat] = useState('CSV');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const reportTemplates = [
    'HIPAA Security Rule Audit',
    'Executive SOC Summary',
    'Incident Triage Report',
    'Asset & Agent Inventory',
  ];

  const handleGenerateReport = async () => {
    setActionLoading(true);
    const res = await apiService.post('/reports/generate', {
      report_type: reportType,
      format: reportFormat,
      notes: notes.trim() || undefined
    });
    setActionLoading(false);

    if (res.success) {
      Alert.alert('Report Generated', `Compliance report '${reportType}' created.`);
      setIsGenerating(false);
      setNotes('');
      onReportCreated();
    } else {
      Alert.alert('Generation Failed', res.error || 'Failed to generate report.');
    }
  };

  const handleExport = (report: ReportItem) => {
    Alert.alert(
      'Export Download Ready',
      `Report file '${report.title}.${report.format.toLowerCase()}' is queued for download via secure portal.`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Reports & Compliance ({reports.length})</Text>
          <Text style={styles.subtitle}>HIPAA, ISO 27001, and SOC executive exports</Text>
        </View>
        <TouchableOpacity style={styles.generateBtn} onPress={() => setIsGenerating(true)} activeOpacity={0.8}>
          <Text style={styles.generateBtnText}>+ New Report</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No compliance reports generated yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedReport(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Badge label={item.status} />
            </View>

            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={styles.cardSub}>Type: {item.report_type} • Format: {item.format}</Text>
              <Text style={styles.authorText}>{item.generated_by}</Text>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.timeText}>{new Date(item.generated_at).toLocaleString()}</Text>
              <Text style={styles.viewLink}>View Summary →</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Generate Report Modal */}
      {isGenerating && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setIsGenerating(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Generate Compliance Report</Text>
              <Text style={styles.modalSubtitle}>Query live database metrics for regulatory compliance documentation.</Text>

              <Text style={styles.inputLabel}>REPORT TEMPLATE</Text>
              {reportTemplates.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl}
                  style={[styles.templateOption, reportType === tmpl && styles.templateOptionActive]}
                  onPress={() => setReportType(tmpl)}
                >
                  <Text style={[styles.templateText, reportType === tmpl && styles.templateTextActive]}>
                    {tmpl}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>EXPORT FORMAT</Text>
              <View style={styles.formatRow}>
                {['CSV', 'PDF', 'JSON'].map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    style={[styles.formatBtn, reportFormat === fmt && styles.formatBtnActive]}
                    onPress={() => setReportFormat(fmt)}
                  >
                    <Text style={[styles.formatText, reportFormat === fmt && styles.formatTextActive]}>{fmt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>AUDIT NOTES / JUSTIFICATION</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="e.g. Q4 2026 HIPAA Compliance Certification and Internal Audit"
                placeholderTextColor={THEME.colors.textMuted}
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerateReport} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Generate Report</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsGenerating(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Report Detail & Summary Modal */}
      {selectedReport && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedReport(null)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedReport.title}</Text>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Badge label={selectedReport.status} size="md" />
                <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>{selectedReport.format} EXPORT</Text>
              </View>

              <View style={styles.metaCard}>
                <Text style={styles.metaHeader}>Audit Metadata</Text>
                <Text style={styles.metaText}>Report ID: <Text style={styles.metaValue}>{selectedReport.id}</Text></Text>
                <Text style={styles.metaText}>Generated By: <Text style={styles.metaValue}>{selectedReport.generated_by}</Text></Text>
                <Text style={styles.metaText}>Generated At: <Text style={styles.metaValue}>{new Date(selectedReport.generated_at).toLocaleString()}</Text></Text>
              </View>

              <Text style={styles.sectionHeader}>Compliance Metrics Summary</Text>
              <View style={styles.summaryBox}>
                {Object.entries(selectedReport.summary || {}).map(([key, val]) => (
                  <View key={key} style={styles.summaryItemRow}>
                    <Text style={styles.summaryKey}>{key.replace(/_/g, ' ').toUpperCase()}:</Text>
                    <Text style={styles.summaryVal}>{String(val)}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => handleExport(selectedReport)}>
                <Text style={styles.primaryBtnText}>📥 Export & Download Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedReport(null)}>
                <Text style={styles.cancelBtnText}>Close Report Inspector</Text>
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
  generateBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  generateBtnText: {
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
  },
  authorText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
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
  viewLink: {
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
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  templateOption: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 6,
  },
  templateOptionActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  templateText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  templateTextActive: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  formatBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formatBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  formatText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  formatTextActive: {
    color: '#fb7185',
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
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 8,
    marginBottom: 6,
  },
  summaryBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryKey: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryVal: {
    color: '#34d399',
    fontWeight: 'bold',
    fontSize: 11,
  }
});
