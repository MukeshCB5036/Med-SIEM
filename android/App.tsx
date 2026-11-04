import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, StyleSheet, StatusBar, ActivityIndicator, Text, BackHandler, Platform
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { THEME } from './src/store/theme';
import { useAuthStore } from './src/store/authStore';
import { apiService, tokenStorage } from './src/services/api';
import { ScreenKey, DrawerMenu } from './src/components/common/DrawerMenu';
import { Header } from './src/components/common/Header';
import { BottomTabBar } from './src/components/common/BottomTabBar';

// Screens
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { AlertsScreen } from './src/screens/alerts/AlertsScreen';
import { IncidentsScreen } from './src/screens/incidents/IncidentsScreen';
import { EventsScreen } from './src/screens/events/EventsScreen';
import { AssetsScreen } from './src/screens/assets/AssetsScreen';
import { DetectionRulesScreen } from './src/screens/rules/DetectionRulesScreen';
import { ThreatIntelScreen } from './src/screens/threatIntel/ThreatIntelScreen';
import { ReportsScreen } from './src/screens/reports/ReportsScreen';
import { AdministrationScreen } from './src/screens/admin/AdministrationScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';

// Types
import {
  DashboardStats, AlertItem, IncidentItem, NormalizedEvent,
  AssetItem, AgentItem, EnrollmentTokenItem, DetectionRuleItem,
  ThreatIndicatorItem, ReportItem, UserItem, RoleItem, AuditLogItem
} from './src/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const MedSIEMMobileApp = () => {
  const { isAuthenticated, setAuth, logout, user } = useAuthStore();

  // Navigation & Drawer State
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('DASHBOARD');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Global Pipeline Data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [tokens, setTokens] = useState<EnrollmentTokenItem[]>([]);
  const [rules, setRules] = useState<DetectionRuleItem[]>([]);
  const [threatIndicators, setThreatIndicators] = useState<ThreatIndicatorItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Loading States
  const [initializing, setInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertsDeduplicate, setAlertsDeduplicate] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  // Master Data Loader
  const loadAllData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);

    try {
      const [
        statsRes, alertsRes, incRes, evtRes, assetRes,
        agentRes, tokRes, rulesRes, threatRes, repRes,
        usersRes, rolesRes, auditRes
      ] = await Promise.all([
        apiService.get('/alerts/stats'),
        apiService.get(`/alerts?deduplicate=${alertsDeduplicate}`),
        apiService.get('/incidents'),
        apiService.get('/events?limit=50'),
        apiService.get('/assets'),
        apiService.get('/agents'),
        apiService.get('/agents/enrollment-tokens'),
        apiService.get('/rules'),
        apiService.get('/threat-intelligence'),
        apiService.get('/reports'),
        apiService.get('/users'),
        apiService.get('/roles'),
        apiService.get('/audit-logs?page=1&page_size=50')
      ]);

      if (statsRes.success && statsRes.data) setDashboardStats(statsRes.data);
      if (alertsRes.success && alertsRes.data) setAlerts(alertsRes.data);
      if (incRes.success && incRes.data) setIncidents(incRes.data);
      if (evtRes.success && evtRes.data) setEvents(evtRes.data);
      if (assetRes.success && assetRes.data) setAssets(assetRes.data);
      if (agentRes.success && agentRes.data) setAgents(agentRes.data);
      if (tokRes.success && tokRes.data) setTokens(tokRes.data);
      if (rulesRes.success && rulesRes.data) setRules(rulesRes.data);
      if (threatRes.success && threatRes.data) setThreatIndicators(threatRes.data);
      if (repRes.success && repRes.data) setReports(repRes.data);
      if (usersRes.success && usersRes.data) setUsers(usersRes.data);
      if (rolesRes.success && rolesRes.data) setRoles(rolesRes.data);
      if (auditRes.success && auditRes.data) {
        setAuditLogs(auditRes.data.items || auditRes.data);
      }
    } catch (e) {
      console.log('Error synchronizing SOC pipeline data:', e);
    } finally {
      setRefreshing(false);
    }
  }, [alertsDeduplicate]);

  // Check initial authentication
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = tokenStorage.getToken();
      if (storedToken) {
        const meRes = await apiService.get('/auth/me');
        if (meRes.success && meRes.data) {
          setAuth(storedToken, meRes.data);
          loadAllData();
        } else {
          logout();
        }
      }
      setInitializing(false);
    };
    initAuth();
  }, [loadAllData, logout, setAuth]);

  // Reload data whenever user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // Hardware Back Button Behavior
  useEffect(() => {
    const onBackPress = () => {
      if (drawerVisible) {
        setDrawerVisible(false);
        return true;
      }
      if (selectedAlert) {
        setSelectedAlert(null);
        return true;
      }
      if (activeScreen !== 'DASHBOARD') {
        setActiveScreen('DASHBOARD');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [drawerVisible, selectedAlert, activeScreen]);

  // Event Filter Handler
  const handleEventFilter = async (search: string, severity: string) => {
    let url = '/events?limit=50';
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    if (severity && severity !== 'ALL') url += `&severity=${severity}`;

    const res = await apiService.get(url);
    if (res.success && res.data) {
      setEvents(res.data);
    }
  };

  // Toggle Alert Deduplication
  const handleToggleDeduplicate = () => {
    const nextVal = !alertsDeduplicate;
    setAlertsDeduplicate(nextVal);
    apiService.get(`/alerts?deduplicate=${nextVal}`).then(res => {
      if (res.success && res.data) setAlerts(res.data);
    });
  };

  if (initializing) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={{ color: THEME.colors.textMuted, marginTop: 12, fontSize: 12 }}>
          Initializing MedSIEM Security Context...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.surface} />

      {/* Top SOC App Bar */}
      <Header
        activeScreenTitle={activeScreen}
        onOpenDrawer={() => setDrawerVisible(true)}
      />

      {/* Main Module View Body */}
      <View style={styles.body}>
        {activeScreen === 'DASHBOARD' && (
          <DashboardScreen
            stats={dashboardStats}
            alerts={alerts}
            incidents={incidents}
            assets={assets}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onSelectAlert={(al) => {
              setSelectedAlert(al);
              setActiveScreen('ALERTS');
            }}
            onNavigate={(screen) => setActiveScreen(screen)}
          />
        )}

        {activeScreen === 'ALERTS' && (
          <AlertsScreen
            alerts={alerts}
            users={users}
            deduplicate={alertsDeduplicate}
            onToggleDeduplicate={handleToggleDeduplicate}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
            onAlertUpdated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'INCIDENTS' && (
          <IncidentsScreen
            incidents={incidents}
            users={users}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onIncidentUpdated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'EVENTS' && (
          <EventsScreen
            events={events}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onFilterChange={handleEventFilter}
          />
        )}

        {activeScreen === 'ASSETS' && (
          <AssetsScreen
            assets={assets}
            agents={agents}
            tokens={tokens}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onAssetUpdated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'RULES' && (
          <DetectionRulesScreen
            rules={rules}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onRuleUpdated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'THREAT_INTEL' && (
          <ThreatIntelScreen
            indicators={threatIndicators}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
          />
        )}

        {activeScreen === 'REPORTS' && (
          <ReportsScreen
            reports={reports}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onReportCreated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'ADMIN' && (
          <AdministrationScreen
            users={users}
            roles={roles}
            auditLogs={auditLogs}
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            onUserUpdated={() => loadAllData(false)}
          />
        )}

        {activeScreen === 'SETTINGS' && (
          <SettingsScreen />
        )}
      </View>

      {/* Slide-out Navigation Drawer for Secondary Modules */}
      <DrawerMenu
        visible={drawerVisible}
        activeScreen={activeScreen}
        onSelectScreen={(screen) => setActiveScreen(screen)}
        onClose={() => setDrawerVisible(false)}
      />

      {/* Bottom Navigation Bar for Core Tabs */}
      <BottomTabBar
        activeScreen={activeScreen}
        onSelectScreen={(screen) => setActiveScreen(screen)}
        activeAlertsCount={dashboardStats?.total_active_alerts ?? 0}
        activeIncidentsCount={dashboardStats?.active_incidents ?? incidents.length}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MedSIEMMobileApp />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  }
});
