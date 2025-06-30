

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Employee, Meeting, LeaveRecord, TicketLog, AppSettings, Tab, AllData, ScorecardRecord, ScorecardBranding } from './types';
import { TABS, DEFAULT_PRIMARY_COLOR, DEFAULT_BACKGROUND_COLOR, APP_NAME, LOCAL_STORAGE_KEYS_PERF_SCORECARD, SYSTEM_VERSION, DEFAULT_FOOTER_CREDIT_TEXT, DEFAULT_BACKUP_REMINDER_ENABLED, DEFAULT_BACKUP_REMINDER_FREQUENCY } from './constants';
import ServiceDeskTab from './tabs/ServiceDeskTab';
import MeetingsTab from './tabs/MeetingsTab';
import LeavesTab from './tabs/LeavesTab';
import EmployeesTab from './tabs/EmployeesTab';
import PerformanceScorecardTab from './tabs/PerformanceScorecardTab';
import SettingsTab from './tabs/SettingsTab';
import Modal from './components/Modal';
import Toast from './components/Toast';

const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [tickets, setTickets] = useState<TicketLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    appTitle: APP_NAME,
  });

  // Performance Scorecard State
  const [perfScorecardHistory, setPerfScorecardHistory] = useState<ScorecardRecord[]>([]);
  const [perfScorecardBranding, setPerfScorecardBranding] = useState<ScorecardBranding>({});
  
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const autoBackupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoBackupTimeRef = useRef<number>(0);

  const [donationModal, setDonationModal] = useState<{isOpen: boolean; method: 'paypal' | 'gcash' | 'bank' | null}>({isOpen: false, method: null});
  const [isBackupReminderModalOpen, setIsBackupReminderModalOpen] = useState(false);
  const [showBackupReminderIcon, setShowBackupReminderIcon] = useState(false);

  const openDonationModal = (method: 'paypal' | 'gcash' | 'bank') => {
    setDonationModal({isOpen: true, method});
  }

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Load data from localStorage
  useEffect(() => {
    setIsLoading(true);
    let initialToast: { message: string; type: 'success' | 'error' | 'info' } | null = null;

    try {
      const storedEmployees = localStorage.getItem('kpi_employees');
      if (storedEmployees) { setEmployees(JSON.parse(storedEmployees)); }

      const storedMeetings = localStorage.getItem('kpi_meetings');
      if (storedMeetings) { setMeetings(JSON.parse(storedMeetings)); }
      
      const storedLeaves = localStorage.getItem('kpi_leaves');
      if (storedLeaves) { setLeaves(JSON.parse(storedLeaves)); }

      const storedTickets = localStorage.getItem('kpi_tickets');
      if (storedTickets) { setTickets(JSON.parse(storedTickets)); }

      const storedSettings = localStorage.getItem('kpi_settings');
      if (storedSettings) {
        const parsedSettings: AppSettings = JSON.parse(storedSettings);
        if (!parsedSettings.appTitle) parsedSettings.appTitle = APP_NAME;
        if (parsedSettings.backupReminderEnabled === undefined) parsedSettings.backupReminderEnabled = DEFAULT_BACKUP_REMINDER_ENABLED;
        if (parsedSettings.backupReminderFrequency === undefined) parsedSettings.backupReminderFrequency = DEFAULT_BACKUP_REMINDER_FREQUENCY;
        setSettings(parsedSettings);
        document.documentElement.style.setProperty('--primary-color', parsedSettings.primaryColor || DEFAULT_PRIMARY_COLOR);
        document.documentElement.style.setProperty('--background-color', parsedSettings.backgroundColor || DEFAULT_BACKGROUND_COLOR);
      } else {
        setSettings({ 
            appTitle: APP_NAME, 
            primaryColor: DEFAULT_PRIMARY_COLOR, 
            backgroundColor: DEFAULT_BACKGROUND_COLOR,
            backupReminderEnabled: DEFAULT_BACKUP_REMINDER_ENABLED,
            backupReminderFrequency: DEFAULT_BACKUP_REMINDER_FREQUENCY,
        });
        document.documentElement.style.setProperty('--primary-color', DEFAULT_PRIMARY_COLOR);
        document.documentElement.style.setProperty('--background-color', DEFAULT_BACKGROUND_COLOR);
      }

      const storedPerfHistory = localStorage.getItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.scoreHistory);
      if (storedPerfHistory) setPerfScorecardHistory(JSON.parse(storedPerfHistory));
      const storedPerfBranding = localStorage.getItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.branding);
      if (storedPerfBranding) setPerfScorecardBranding(JSON.parse(storedPerfBranding));

    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      initialToast = { message: "Error loading data from storage.", type: "error" };
    } finally {
      setIsLoading(false);
      if (initialToast) {
        setToast(initialToast);
      }
    }

    const autoBackupRaw = localStorage.getItem('kpi_autobackup');
    if (autoBackupRaw) {
      try {
        const parsedAutoBackup = JSON.parse(autoBackupRaw) as { data: AllData; backupTimestamp: string }; // Use AllData for autobackup type
        // The AllData type now correctly includes settings, scoreHistory_perf, and branding_perf.
        // The old cleanup logic for employees_perf might not be needed if AllData structure is consistent.
        // However, keeping it for one last check to ensure old backups are cleaned.
        if ((parsedAutoBackup.data as any).employees_perf) {
             delete (parsedAutoBackup.data as any).employees_perf; 
             localStorage.setItem('kpi_autobackup', JSON.stringify(parsedAutoBackup));
        }
        console.log("Auto-backup found from:", new Date(parsedAutoBackup.backupTimestamp).toLocaleString());
      } catch (e) {
        console.error("Failed to parse auto-backup:", e);
        localStorage.removeItem('kpi_autobackup');
      }
    }
  }, []);

  // Save data to localStorage & Auto-backup
  useEffect(() => {
    if (isLoading) return; 
    try {
      localStorage.setItem('kpi_employees', JSON.stringify(employees)); 
      localStorage.setItem('kpi_meetings', JSON.stringify(meetings));
      localStorage.setItem('kpi_leaves', JSON.stringify(leaves));
      localStorage.setItem('kpi_tickets', JSON.stringify(tickets));
      localStorage.setItem('kpi_settings', JSON.stringify(settings));

      localStorage.setItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.scoreHistory, JSON.stringify(perfScorecardHistory));
      localStorage.setItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.branding, JSON.stringify(perfScorecardBranding));

      localStorage.setItem('kpi_last_save_timestamp', new Date().toISOString());
    } catch (error) {
      console.error("Failed to save data to localStorage:", error);
      showToast("Error saving data to storage.", "error");
    }

    if (autoBackupTimeoutRef.current) {
      clearTimeout(autoBackupTimeoutRef.current);
    }
    autoBackupTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastAutoBackupTimeRef.current > AUTO_BACKUP_INTERVAL || lastAutoBackupTimeRef.current === 0) {
          try {
              const backupData: { data: AllData; backupTimestamp: string } = { // Use AllData here
                  data: { 
                    employees, meetings, leaves, tickets, settings,
                    scoreHistory_perf: perfScorecardHistory,
                    branding_perf: perfScorecardBranding,
                  },
                  backupTimestamp: new Date().toISOString(),
              };
              localStorage.setItem('kpi_autobackup', JSON.stringify(backupData));
              lastAutoBackupTimeRef.current = now;
              console.log("Data automatically backed up at", backupData.backupTimestamp);
          } catch (e) {
              console.error("Failed to auto-backup data:", e);
              showToast("Automatic backup failed. Storage might be full.", "error");
          }
      }
    }, 1000); 

    return () => { 
        if (autoBackupTimeoutRef.current) {
            clearTimeout(autoBackupTimeoutRef.current);
        }
    };
  }, [employees, meetings, leaves, tickets, settings, perfScorecardHistory, perfScorecardBranding, isLoading, showToast]);

  // Backup Reminder Check
  useEffect(() => {
    if (isLoading || !(settings.backupReminderEnabled ?? DEFAULT_BACKUP_REMINDER_ENABLED)) {
        setShowBackupReminderIcon(false);
        return;
    }

    const lastDismissTimestampStr = localStorage.getItem('kpi_last_backup_reminder_dismiss_timestamp');
    const lastBackupTimestampStr = localStorage.getItem('kpi_last_manual_backup_timestamp');
    
    const mostRecentActionTimestamp = Math.max(
        lastDismissTimestampStr ? new Date(lastDismissTimestampStr).getTime() : 0,
        lastBackupTimestampStr ? new Date(lastBackupTimestampStr).getTime() : 0
    );

    if (mostRecentActionTimestamp === 0) { // Never backed up or dismissed
        setShowBackupReminderIcon(true);
        return;
    }
    
    const now = new Date().getTime();
    const frequency = settings.backupReminderFrequency || DEFAULT_BACKUP_REMINDER_FREQUENCY;
    let threshold = 0;
    
    switch (frequency) {
        case '5-minutes': threshold = 5 * 60 * 1000; break;
        case '30-minutes': threshold = 30 * 60 * 1000; break;
        case 'hourly': threshold = 60 * 60 * 1000; break;
        case '6-hourly': threshold = 6 * 60 * 60 * 1000; break;
        case 'daily': threshold = 24 * 60 * 60 * 1000; break;
        case 'weekly': threshold = 7 * 24 * 60 * 60 * 1000; break;
        case 'monthly': threshold = 30 * 24 * 60 * 60 * 1000; break; // Approx
    }

    if (threshold > 0 && now - mostRecentActionTimestamp > threshold) {
        setShowBackupReminderIcon(true);
    } else {
        setShowBackupReminderIcon(false);
    }

  }, [isLoading, settings.backupReminderEnabled, settings.backupReminderFrequency, settings]);


  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = {...prev, ...newSettings};
      if (newSettings.primaryColor) document.documentElement.style.setProperty('--primary-color', newSettings.primaryColor);
      if (newSettings.backgroundColor) document.documentElement.style.setProperty('--background-color', newSettings.backgroundColor);
      return updated;
    });
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const confirmDelete = (message: string, onConfirmAction: () => void) => {
    setDeleteConfirmation({
      isOpen: true,
      message: message,
      onConfirm: () => {
        onConfirmAction();
        setDeleteConfirmation({ isOpen: false, message: '', onConfirm: () => {} });
      },
    });
  };

  const handleClearAllApplicationData = () => {
    confirmDelete(
      "This will permanently delete ALL application data... UI settings will NOT be affected. Are you sure?",
      () => {
        setEmployees([]); setMeetings([]); setLeaves([]); setTickets([]);
        setPerfScorecardHistory([]); setPerfScorecardBranding({}); // Clears branding too
        localStorage.removeItem(LOCAL_STORAGE_KEYS_PERF_SCORECARD.kpiConfig);
        localStorage.removeItem('kpi_last_manual_backup_timestamp'); // Clear backup timestamps too
        localStorage.removeItem('kpi_last_backup_reminder_dismiss_timestamp');
        showToast("All application data has been cleared.", "success");
      }
    );
  };
  
  const calculateLeaveHours = useCallback((startDateStr: string, endDateStr: string): number => {
      let totalHours = 0; if (!startDateStr || !endDateStr) return 0;
      let currentDate = new Date(startDateStr); const endDate = new Date(endDateStr);
      if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) return 0;
      while(currentDate <= endDate) {
          const day = currentDate.getDay(); 
          if (day >= 1 && day <= 4) totalHours += 9;
          else if (day === 5 || day === 6) totalHours += 8;
          currentDate.setDate(currentDate.getDate() + 1);
      }
      return totalHours;
  }, []);

  const updateLastManualBackupTimestamp = useCallback(() => {
    const nowStr = new Date().toISOString();
    localStorage.setItem('kpi_last_manual_backup_timestamp', nowStr);
    localStorage.setItem('kpi_last_backup_reminder_dismiss_timestamp', nowStr); // Performing backup also counts as dismissing
    showToast("Data export successful. Backup timestamp updated.", "success");
    setShowBackupReminderIcon(false);
  }, [showToast]);

  const exportData = useCallback((format: 'json' | 'employees' | 'meetings' | 'leaves' | 'tickets') => {
    let dataToExport: any;
    let fileName: string;
    let contentType: string = 'application/json';

    const allCurrentData = { employees, meetings, leaves, tickets, settings, scoreHistory_perf: perfScorecardHistory, branding_perf: perfScorecardBranding };
    
    if (format === 'json') {
      dataToExport = JSON.stringify(allCurrentData, null, 2);
      fileName = 'kpi_dashboard_pro_backup.json';
    } else { 
      let csvData: any[] = [];
      let headers: string[] = [];
      contentType = 'text/csv;charset=utf-8;';
      
      switch(format) {
        case 'employees': 
          csvData = allCurrentData.employees; 
          headers = ['id', 'name', 'leaveAllowance', 'isTechnician', 'leaveCoverageStart', 'leaveCoverageEnd', 'idNumber', 'positionTitle', 'positionClassification', 'department', 'section', 'latestScore']; 
          fileName = 'employees_data.csv'; 
          break;
        case 'meetings': 
          csvData = allCurrentData.meetings.flatMap(m => m.attendance?.map(a => {
              const emp = allCurrentData.employees.find(e => e.id === a.employeeId);
              return { meetingId: m.id, topic: m.topic, date: m.date, employeeName: emp?.name || 'N/A', status: a.status, minutesLate: a.minutesLate || 0, remark: a.remark };
          }) || [{ meetingId: m.id, topic: m.topic, date: m.date, employeeName: 'N/A', status: 'No records', minutesLate: 0, remark: '' }]);
          headers = ['meetingId', 'topic', 'date', 'employeeName', 'status', 'minutesLate', 'remark']; 
          fileName = 'meetings_attendance_data.csv'; 
          break;
        case 'leaves': 
          csvData = allCurrentData.leaves.map(l => ({...l, employeeName: allCurrentData.employees.find(e => e.id === l.employeeId)?.name || 'N/A'}));
          headers = ['id', 'employeeId', 'employeeName', 'startDate', 'endDate', 'leaveType', 'reason']; 
          fileName = 'leaves_data.csv'; 
          break;
        case 'tickets': 
          csvData = allCurrentData.tickets.map(t => ({...t, technicianName: allCurrentData.employees.find(e => e.id === t.technicianId)?.name || 'N/A'}));
          headers = ['id', 'startDate', 'endDate', 'technicianId', 'technicianName', 'accomplished', 'pending', 'violated']; 
          fileName = 'tickets_data.csv'; 
          break;
        default: return;
      }
      
      if (!csvData?.length) { showToast("No data to export.", "info"); return; }
      const csvContent = [headers.join(','), ...csvData.map(item => headers.map(h => `"${(item[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      dataToExport = csvContent;
    }

    const blob = new Blob([dataToExport], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (format === 'json') {
      updateLastManualBackupTimestamp(); 
    } else {
      showToast(`${fileName} exported.`, "success");
    }
  }, [employees, meetings, leaves, tickets, settings, perfScorecardHistory, perfScorecardBranding, updateLastManualBackupTimestamp, showToast]);

  const dismissBackupReminder = () => {
      localStorage.setItem('kpi_last_backup_reminder_dismiss_timestamp', new Date().toISOString());
      setIsBackupReminderModalOpen(false);
      setShowBackupReminderIcon(false);
      showToast("Backup reminder dismissed.", "info");
  };

  const handleBackupFromReminder = () => {
      exportData('json');
      setIsBackupReminderModalOpen(false);
      setShowBackupReminderIcon(false);
  };


  if (isLoading) { 
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Dashboard...</div>;
  }

  const visibleTabs = TABS.filter(tab => !(settings.hiddenTabs || []).includes(tab.id));
  const headerHeight = '4.5rem'; 
  const tabsHeight = '3.375rem';

  return (
    <div className={`min-h-screen flex flex-col ${settings.chartLayout === 'full-width' ? 'charts-full-width' : ''}`}>
      <header 
        className="fixed top-0 left-0 right-0 z-50 w-full bg-gray-900 shadow-md p-4 flex justify-between items-center print:hidden"
        style={{ height: headerHeight }}
      >
        <div className="flex items-center space-x-4">
          <img 
            id="logo-display" 
            src={settings.companyLogo || "https://placehold.co/120x40/1f2937/ffffff?text=Your+Logo"} 
            alt="Logo" 
            className="h-10 rounded"
          />
          <h1 className="text-xl md:text-2xl font-bold text-white">{settings.appTitle || APP_NAME}</h1>
        </div>
        <div className="flex items-center space-x-4">
          {showBackupReminderIcon && (
              <button 
                  onClick={() => setIsBackupReminderModalOpen(true)} 
                  className="text-yellow-400 hover:text-yellow-300 animate-pulse"
                  title="Backup Reminder"
              >
                  <i className="fas fa-exclamation-triangle text-lg"></i>
              </button>
          )}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400">Donation:</span>
            <button onClick={() => openDonationModal('paypal')} title="Donate via PayPal" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-paypal text-lg"></i></button>
            <button onClick={() => openDonationModal('gcash')} title="Donate via GCash" className="text-gray-400 hover:text-white transition-colors"><i className="fas fa-mobile-alt text-lg"></i></button>
            <button onClick={() => openDonationModal('bank')} title="Donate via Bank Transfer" className="text-gray-400 hover:text-white transition-colors"><i className="fas fa-landmark text-lg"></i></button>
          </div>
          <div className="w-px h-5 bg-gray-600"></div>
           <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400">Contact:</span>
            <a href="https://www.youtube.com/@DECStudio_YTOfficialChannel" target="_blank" rel="noopener noreferrer" title="Youtube" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-youtube text-lg"></i></a>
            <a href="https://www.facebook.com/tuxcustodio/" target="_blank" rel="noopener noreferrer" title="Facebook" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-facebook text-lg"></i></a>
            <a href="https://github.com/DECStudioHub" target="_blank" rel="noopener noreferrer" title="Github" className="text-gray-400 hover:text-white transition-colors"><i className="fab fa-github text-lg"></i></a>
          </div>
          <div className="w-px h-5 bg-gray-600"></div>
          <div className="text-xs text-gray-400 flex items-center">
            <div className="relative group mr-4">
              <span className="cursor-pointer">Version: {SYSTEM_VERSION}</span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 hidden group-hover:block bg-gray-700 text-white text-xs rounded-lg shadow-lg p-3 z-10 border border-gray-600">
                <div className="absolute left-1/2 -translate-x-1/2 top-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-700"></div>
                <h4 className="font-bold text-sm mb-2 text-gray-100">Version 1.1.7 Changelog</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-semibold">Unified Data Model:</span> Merged Scorecard data into main backup.</li>
                  <li><span className="font-semibold">Enhanced Backups:</span> Added auto-backups and configurable reminders.</li>
                  <li><span className="font-semibold">Scorecard PDF Export:</span> Export individual scorecards with custom branding.</li>
                  <li><span className="font-semibold">UI & Charting:</span> Added chart layout options and more chart types per module.</li>
                  <li><span className="font-semibold">Recurring Meetings:</span> Create daily, weekly, and monthly meetings.</li>
                </ul>
              </div>
            </div>
            <span>Powered By: {DEFAULT_FOOTER_CREDIT_TEXT}</span>
          </div>
        </div>
      </header>

      <div 
        className="sticky z-40 bg-gray-900 border-b border-gray-700 print:hidden"
        style={{ top: headerHeight }} 
      >
        <div className="max-w-7xl mx-auto">
          <nav 
            className="-mb-px flex space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8" 
            aria-label="Tabs"
          >
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'active' 
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>{tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <main 
        className="flex-1"
        style={{ paddingTop: `calc(${headerHeight} + ${tabsHeight})` }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="tab-content">
            {activeTab === Tab.ServiceDesk && (
              <ServiceDeskTab tickets={tickets} setTickets={setTickets} employees={employees} confirmDelete={confirmDelete} showToast={showToast} settings={settings} />
            )}
            {activeTab === Tab.Meetings && (
              <MeetingsTab meetings={meetings} setMeetings={setMeetings} employees={employees} leaves={leaves} confirmDelete={confirmDelete} showToast={showToast} settings={settings} />
            )}
            {activeTab === Tab.Leaves && (
              <LeavesTab leaves={leaves} setLeaves={setLeaves} employees={employees} confirmDelete={confirmDelete} showToast={showToast} calculateLeaveHours={calculateLeaveHours} settings={settings} />
            )}
            {activeTab === Tab.PerformanceScorecard && (
              <PerformanceScorecardTab employees={employees} setEmployees={setEmployees} scoreHistory_perf={perfScorecardHistory} setScoreHistoryPerf={setPerfScorecardHistory} branding_perf={perfScorecardBranding} setBrandingPerf={setPerfScorecardBranding} confirmDelete={confirmDelete} showToast={showToast} settings={settings} />
            )}
            {activeTab === Tab.Employees && (
              <EmployeesTab employees={employees} setEmployees={setEmployees} setMeetings={setMeetings} setTickets={setTickets} scoreHistory_perf={perfScorecardHistory} setScoreHistoryPerf={setPerfScorecardHistory} confirmDelete={confirmDelete} showToast={showToast} />
            )}
            {activeTab === Tab.Settings && (
              <SettingsTab
                settings={settings}
                updateSettings={updateSettings}
                allData={{ employees, meetings, leaves, tickets, settings, scoreHistory_perf: perfScorecardHistory, branding_perf: perfScorecardBranding }}
                loadAllData={(data) => {
                  if(data.employees) setEmployees(data.employees); 
                  if(data.meetings) setMeetings(data.meetings);
                  if(data.leaves) setLeaves(data.leaves);
                  if(data.tickets) setTickets(data.tickets);
                  if (data.settings) {
                     const finalSettings: AppSettings = { ...settings, ...data.settings }; // Merge with existing settings, then apply defaults
                     if (!finalSettings.appTitle) finalSettings.appTitle = APP_NAME;
                     updateSettings(finalSettings); 
                  } else { // If no settings in imported data, ensure current settings state has defaults
                     const currentWithDefaults = {...settings};
                     if (!currentWithDefaults.appTitle) currentWithDefaults.appTitle = APP_NAME;
                     setSettings(currentWithDefaults); // Update state directly if no import for settings
                  }
                  if (data.scoreHistory_perf) setPerfScorecardHistory(data.scoreHistory_perf);
                  if (data.branding_perf) setPerfScorecardBranding(data.branding_perf);
                }}
                clearAllApplicationData={handleClearAllApplicationData}
                showToast={showToast}
                setBrandingPerf={setPerfScorecardBranding}
                exportData={exportData}
              />
            )}
          </div>
        </div>
      </main>

      <Modal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({ isOpen: false, message: '', onConfirm: () => {} })} title="Confirm Action">
        <p className="text-gray-300 mb-6">{deleteConfirmation.message}</p>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={() => setDeleteConfirmation({ isOpen: false, message: '', onConfirm: () => {} })} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
          <button type="button" onClick={deleteConfirmation.onConfirm} className="btn-danger py-2 px-4 rounded-md">Confirm</button>
        </div>
      </Modal>

      <Modal isOpen={isBackupReminderModalOpen} onClose={() => setIsBackupReminderModalOpen(false)} title="Backup Reminder">
          <p className="text-gray-300 mb-6">
              Your last backup was a while ago. It's recommended to back up your data regularly to prevent data loss.
          </p>
          <div className="flex justify-end space-x-3">
              <button type="button" onClick={dismissBackupReminder} className="btn-secondary py-2 px-4 rounded-md">Dismiss</button>
              <button type="button" onClick={handleBackupFromReminder} className="btn-primary py-2 px-4 rounded-md">Backup Now</button>
          </div>
      </Modal>

      <Modal 
        isOpen={donationModal.isOpen} 
        onClose={() => setDonationModal({isOpen: false, method: null})} 
        title={`Donate via ${donationModal.method?.charAt(0).toUpperCase()}${donationModal.method?.slice(1) || ''}`}
      >
        <div className="text-center">
            {donationModal.method === 'paypal' && (
            <div>
                <p className="mb-4">You can send your donation to the following PayPal address:</p>
                <p className="bg-gray-900 p-3 rounded-md font-mono text-lg">dantecustodio13@gmail.com</p>
            </div>
            )}
            {donationModal.method === 'gcash' && (
            <div className="space-y-2 text-left">
                <p className="mb-2 text-center">You can send your donation to the GCash account below.</p>
                <div className="bg-gray-900 p-3 rounded-md space-y-1">
                    <p><strong>Name:</strong> Dante E Custodio Jr</p>
                    <p><strong>Number:</strong> 09454026319</p>
                </div>
            </div>
            )}
            {donationModal.method === 'bank' && (
            <div className="space-y-2 text-left">
                <p className="mb-2">You can transfer to the following bank account:</p>
                <div className="bg-gray-900 p-3 rounded-md space-y-1">
                <p><strong>Bank Name:</strong> Bank of the Philippine Islands</p>
                <p><strong>Account Name:</strong> Dante E Custodio Jr</p>
                <p><strong>Account Number:</strong> 1019179873</p>
                </div>
            </div>
            )}
        </div>
      </Modal>

      {toast && (<Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />)}
    </div>
  );
};

export default App;