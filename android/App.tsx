import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, FlatList, RefreshControl, ScrollView, Modal, Alert, ActivityIndicator
} from 'react-native';
import { apiService, tokenStorage } from './src/services/api';

const App = () => {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<'LOGIN' | 'DASHBOARD' | 'ALERTS' | 'INCIDENTS' | 'EVENTS' | 'ASSETS' | 'PROFILE'>('LOGIN');

  // Auth State
  const [email, setEmail] = useState('admin@medsiem.org');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [otp, setOtp] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data & Loading States
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Item Detail Modals
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Helper: Handle HTTP 401 Unauthorized Session Expiration
  const handleApiResult = (res: any) => {
    if (!res.success && res.error && (res.error.includes('401') || res.error.toLowerCase().includes('unauthorized') || res.error.toLowerCase().includes('expired'))) {
      Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
      handleLogout();
      return false;
    }
    return true;
  };
  // ---------------------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------------------
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setInfo('');
    setAuthLoading(true);
    const res = await apiService.post('/auth/login', { email, password });
    setAuthLoading(false);

    if (res.success && res.data) {
      if (res.data.mfa_required && res.data.mfa_token) {
        setMfaToken(res.data.mfa_token);
        setInfo('MFA Required: Check email for your 6-digit passcode.');
      } else if (res.data.email_verification_required) {
        setEmailVerificationRequired(true);
        setError('Email unverified. Please check your inbox or resend verification link.');
      } else if (res.data.tokens || res.data.access_token) {
        const token = res.data.access_token || res.data.tokens?.access_token;
        tokenStorage.setToken(token);
        await fetchProfile();
        setCurrentScreen('DASHBOARD');
        loadAllData();
      }
    } else {
      setError(res.error || 'Invalid work email or password.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a 6-digit OTP code.');
      return;
    }
    setError('');
    setInfo('');
    setAuthLoading(true);
    const res = await apiService.post('/auth/verify-otp', { mfa_token: mfaToken, otp: otp.trim() });
    setAuthLoading(false);

    if (res.success && res.data) {
      tokenStorage.setToken(res.data.access_token);
      setMfaToken(null);
      setOtp('');
      await fetchProfile();
      setCurrentScreen('DASHBOARD');
      loadAllData();
    } else {
      setError(res.error || 'Invalid or expired MFA passcode.');
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setInfo('');
    setAuthLoading(true);
    const res = await apiService.post('/auth/resend-verification', { email });
    setAuthLoading(false);
    if (res.success) {
      setInfo('Verification link sent. Please check your email inbox.');
    } else {
      setError(res.error || 'Failed to resend verification email.');
    }
  };

  const fetchProfile = async () => {
    const res = await apiService.get('/auth/me');
    if (res.success && res.data) {
      setUserProfile(res.data);
    } else {
      handleApiResult(res);
    }
  };

  const handleLogout = () => {
    tokenStorage.setToken('');
    setUserProfile(null);
    setSelectedAlert(null);
    setSelectedIncident(null);
    setSelectedEvent(null);
    setSelectedAsset(null);
    setCurrentScreen('LOGIN');
  };

  // ---------------------------------------------------------------------------
  // DATA FETCHING WITH PULL-TO-REFRESH & LOADING STATES
  // ---------------------------------------------------------------------------
  const loadAllData = async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const [statsRes, alertsRes, incRes, evtRes, assetRes] = await Promise.all([
      apiService.get('/alerts/stats'),
      apiService.get('/alerts'),
      apiService.get('/incidents'),
      apiService.get('/events'),
      apiService.get('/assets')
    ]);

    setLoading(false);
    setRefreshing(false);

    if (statsRes.success) setDashboardStats(statsRes.data);
    if (alertsRes.success) setAlerts(alertsRes.data || []);
    if (incRes.success) setIncidents(incRes.data || []);
    if (evtRes.success) setEvents(evtRes.data || []);
    if (assetRes.success) setAssets(assetRes.data || []);

    handleApiResult(statsRes);
  };

  useEffect(() => {
    if (tokenStorage.getToken()) {
      fetchProfile();
      setCurrentScreen('DASHBOARD');
      loadAllData();
    }
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS (Alert Resolution, Incident Resolution, Comments)
  // ---------------------------------------------------------------------------
  const handleResolveAlert = async (id: string) => {
    setActionLoading(true);
    const res = await apiService.post(`/alerts/${id}/resolve`, { resolution_notes: 'Resolved via MedSIEM Mobile App' });
    setActionLoading(false);
    if (res.success) {
      Alert.alert('Alert Resolved', 'The security alert status has been updated to RESOLVED.');
      setSelectedAlert(null);
      loadAllData();
    } else {
      Alert.alert('Action Failed', res.error || 'Unable to resolve alert.');
    }
  };

  const handleResolveIncident = async (id: string) => {
    setActionLoading(true);
    const res = await apiService.post(`/incidents/${id}/resolve`, {});
    setActionLoading(false);
    if (res.success) {
      Alert.alert('Incident Closed', 'The security incident status has been updated to RESOLVED.');
      setSelectedIncident(null);
      loadAllData();
    } else {
      Alert.alert('Action Failed', res.error || 'Unable to resolve incident.');
    }
  };

  const handleAddComment = async (id: string) => {
    if (!newComment.trim()) {
      Alert.alert('Validation Error', 'Please enter a comment before posting.');
      return;
    }
    setActionLoading(true);
    const res = await apiService.post(`/incidents/${id}/comments`, { comment: newComment.trim() });
    setActionLoading(false);
    if (res.success) {
      setNewComment('');
      Alert.alert('Comment Posted', 'Investigation note appended to incident timeline.');
      // Refresh current selected incident details
      const updatedInc = await apiService.get(`/incidents/${id}`);
      if (updatedInc.success && updatedInc.data) {
        setSelectedIncident(updatedInc.data);
      }
      loadAllData();
    } else {
      Alert.alert('Posting Failed', res.error || 'Unable to post comment.');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER: LOGIN SCREEN
  // ---------------------------------------------------------------------------
  if (currentScreen === 'LOGIN') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        <View style={styles.authBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.title}>MedSIEM Mobile</Text>
          <Text style={styles.subtitle}>Healthcare SOC Operations Command</Text>

          {info ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}>
              <Text style={[styles.errorText, { color: '#34d399' }]}>{info}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {mfaToken ? (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-DIGIT EMAIL MFA PASSCODE</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', fontSize: 20, letterSpacing: 8, color: '#34d399' }]}
                  placeholder="123456"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity style={[styles.button, { backgroundColor: '#059669' }]} onPress={handleVerifyOtp} disabled={authLoading}>
                {authLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Verify & Enter Mobile SOC</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setMfaToken(null)}>
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>← Cancel MFA / Back to Password</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WORK EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. analyst@medsiem.org"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {emailVerificationRequired && (
                <TouchableOpacity style={[styles.button, { backgroundColor: '#334155', marginBottom: 8 }]} onPress={handleResendVerification}>
                  <Text style={styles.buttonText}>Resend Verification Link</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={authLoading}>
                {authLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign In to Mobile SOC</Text>}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerNotice}>Protected Healthcare Information System • HIPAA Compliant</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: MAIN SOC COMPANION APP WITH NAVIGATION BAR
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.miniLogo}><Text style={styles.miniLogoText}>M</Text></View>
          <View>
            <Text style={styles.headerTitle}>MedSIEM Mobile</Text>
            <Text style={styles.userText}>{userProfile?.full_name || 'SOC Operator'} ({userProfile?.is_superuser ? 'Super Admin' : 'Analyst'})</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Workspace Body */}
      <View style={{ flex: 1 }}>
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Synchronizing SOC Pipeline Data...</Text>
          </View>
        )}

        {/* 1. DASHBOARD SCREEN */}
        {currentScreen === 'DASHBOARD' && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} tintColor="#e11d48" colors={['#e11d48']} />}
            contentContainerStyle={styles.content}
          >
            <Text style={styles.sectionHeader}>Healthcare Security Metrics</Text>
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Active Alerts</Text>
                <Text style={styles.statValue}>{dashboardStats?.total_alerts || 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Critical Alerts</Text>
                <Text style={[styles.statValue, { color: '#f43f5e' }]}>{dashboardStats?.severity_breakdown?.CRITICAL || 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Active Incidents</Text>
                <Text style={[styles.statValue, { color: '#fbbf24' }]}>{incidents.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Monitored Assets</Text>
                <Text style={[styles.statValue, { color: '#34d399' }]}>{assets.length}</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Priority Threat Feed</Text>
            {alerts.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No active security alerts detected.</Text></View>
            ) : (
              alerts.slice(0, 4).map(a => (
                <TouchableOpacity key={a.id} style={styles.card} onPress={() => setSelectedAlert(a)}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>{a.title}</Text>
                    <Text style={[styles.badge, a.severity === 'CRITICAL' ? styles.critical : styles.high]}>{a.severity}</Text>
                  </View>
                  <Text style={styles.cardSub}>Status: {a.status} • IP: {a.source_ip || 'Internal'} • MITRE: {a.mitre_technique || 'N/A'}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* 2. ALERTS SCREEN */}
        {currentScreen === 'ALERTS' && (
          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} tintColor="#e11d48" colors={['#e11d48']} />}
            contentContainerStyle={styles.content}
            ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No active alerts found.</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedAlert(item)}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={[styles.badge, item.severity === 'CRITICAL' ? styles.critical : item.severity === 'HIGH' ? styles.high : styles.medium]}>
                    {item.severity}
                  </Text>
                </View>
                <Text style={styles.cardSub}>Status: <Text style={{ color: item.status === 'RESOLVED' ? '#34d399' : '#f43f5e' }}>{item.status}</Text></Text>
                <Text style={styles.cardSub}>MITRE ATT&CK: {item.mitre_technique || 'N/A'} • Created: {new Date(item.created_at).toLocaleTimeString()}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* 3. INCIDENTS SCREEN */}
        {currentScreen === 'INCIDENTS' && (
          <FlatList
            data={incidents}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} tintColor="#e11d48" colors={['#e11d48']} />}
            contentContainerStyle={styles.content}
            ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No active security incidents found.</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedIncident(item)}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={[styles.badge, styles.critical]}>{item.severity}</Text>
                </View>
                <Text style={styles.cardSub}>Status: <Text style={{ color: item.status === 'RESOLVED' ? '#34d399' : '#f43f5e' }}>{item.status}</Text> • Assigned: {item.assignee || 'Unassigned'}</Text>
                <Text style={styles.cardSub}>Linked Alerts: {item.alerts ? item.alerts.length : 0} • Comments: {item.comments ? item.comments.length : 0}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* 4. EVENTS SCREEN */}
        {currentScreen === 'EVENTS' && (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} tintColor="#e11d48" colors={['#e11d48']} />}
            contentContainerStyle={styles.content}
            ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No log events ingested yet.</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedEvent(item)}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{item.event_type}</Text>
                  <Text style={[styles.badge, item.severity === 'MEDIUM' ? styles.medium : styles.online]}>{item.severity}</Text>
                </View>
                <Text style={styles.cardSub}>Host: {item.hostname} • Category: {item.event_category}</Text>
                <Text style={styles.cardSub}>User: {item.username || 'SYSTEM'} • Source: {item.source}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* 5. ASSETS SCREEN */}
        {currentScreen === 'ASSETS' && (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} tintColor="#e11d48" colors={['#e11d48']} />}
            contentContainerStyle={styles.content}
            ListEmptyComponent={<View style={styles.emptyCard}><Text style={styles.emptyText}>No registered assets found.</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => setSelectedAsset(item)}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{item.hostname}</Text>
                  <Text style={[styles.badge, item.status === 'Online' ? styles.online : styles.offline]}>{item.status}</Text>
                </View>
                <Text style={styles.cardSub}>IP: {item.ip_address} • Criticality: {item.criticality}</Text>
                <Text style={styles.cardSub}>Type: {item.asset_type || 'Server'} • Org ID: {item.org_id ? item.org_id.substring(0, 8) + '...' : 'N/A'}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* 6. USER PROFILE SCREEN */}
        {currentScreen === 'PROFILE' && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Operator Account Profile</Text>
              <Text style={styles.profileName}>{userProfile?.full_name || 'SOC Operator'}</Text>
              <Text style={styles.cardSub}>Work Email: {userProfile?.email}</Text>
              <Text style={styles.cardSub}>System Role: {userProfile?.is_superuser ? 'Super Admin' : 'SOC Analyst'}</Text>
              <Text style={styles.cardSub}>Organization ID: {userProfile?.org_id}</Text>
              <Text style={styles.cardSub}>Account Status: {userProfile?.is_active ? 'ACTIVE' : 'DISABLED'}</Text>
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: '#334155', marginTop: 16 }]} onPress={handleLogout}>
              <Text style={styles.buttonText}>Sign Out Mobile Account</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL: ALERT DETAIL & RESOLUTION WORKFLOW */}
      {/* ----------------------------------------------------------------------- */}
      {selectedAlert && (
        <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => setSelectedAlert(null)}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
              <View style={styles.row}>
                <Text style={[styles.badge, selectedAlert.severity === 'CRITICAL' ? styles.critical : styles.high]}>
                  {selectedAlert.severity}
                </Text>
                <Text style={styles.cardSub}>Status: {selectedAlert.status}</Text>
              </View>
              <Text style={[styles.cardSub, { marginTop: 8 }]}>MITRE Technique: {selectedAlert.mitre_technique || 'N/A'}</Text>
              <Text style={styles.cardSub}>Source IP: {selectedAlert.source_ip || '127.0.0.1'}</Text>
              
              <Text style={styles.sectionHeader}>Description & Intelligence</Text>
              <Text style={styles.bodyText}>{selectedAlert.description || 'No detailed description available.'}</Text>

              {selectedAlert.status !== 'RESOLVED' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleResolveAlert(selectedAlert.id)} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Resolve Security Alert</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#334155' }]} onPress={() => setSelectedAlert(null)}>
                <Text style={styles.buttonText}>Close Detail View</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL: INCIDENT DETAIL, COMMENTS & RESOLUTION WORKFLOW */}
      {/* ----------------------------------------------------------------------- */}
      {selectedIncident && (
        <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => setSelectedIncident(null)}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.modalTitle}>{selectedIncident.title}</Text>
              <View style={styles.row}>
                <Text style={[styles.badge, styles.critical]}>{selectedIncident.severity}</Text>
                <Text style={styles.cardSub}>Status: {selectedIncident.status}</Text>
              </View>
              <Text style={styles.bodyText}>{selectedIncident.description || 'No incident description provided.'}</Text>

              <Text style={styles.sectionHeader}>Investigation Notes ({selectedIncident.comments ? selectedIncident.comments.length : 0})</Text>
              {selectedIncident.comments && selectedIncident.comments.map((c: any, index: number) => (
                <View key={index} style={styles.commentBox}>
                  <Text style={styles.commentAuthor}>{c.author || 'Analyst'}:</Text>
                  <Text style={styles.commentText}>{c.comment || c.content}</Text>
                </View>
              ))}

              <TextInput
                style={styles.input}
                placeholder="Append investigation note..."
                placeholderTextColor="#64748b"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => handleAddComment(selectedIncident.id)} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Post Analyst Comment</Text>}
              </TouchableOpacity>

              {selectedIncident.status !== 'RESOLVED' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleResolveIncident(selectedIncident.id)} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Close / Resolve Incident</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#334155' }]} onPress={() => setSelectedIncident(null)}>
                <Text style={styles.buttonText}>Close Detail View</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL: EVENT DETAIL VIEW */}
      {/* ----------------------------------------------------------------------- */}
      {selectedEvent && (
        <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => setSelectedEvent(null)}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.modalTitle}>{selectedEvent.event_type}</Text>
              <Text style={styles.cardSub}>Hostname: {selectedEvent.hostname} • Category: {selectedEvent.event_category}</Text>
              <Text style={styles.cardSub}>User: {selectedEvent.username || 'SYSTEM'} • Severity: {selectedEvent.severity}</Text>

              <Text style={styles.sectionHeader}>Raw Event Payload</Text>
              <View style={styles.jsonBox}>
                <Text style={styles.jsonText}>{selectedEvent.message || JSON.stringify(selectedEvent.normalized_json || selectedEvent, null, 2)}</Text>
              </View>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#334155' }]} onPress={() => setSelectedEvent(null)}>
                <Text style={styles.buttonText}>Close Payload View</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* MODAL: ASSET DETAIL VIEW */}
      {/* ----------------------------------------------------------------------- */}
      {selectedAsset && (
        <Modal animationType="slide" transparent={false} visible={true} onRequestClose={() => setSelectedAsset(null)}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.modalTitle}>{selectedAsset.hostname}</Text>
              <Text style={styles.cardSub}>IP Address: {selectedAsset.ip_address}</Text>
              <Text style={styles.cardSub}>Status: {selectedAsset.status} • Criticality: {selectedAsset.criticality}</Text>
              <Text style={styles.cardSub}>Asset Type: {selectedAsset.asset_type || 'Server'}</Text>
              <Text style={styles.cardSub}>OS: {selectedAsset.os_type || 'Windows Server / Linux'}</Text>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#334155' }]} onPress={() => setSelectedAsset(null)}>
                <Text style={styles.buttonText}>Close Asset View</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* BOTTOM NAVIGATION BAR */}
      {/* ----------------------------------------------------------------------- */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('DASHBOARD')}>
          <Text style={[styles.navText, currentScreen === 'DASHBOARD' && styles.navActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('ALERTS')}>
          <Text style={[styles.navText, currentScreen === 'ALERTS' && styles.navActive]}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('INCIDENTS')}>
          <Text style={[styles.navText, currentScreen === 'INCIDENTS' && styles.navActive]}>Incidents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('EVENTS')}>
          <Text style={[styles.navText, currentScreen === 'EVENTS' && styles.navActive]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('ASSETS')}>
          <Text style={[styles.navText, currentScreen === 'ASSETS' && styles.navActive]}>Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('PROFILE')}>
          <Text style={[styles.navText, currentScreen === 'PROFILE' && styles.navActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  modalContainer: { flex: 1, backgroundColor: '#020617' },
  authBox: { padding: 24, flex: 1, justifyContent: 'center' },
  logoBadge: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  logoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 26 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#f43f5e', textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  footerNotice: { fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 24 },
  errorBanner: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.4)', borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#f43f5e', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1, borderRadius: 8, padding: 12, color: '#f8fafc', fontSize: 14 },
  button: { backgroundColor: '#e11d48', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  actionBtn: { backgroundColor: '#059669', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniLogo: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center' },
  miniLogoText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  userText: { color: '#f43f5e', fontSize: 11, fontWeight: '500' },
  logoutBtn: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  logoutBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '600' },
  content: { padding: 16 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginVertical: 12, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#0f172a', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  statLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', fontWeight: '600' },
  statValue: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#0f172a', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', marginBottom: 10 },
  emptyCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14, flex: 1 },
  cardSub: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  profileName: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  bodyText: { color: '#cbd5e1', fontSize: 13, marginVertical: 12, lineHeight: 20 },
  commentBox: { backgroundColor: '#1e293b', padding: 10, borderRadius: 6, marginBottom: 8 },
  commentAuthor: { color: '#f43f5e', fontSize: 11, fontWeight: 'bold' },
  commentText: { color: '#f8fafc', fontSize: 12, marginTop: 2 },
  jsonBox: { backgroundColor: '#020617', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#1e293b', marginVertical: 10 },
  jsonText: { color: '#34d399', fontFamily: 'monospace', fontSize: 11 },
  badge: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden' },
  critical: { backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#fb7185' },
  high: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' },
  medium: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' },
  online: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' },
  offline: { backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#fb7185' },
  navbar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', paddingVertical: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
  navActive: { color: '#f43f5e' }
});

export default App;
