


export type BackupReminderFrequency = '5-minutes' | '30-minutes' | 'hourly' | '6-hourly' | 'daily' | 'weekly' | 'monthly';

export interface Employee {
  id: string;
  name: string;
  isTechnician: boolean;
  leaveAllowance: number; // in hours
  leaveCoverageStart?: string; // YYYY-MM-DD
  leaveCoverageEnd?: string; // YYYY-MM-DD
  // Performance Scorecard Fields (Optional)
  idNumber?: string;
  positionTitle?: string;
  positionClassification?: string;
  department?: string; // Essential for scorecard use
  section?: string;
  latestScore?: number | null;
}

export interface AttendanceRecord {
  employeeId: string;
  status: AttendanceStatus;
  minutesLate?: number;
  remark?: string;
}

export interface Meeting {
  id: string;
  topic: string;
  date: string; // ISO datetime string (YYYY-MM-DDTHH:mm)
  attendance: AttendanceRecord[];
  frequency?: MeetingFrequency;
  recurrenceEndDate?: string; // YYYY-MM-DD
  weeklyDays?: number[]; // 0 for Sun, 1 for Mon, ...
  monthlyRepeatType?: 'day' | 'weekday';
  monthlyDay?: number;
  monthlyWeekNumber?: number; // 1-4 for first-fourth, 5 for last
  monthlyWeekday?: number; // 0-6 for Sun-Sat
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: string; // From LEAVE_TYPES keys
  reason: string;
  totalHours?: number; // Calculated field for display
  employeeName?: string; // For display
}

export interface TicketLog {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  technicianId: string;
  accomplished: number;
  pending: number;
  violated: number;
  technicianName?: string; // For display
}

export enum Tab {
  ServiceDesk = 'serviceDesk',
  Meetings = 'meetings',
  Leaves = 'leaves',
  Employees = 'employees',
  PerformanceScorecard = 'performanceScorecard',
  Settings = 'settings',
}

export type AttendanceStatus = 'On Time' | 'Late' | 'Excused Absent' | 'Unexcused Absent' | 'Not Applicable' | '';

export type MeetingFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export type ChartDisplayType = 'bar' | 'line' | 'pie' | 'doughnut';

export interface AppSettings {
  appTitle?: string; // Added application title
  primaryColor?: string;
  backgroundColor?: string;
  companyLogo?: string; // base64 string
  hiddenTabs?: Tab[];
  chartLayout?: 'compact' | 'full-width';
  chartTypes?: {
    sdTicketVolume?: ChartDisplayType;
    sdTicketStatus?: ChartDisplayType;
    mtgOverallAttendance?: ChartDisplayType;
    mtgMonthlyTrend?: ChartDisplayType;
    mtgIndividualEmp?: ChartDisplayType;
    lvEmpTrend?: ChartDisplayType;
    lvMonthlyAll?: ChartDisplayType;
    [key: string]: ChartDisplayType | undefined; // For general access
  };
  backupReminderEnabled?: boolean;
  backupReminderFrequency?: BackupReminderFrequency;
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}

export interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: any; // For multi-series charts
}

export interface ScorecardBranding {
  footerText?: string;
  logoBase64?: string;
}

export interface AllData {
  employees: Employee[];
  meetings: Meeting[];
  leaves: LeaveRecord[];
  tickets: TicketLog[];
  settings: AppSettings;
  scoreHistory_perf: ScorecardRecord[]; // Moved from AllPerformanceScorecardData
  branding_perf: ScorecardBranding;   // Moved from AllPerformanceScorecardData
}

// For Performance Scorecard
export type KpiTargetLevel = 'poor' | 'needsImprovement' | 'meets' | 'exceeds' | 'exceptional';

export interface ScorecardKpi {
  id: string;
  name: string;
  weight: number;
  actual: number;
  scoringDirection: 'higher-is-better' | 'lower-is-better';
  targets: Record<KpiTargetLevel, number>;
  calculatedScore?: number;
}

export interface ScorecardMetric {
  id: string;
  title: string;
  weight: number;
  kpis: ScorecardKpi[];
  metricScore?: number;
}

export interface ScorecardRecord {
  id: string;
  employeeId: string; // Links to the main Employee ID
  appraisalPeriod: string;
  appraisalType: string;
  dateFrom: string | null;
  dateTo: string | null;
  finalScore: number;
  interpretation: string;
  interpretationColorClass?: string;
  interpretationBadgeBgClass?: string;
  interpretationBadgeTextClass?: string;
  timestamp: string;
  metrics: ScorecardMetric[];
}

// Data specific to Performance Scorecard module for import/export
// This interface is now redundant as its properties are merged into AllData
// export interface AllPerformanceScorecardData {
//   scoreHistory_perf: ScorecardRecord[];
//   branding_perf: ScorecardBranding;
// }