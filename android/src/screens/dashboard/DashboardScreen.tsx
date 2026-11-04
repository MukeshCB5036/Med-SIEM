import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet
} from 'react-native';
import { THEME } from '../../store/theme';
import { Badge } from '../../components/common/Badge';
import { DashboardStats, AlertItem, IncidentItem, AssetItem } from '../../types';
import { ScreenKey } from '../../components/common/DrawerMenu';

interface DashboardScreenProps {
  stats: DashboardStats | null;
  alerts: AlertItem[];
  incidents: IncidentItem[];
  assets: AssetItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onSelectAlert: (alert: AlertItem) => void;
  onNavigate: (screen: ScreenKey) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  stats,
  alerts,
  incidents,
  assets,
  refreshing,
  onRefresh,
  onSelectAlert,
  onNavigate,
}) => {
  const activeAlerts = stats?.total_active_alerts ?? 0;
  const criticalAlerts = stats?.critical_alerts ?? 0;
  const activeIncidents = stats?.active_incidents ?? incidents.length;
  const monitoredAssets = stats?.monitored_assets ?? assets.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} colors={[THEME.colors.primary]} />}
    >
      {/* Overview Header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHeader}>Healthcare Security Metrics</Text>
        <Text style={styles.badgeSource}>Unified Backend Truth</Text>
      </View>

      {/* 4 Core Metric Cards */}
      <View style={styles.grid}>
        <TouchableOpacity style={styles.statCard} onPress={() => onNavigate('ALERTS')} activeOpacity={0.8}>
          <Text style={styles.statLabel}>Total Active Alerts</Text>
          <Text style={styles.statValue}>{activeAlerts}</Text>
          <Text style={styles.statSub}>Correlated Threats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => onNavigate('ALERTS')} activeOpacity={0.8}>
          <Text style={styles.statLabel}>Critical Alerts</Text>
          <Text style={[styles.statValue, { color: THEME.colors.critical }]}>{criticalAlerts}</Text>
          <Text style={styles.statSub}>Immediate Action</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => onNavigate('INCIDENTS')} activeOpacity={0.8}>
          <Text style={styles.statLabel}>Active Incidents</Text>
          <Text style={[styles.statValue, { color: THEME.colors.high }]}>{activeIncidents}</Text>
          <Text style={styles.statSub}>Open Investigations</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => onNavigate('ASSETS')} activeOpacity={0.8}>
          <Text style={styles.statLabel}>Monitored Assets</Text>
          <Text style={[styles.statValue, { color: THEME.colors.online }]}>{monitoredAssets}</Text>
          <Text style={styles.statSub}>Endpoints & Servers</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Action Bar */}
      <View style={styles.quickActionsBar}>
        <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('ALERTS')}>
          <Text style={styles.actionPillText}>🚨 Triage Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('EVENTS')}>
          <Text style={styles.actionPillText}>📜 Log Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('REPORTS')}>
          <Text style={styles.actionPillText}>📋 Run HIPAA Audit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={() => onNavigate('RULES')}>
          <Text style={styles.actionPillText}>⚡ Rules Engine</Text>
        </TouchableOpacity>
      </View>

      {/* Severity Breakdown Section */}
      {stats?.severity_breakdown && (
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionHeader}>Alert Severity Distribution</Text>
          <View style={styles.severityRow}>
            {Object.entries(stats.severity_breakdown).map(([sev, count]) => (
              <View key={sev} style={styles.sevItem}>
                <Badge label={sev} />
                <Text style={styles.sevCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Priority Threat Feed (Deduplicated Stream) */}
      <View style={[styles.sectionRow, { marginTop: 16 }]}>
        <Text style={styles.sectionHeader}>Priority Threat Feed</Text>
        <Text style={styles.badgeSource}>Deduplicated Stream</Text>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active security alerts detected in the correlation window.</Text>
        </View>
      ) : (
        alerts.slice(0, 5).map((a) => (
          <TouchableOpacity key={a.id} style={styles.threatCard} onPress={() => onSelectAlert(a)} activeOpacity={0.8}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.threatTitle} numberOfLines={1}>{a.title}</Text>
              <View style={styles.badgeRow}>
                {a.occurrence_count > 1 && (
                  <View style={styles.occurrenceBadge}>
                    <Text style={styles.occurrenceText}>x{a.occurrence_count}</Text>
                  </View>
                )}
                <Badge label={a.severity} />
              </View>
            </View>

            <Text style={styles.threatSub}>
              Status: <Text style={{ color: a.status === 'RESOLVED' ? THEME.colors.online : THEME.colors.critical, fontWeight: 'bold' }}>{a.status}</Text>
              {' • '}IP: {a.source_ip || 'Internal'}
              {' • '}MITRE: {a.mitre_technique || 'N/A'}
            </Text>

            <View style={styles.cardFooterRow}>
              <Text style={styles.timeText}>
                First: {new Date(a.first_seen || a.created_at).toLocaleTimeString()}
              </Text>
              <Text style={styles.timeText}>
                Last: {new Date(a.last_seen || a.created_at).toLocaleTimeString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Active Incidents Overview */}
      <View style={[styles.sectionRow, { marginTop: 16 }]}>
        <Text style={styles.sectionHeader}>Active Security Incidents ({incidents.length})</Text>
        <TouchableOpacity onPress={() => onNavigate('INCIDENTS')}>
          <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: 'bold' }}>View All →</Text>
        </TouchableOpacity>
      </View>

      {incidents.slice(0, 3).map((inc) => (
        <TouchableOpacity key={inc.id} style={styles.threatCard} onPress={() => onNavigate('INCIDENTS')} activeOpacity={0.8}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.threatTitle} numberOfLines={1}>{inc.title}</Text>
            <Badge label={inc.severity} />
          </View>
          <Text style={styles.threatSub}>
            Status: <Text style={{ color: THEME.colors.high, fontWeight: 'bold' }}>{inc.status}</Text>
            {' • '}Assignee: {inc.assignee || 'Unassigned'}
            {' • '}Notes: {inc.comments ? inc.comments.length : 0}
          </Text>
        </TouchableOpacity>
      ))}
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeSource: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  statLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    color: THEME.colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statSub: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  quickActionsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  actionPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  actionPillText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: 'bold',
  },
  breakdownCard: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sevItem: {
    alignItems: 'center',
    gap: 4,
  },
  sevCount: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  threatCard: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threatTitle: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
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
  threatSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  cardFooterRow: {
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
  }
});
