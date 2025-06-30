import React, { useRef, useState, useEffect } from 'react';
import { AppSettings, Employee, Meeting, LeaveRecord, TicketLog, Tab as AppTab, ScorecardRecord, ScorecardBranding, AllData, BackupReminderFrequency } from '../types'; 
import { TABS, DEFAULT_PRIMARY_COLOR, DEFAULT_BACKGROUND_COLOR, APP_NAME, SYSTEM_VERSION, DEFAULT_FOOTER_CREDIT_TEXT, DEFAULT_BACKUP_REMINDER_ENABLED, DEFAULT_BACKUP_REMINDER_FREQUENCY, BACKUP_REMINDER_FREQUENCIES } from '../constants';
import Modal from '../components/Modal';

interface SettingsTabProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  allData: AllData;
  loadAllData: (data: Partial<Omit<AllData, 'settings'> & { settings?: AppSettings }>) => void;
  clearAllApplicationData: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setBrandingPerf: React.Dispatch<React.SetStateAction<ScorecardBranding>>;
  exportData: (format: 'json' | 'employees' | 'meetings' | 'leaves' | 'tickets') => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
    settings, updateSettings, allData, loadAllData, clearAllApplicationData, showToast, setBrandingPerf,
    exportData
}) => {
  const appTitle = settings.appTitle || APP_NAME;
  const primaryColor = settings.primaryColor || DEFAULT_PRIMARY_COLOR;
  const backgroundColor = settings.backgroundColor || DEFAULT_BACKGROUND_COLOR;
  const companyLogo = settings.companyLogo || '';
  const hiddenTabs = settings.hiddenTabs || [];
  const chartLayout = settings.chartLayout || 'compact';

  const importJsonRef = useRef<HTMLInputElement>(null);
  const perfLogoInputRef = useRef<HTMLInputElement>(null);

  const [perfFooterText, setPerfFooterText] = useState(allData.branding_perf.footerText || '');
  const [perfLogoPreview, setPerfLogoPreview] = useState(allData.branding_perf.logoBase64 || '');
  
  useEffect(() => {
    setPerfFooterText(allData.branding_perf.footerText || '');
    setPerfLogoPreview(allData.branding_perf.logoBase64 || '');
  }, [allData.branding_perf]);


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSettings({ companyLogo: e.target?.result as string });
        showToast("Main dashboard logo updated.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePerfLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPerfLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const savePerfScorecardBranding = () => {
    setBrandingPerf({
      footerText: perfFooterText,
      logoBase64: perfLogoPreview
    });
    showToast("Performance Scorecard branding saved.", "success");
  };

  const handleTabVisibilityChange = (tabId: AppTab, isVisible: boolean) => {
    let newHiddenTabs: AppTab[];
    if (isVisible) {
      newHiddenTabs = hiddenTabs.filter(id => id !== tabId);
    } else {
      newHiddenTabs = [...hiddenTabs, tabId];
    }
    updateSettings({ hiddenTabs: newHiddenTabs });
  };
  
  const resetTheme = () => {
    updateSettings({ primaryColor: DEFAULT_PRIMARY_COLOR, backgroundColor: DEFAULT_BACKGROUND_COLOR });
    showToast("Theme reset to default.", "success");
  }

  const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const dataToLoad: Partial<Omit<AllData, 'settings'> & { settings?: AppSettings }> = {};
        if (imported.employees && Array.isArray(imported.employees)) dataToLoad.employees = imported.employees;
        if (imported.meetings && Array.isArray(imported.meetings)) dataToLoad.meetings = imported.meetings;
        if (imported.leaves && Array.isArray(imported.leaves)) dataToLoad.leaves = imported.leaves;
        if (imported.tickets && Array.isArray(imported.tickets)) dataToLoad.tickets = imported.tickets;
        if (imported.scoreHistory_perf && Array.isArray(imported.scoreHistory_perf)) dataToLoad.scoreHistory_perf = imported.scoreHistory_perf;
        if (imported.branding_perf && typeof imported.branding_perf === 'object') dataToLoad.branding_perf = imported.branding_perf;
        if (imported.settings && typeof imported.settings === 'object') dataToLoad.settings = imported.settings as AppSettings;
        if (Object.keys(dataToLoad).length === 0 && !dataToLoad.settings) throw new Error("JSON file does not contain recognizable data.");
        
        loadAllData(dataToLoad);
        showToast("Data imported successfully!", "success");
      } catch (error: any) {
        showToast(`Import failed: ${error.message}`, "error");
      } finally {
        if(importJsonRef.current) importJsonRef.current.value = ''; 
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Settings & Data Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UI Customization */}
        <div className="bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">UI Customization</h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="app-title" className="block mb-1 text-sm font-medium text-gray-300">Application Title</label>
              <input type="text" id="app-title" value={appTitle} onChange={e => updateSettings({ appTitle: e.target.value })} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter application title"/>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-gray-300">Color Theme</h4>
              <div className="flex items-center gap-4">
                <div><label htmlFor="primary-color-picker" className="block mb-1 text-sm text-gray-400">Accent Color</label><input type="color" id="primary-color-picker" value={primaryColor} onChange={e => updateSettings({ primaryColor: e.target.value })} /></div>
                <div><label htmlFor="background-color-picker" className="block mb-1 text-sm text-gray-400">Background</label><input type="color" id="background-color-picker" value={backgroundColor} onChange={e => updateSettings({ backgroundColor: e.target.value })} /></div>
                <div><label className="block mb-1 text-sm invisible">.</label><button onClick={resetTheme} className="btn-secondary py-2 px-3 text-sm rounded-md h-[44px]">Reset</button></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-gray-300">Tab Visibility</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {TABS.filter(t => t.id !== AppTab.Settings).map(tab => (<label key={tab.id} className="flex items-center text-gray-300"><input type="checkbox" checked={!hiddenTabs.includes(tab.id)} onChange={e => handleTabVisibilityChange(tab.id, e.target.checked)} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded mr-2 focus:ring-blue-500"/>{tab.name}</label>))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-gray-300">Chart Layout</h4>
              <div className="flex items-center gap-x-6 gap-y-3">
                <label className="flex items-center text-gray-300"><input type="radio" name="chart-layout" value="compact" checked={chartLayout === 'compact'} onChange={() => updateSettings({ chartLayout: 'compact' })} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 mr-2 focus:ring-blue-500"/>Compact (2 charts per row)</label>
                <label className="flex items-center text-gray-300"><input type="radio" name="chart-layout" value="full-width" checked={chartLayout === 'full-width'} onChange={() => updateSettings({ chartLayout: 'full-width' })} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 mr-2 focus:ring-blue-500"/>Full-Width (1 chart per row)</label>
              </div>
            </div>
          </div>
        </div>

        {/* Branding Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow space-y-6">
            <div><h3 className="text-lg font-semibold mb-2 text-gray-200">Main Dashboard Logo</h3><p className="text-sm text-gray-400 mb-4">Upload a logo for the main application header. Recommended: PNG, max 200KB.</p><input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>{companyLogo && <img src={companyLogo} alt="Current Dashboard Logo" className="mt-4 max-h-16 rounded bg-gray-700 p-1" />}</div>
            <div className="border-t border-gray-700 pt-6"><h3 className="text-lg font-semibold text-gray-200 mb-4">Performance Scorecard PDF Branding</h3><div className="space-y-4"><div><label htmlFor="perf-pdf-footer-text" className="block text-sm font-medium text-gray-300 mb-1">PDF Footer Text</label><input type="text" id="perf-pdf-footer-text" value={perfFooterText} onChange={e => setPerfFooterText(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 w-full" placeholder="e.g., Company Confidential"/></div><div><label htmlFor="perf-pdf-logo-upload" className="block text-sm font-medium text-gray-300 mb-1">PDF Logo</label><input type="file" id="perf-pdf-logo-upload" ref={perfLogoInputRef} accept="image/*" onChange={handlePerfLogoUpload} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>{perfLogoPreview && <img src={perfLogoPreview} alt="Scorecard PDF Logo Preview" className="mt-4 max-h-16 rounded bg-gray-700 p-1" />}</div><button onClick={savePerfScorecardBranding} className="btn-primary py-2 px-4 rounded-md w-full"><i className="fas fa-save mr-2"></i>Save Scorecard Branding</button></div></div>
        </div>

        {/* Data Management */}
        <div className="bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Data Management</h3>
          <div className="space-y-6">
            <div><h4 className="font-medium mb-2 text-gray-300">Full Application Backup & Restore (JSON)</h4><p className="text-sm text-gray-400 mb-3">Save all application data (employees, operational records, settings, scorecard data) to a single JSON file, or restore from such a file.</p><div className="flex flex-wrap gap-3"><button onClick={() => exportData('json')} className="btn-primary py-2 px-4 rounded-md flex items-center"><i className="fas fa-file-export mr-2"></i>Export All Data (JSON)</button><label htmlFor="import-json" className="btn-secondary py-2 px-4 rounded-md cursor-pointer flex items-center"><i className="fas fa-file-import mr-2"></i>Import from JSON</label><input type="file" id="import-json" ref={importJsonRef} className="hidden" accept=".json" onChange={handleImportJson} /></div></div>
            <div><h4 className="font-medium mb-2 text-gray-300">Export Reports (CSV)</h4><p className="text-sm text-gray-400 mb-3">Export individual data categories as CSV files for reporting or external use.</p><div className="flex flex-wrap gap-3"><button onClick={() => exportData('employees')} className="btn-secondary py-2 px-4 rounded-md flex items-center"><i className="fas fa-download mr-2"></i>Employees CSV</button><button onClick={() => exportData('meetings')} className="btn-secondary py-2 px-4 rounded-md flex items-center"><i className="fas fa-download mr-2"></i>Attendance CSV</button><button onClick={() => exportData('leaves')} className="btn-secondary py-2 px-4 rounded-md flex items-center"><i className="fas fa-download mr-2"></i>Leaves CSV</button><button onClick={() => exportData('tickets')} className="btn-secondary py-2 px-4 rounded-md flex items-center"><i className="fas fa-download mr-2"></i>Tickets CSV</button></div></div>
            
            <div className="border-t border-gray-700 pt-6">
              <h4 className="font-medium mb-2 text-gray-300">Backup Reminder</h4>
              <p className="text-sm text-gray-400 mb-3">Enable reminders to perform a manual backup of your data to prevent data loss.</p>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center text-gray-300">
                  <input
                    type="checkbox"
                    checked={settings.backupReminderEnabled ?? DEFAULT_BACKUP_REMINDER_ENABLED}
                    onChange={e => updateSettings({ backupReminderEnabled: e.target.checked })}
                    className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded mr-2 focus:ring-blue-500"
                  />
                  Enable Backup Reminder
                </label>
                <div className="flex items-center gap-2">
                  <label htmlFor="backup-frequency" className="text-sm text-gray-300">Remind Me:</label>
                  <select
                    id="backup-frequency"
                    value={settings.backupReminderFrequency ?? DEFAULT_BACKUP_REMINDER_FREQUENCY}
                    onChange={e => updateSettings({ backupReminderFrequency: e.target.value as BackupReminderFrequency })}
                    className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"
                    disabled={!(settings.backupReminderEnabled ?? DEFAULT_BACKUP_REMINDER_ENABLED)}
                  >
                    {BACKUP_REMINDER_FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-700 pt-6"><h4 className="font-medium mb-2 text-red-400">Danger Zone</h4><div className="space-y-4"><div><p className="text-sm text-gray-400 mb-2">Permanently delete ALL application data including: Employees, Service Desk tickets, Meetings, Leaves, Performance Scorecard history, and Performance Scorecard PDF branding. General UI settings (theme, main logo, app title) will NOT be affected. This action cannot be undone.</p><button onClick={clearAllApplicationData} className="btn-danger py-2 px-4 rounded-md flex items-center w-full md:w-auto"><i className="fas fa-exclamation-triangle mr-2"></i>Clear All Application Data</button></div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;