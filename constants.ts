


import { Tab, AttendanceStatus, ScorecardMetric, KpiTargetLevel, BackupReminderFrequency } from './types';

export const APP_NAME = "KPI Dashboard Pro";
export const SYSTEM_VERSION = "1.1.7";

export const TABS: { id: Tab; name: string; icon: string }[] = [
  { id: Tab.ServiceDesk, name: 'Service Desk', icon: 'fas fa-ticket-alt' },
  { id: Tab.Meetings, name: 'Meetings', icon: 'fas fa-calendar-alt' },
  { id: Tab.Leaves, name: 'Leave Tracker', icon: 'fas fa-person-walking-luggage' },
  { id: Tab.PerformanceScorecard, name: 'Perf. Scorecard', icon: 'fas fa-clipboard-check' },
  { id: Tab.Employees, name: 'Employees', icon: 'fas fa-users' },
  { id: Tab.Settings, name: 'Settings & Data', icon: 'fas fa-cog' },
];

export const DEFAULT_PRIMARY_COLOR = '#3b82f6';
export const DEFAULT_BACKGROUND_COLOR = '#111827';
export const DEFAULT_FOOTER_CREDIT_TEXT = "DECStudioAiCreation";
export const DEFAULT_BACKUP_REMINDER_ENABLED = true;
export const DEFAULT_BACKUP_REMINDER_FREQUENCY: BackupReminderFrequency = 'weekly';
export const BACKUP_REMINDER_FREQUENCIES: { value: BackupReminderFrequency; label: string }[] = [
  { value: '5-minutes', label: 'Every 5 Minutes' },
  { value: '30-minutes', label: 'Every 30 Minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: '6-hourly', label: 'Every 6 Hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];


export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['On Time', 'Late', 'Excused Absent', 'Unexcused Absent', 'Not Applicable'];

export const LEAVE_TYPES: { [key: string]: { name: string, countsTowardsAllowance: boolean } } = {
  'Bereavement': { name: 'Bereavement', countsTowardsAllowance: false },
  'Birthday Day': { name: 'Birthday Day', countsTowardsAllowance: false },
  'Emergency': { name: 'Emergency', countsTowardsAllowance: false },
  'Leave W/O Pay': { name: 'Leave W/O Pay', countsTowardsAllowance: false },
  'Official Business': { name: 'Official Business', countsTowardsAllowance: false },
  'Offset': { name: 'Offset', countsTowardsAllowance: false },
  'Paternity': { name: 'Paternity', countsTowardsAllowance: false },
  'Sick Leave Charge to VL': { name: 'Sick Leave Charge to VL', countsTowardsAllowance: true },
  'Undertime': { name: 'Undertime', countsTowardsAllowance: false },
  'Vacation Leave': { name: 'Vacation Leave', countsTowardsAllowance: true }
};

export const CHART_TYPE_OPTIONS: {value: 'bar' | 'line' | 'pie' | 'doughnut', label: string}[] = [
    {value: 'bar', label: 'Bar'},
    {value: 'line', label: 'Line'},
    {value: 'pie', label: 'Pie'},
    {value: 'doughnut', label: 'Doughnut'},
];

// Performance Scorecard Constants
export const DEFAULT_SCORECARD_KPI_CONFIG: ScorecardMetric[] = [
    { 
        id: 'perf_metrics', 
        title: 'Performance Metrics', 
        weight: 70, 
        kpis: [
            { id: crypto.randomUUID(), name: 'Ticket Resolution Time (Hours)', weight: 60, actual: 0, scoringDirection: 'lower-is-better', targets: {poor: 8, needsImprovement: 6, meets: 4, exceeds: 2, exceptional: 1}},
            { id: crypto.randomUUID(), name: 'Task Completion Rate (%)', weight: 40, actual: 0, scoringDirection: 'higher-is-better', targets: {poor: 70, needsImprovement: 80, meets: 90, exceeds: 95, exceptional: 98}}
        ] 
    },
    { 
        id: 'behav_metrics', 
        title: 'Behavioral Metrics', 
        weight: 20, 
        kpis: [
            { id: crypto.randomUUID(), name: 'Team Collaboration (1-5)', weight: 50, actual: 0, scoringDirection: 'higher-is-better', targets: {poor: 1, needsImprovement: 2, meets: 3, exceeds: 4, exceptional: 5}},
            { id: crypto.randomUUID(), name: 'Adherence to Deadlines (1-5)', weight: 50, actual: 0, scoringDirection: 'higher-is-better', targets: {poor: 1, needsImprovement: 2, meets: 3, exceeds: 4, exceptional: 5}}
        ] 
    },
    { 
        id: 'proj_metrics', 
        title: 'Project Metrics', 
        weight: 10, 
        kpis: [
            { id: crypto.randomUUID(), name: 'Project Milestone Attainment (%)', weight: 100, actual: 0, scoringDirection: 'higher-is-better', targets: {poor: 75, needsImprovement: 85, meets: 90, exceeds: 95, exceptional: 100}}
        ] 
    }
];

export const SCORECARD_TARGET_LEVELS: KpiTargetLevel[] = ['poor', 'needsImprovement', 'meets', 'exceeds', 'exceptional'];
export const SCORECARD_APPRAISAL_TYPES = ['QUARTERLY', 'SEMESTRAL', 'ANNUALLY', 'PROJECT-BASED', 'PROBATIONARY'];

export const SCORE_INTERPRETATIONS: {minScore: number, text: string, colorClass: string, badgeBgClass: string, badgeTextClass: string}[] = [
    { minScore: 4.80, text: 'Exceptional', colorClass: 'text-green-400', badgeBgClass: 'bg-green-600', badgeTextClass: 'text-green-100'},
    { minScore: 3.80, text: 'Exceeds Expectation', colorClass: 'text-sky-400', badgeBgClass: 'bg-sky-600', badgeTextClass: 'text-sky-100' },
    { minScore: 2.80, text: 'Meets Expectation', colorClass: 'text-blue-400', badgeBgClass: 'bg-blue-600', badgeTextClass: 'text-blue-100' },
    { minScore: 2.00, text: 'Needs Improvement', colorClass: 'text-yellow-400', badgeBgClass: 'bg-yellow-600', badgeTextClass: 'text-yellow-100' },
    { minScore: 0, text: 'Poor', colorClass: 'text-red-400', badgeBgClass: 'bg-red-600', badgeTextClass: 'text-red-100' },
];

export const LOCAL_STORAGE_KEYS_PERF_SCORECARD = {
    // employees: 'perf_score_employees', // Removed, employee data is unified
    scoreHistory: 'perf_score_history',
    branding: 'perf_score_branding',
    kpiConfig: 'perf_score_kpi_config_snapshot'
};