export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'FALSE_POSITIVE';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';

export type AssetStatus = 'Online' | 'Offline' | 'Decommissioned' | 'Maintenance';

export type AgentStatus = 'Online' | 'Offline' | 'Unregistered' | 'Revoked';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  is_locked: boolean;
  mfa_enabled: boolean;
  email_verified: boolean;
  org_id: string;
  roles: Array<{ id: string; name: string; permissions?: Array<{ name: string }> }>;
  permissions?: string[];
  last_login_at?: string;
  created_at: string;
}

export interface DashboardStats {
  total_active_alerts: number;
  critical_alerts: number;
  active_incidents: number;
  monitored_assets: number;
  total_alerts: number;
  severity_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  status: AlertStatus;
  rule_id?: string;
  asset_id?: string;
  event_id?: string;
  source_ip?: string;
  destination_ip?: string;
  mitre_technique?: string;
  correlation_key?: string;
  occurrence_count: number;
  first_seen?: string;
  last_seen?: string;
  assigned_to_id?: string;
  resolution_notes?: string;
  is_false_positive: boolean;
  supporting_events?: any[];
  created_at: string;
  updated_at: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  user_id?: string;
  author?: string;
  comment: string;
  created_at: string;
}

export interface IncidentItem {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  status: IncidentStatus;
  org_id: string;
  assigned_to_id?: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  alerts: AlertItem[];
  comments: IncidentComment[];
}

export interface NormalizedEvent {
  id: string;
  raw_log_id?: string;
  asset_id?: string;
  agent_id?: string;
  org_id: string;
  timestamp: string;
  hostname: string;
  username?: string;
  event_type: string;
  event_category: string;
  severity: Severity;
  source: string;
  source_ip?: string;
  destination_ip?: string;
  process_name?: string;
  message?: string;
  normalized_json: Record<string, any>;
  created_at: string;
}

export interface AssetItem {
  id: string;
  hostname: string;
  ip_address: string;
  mac_address?: string;
  asset_type?: string;
  os_type?: string;
  status: AssetStatus;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owner?: string;
  department?: string;
  location?: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgentItem {
  id: string;
  asset_id: string;
  agent_version: string;
  os_name: string;
  os_version: string;
  status: AgentStatus;
  last_heartbeat: string;
  created_at: string;
}

export interface EnrollmentTokenItem {
  id: string;
  name: string;
  token?: string;
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
}

export interface DetectionRuleItem {
  id: string;
  name: string;
  description?: string;
  severity: Severity;
  rule_type: string;
  event_category: string;
  conditions: string;
  time_window_seconds: number;
  threshold_count: number;
  mitre_technique?: string;
  enabled: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ThreatIndicatorItem {
  id: string;
  indicator: string;
  type: string;
  reputation: string;
  confidence: string;
  source: string;
  mitre_technique: string;
  matched_events_count: number;
  first_seen: string;
  last_seen: string;
  description: string;
}

export interface ReportItem {
  id: string;
  title: string;
  report_type: string;
  format: string;
  status: string;
  generated_by: string;
  generated_at: string;
  summary: Record<string, any>;
  download_url?: string;
}

export interface UserItem {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  is_locked: boolean;
  last_login_at?: string;
  roles: Array<{ id: string; name: string }>;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  user_id?: string;
  user_email?: string;
  user_full_name?: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  created_at: string;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Array<{ id: string; name: string; description?: string }>;
}
