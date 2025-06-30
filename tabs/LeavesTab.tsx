
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { LeaveRecord, Employee, SortConfig, AppSettings, ChartDataItem, ChartDisplayType } from '../types';
import Modal from '../components/Modal';
import SortableHeader from '../components/SortableHeader';
import PaginationControls from '../components/PaginationControls';
import { LEAVE_TYPES, CHART_TYPE_OPTIONS } from '../constants';
import { BarChart, Bar, LineChart, Line, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS_LEAVES = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];


interface LeavesTabProps {
  leaves: LeaveRecord[];
  setLeaves: React.Dispatch<React.SetStateAction<LeaveRecord[]>>;
  employees: Employee[];
  confirmDelete: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  calculateLeaveHours: (startDate: string, endDate: string) => number;
  settings: AppSettings;
}

const LeaveForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: LeaveRecord) => void;
    employees: Employee[];
    initialData?: LeaveRecord | null;
    existingLeaves: LeaveRecord[];
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onSubmit, employees, initialData, existingLeaves, showToast }) => {
    const [id, setId] = useState<string | undefined>(undefined);
    const [employeeId, setEmployeeId] = useState('');
    const [leaveType, setLeaveType] = useState(Object.keys(LEAVE_TYPES)[0] || '');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (initialData) {
            setId(initialData.id);
            setEmployeeId(initialData.employeeId);
            setLeaveType(initialData.leaveType);
            setStartDate(initialData.startDate);
            setEndDate(initialData.endDate);
            setReason(initialData.reason);
        } else {
            setId(undefined);
            setEmployeeId(employees.length > 0 ? employees[0].id : '');
            setLeaveType(Object.keys(LEAVE_TYPES)[0] || '');
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
            setReason('');
        }
    }, [initialData, employees, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId) {
             showToast("Please select an employee.", "error");
             return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showToast("Start date cannot be after end date.", "error");
            return;
        }

        const newLeaveStart = new Date(startDate);
        const newLeaveEnd = new Date(endDate);

        const hasOverlap = existingLeaves.some(existingLeave => {
            if (existingLeave.id === (id || '')) return false; // Don't compare with itself if editing
            if (existingLeave.employeeId !== employeeId) return false;

            const existingStart = new Date(existingLeave.startDate);
            const existingEnd = new Date(existingLeave.endDate);
            
            // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
            return newLeaveStart <= existingEnd && newLeaveEnd >= existingStart;
        });

        if (hasOverlap) {
            showToast("This employee already has an overlapping leave record for the selected dates.", "error");
            return;
        }
        
        onSubmit({
            id: id || crypto.randomUUID(),
            employeeId,
            leaveType,
            startDate,
            endDate,
            reason
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={id ? "Edit Leave Record" : "Add Leave Record"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="leave-employee" className="block mb-1 text-sm font-medium text-gray-300">Employee</label>
                    <select id="leave-employee" value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="leave-type" className="block mb-1 text-sm font-medium text-gray-300">Leave Type</label>
                    <select id="leave-type" value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required>
                        {Object.entries(LEAVE_TYPES).map(([key, val]) => <option key={key} value={key}>{val.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="leave-start-date" className="block mb-1 text-sm font-medium text-gray-300">Start Date</label>
                    <input type="date" id="leave-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                </div>
                 <div>
                    <label htmlFor="leave-end-date" className="block mb-1 text-sm font-medium text-gray-300">End Date</label>
                    <input type="date" id="leave-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                </div>
                <div>
                    <label htmlFor="leave-reason" className="block mb-1 text-sm font-medium text-gray-300">Reason</label>
                    <input type="text" id="leave-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Vacation, Sick Leave" className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                    <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary py-2 px-4 rounded-md">Save</button>
                </div>
            </form>
        </Modal>
    );
};


const LeavesTab: React.FC<LeavesTabProps> = ({ leaves, setLeaves, employees, confirmDelete, showToast, calculateLeaveHours, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportDatePreset, setReportDatePreset] = useState('this_year');
  const [filterEmployee, setFilterEmployee] = useState(''); // New Filter
  
  const [leavesSortConfig, setLeavesSortConfig] = useState<SortConfig<LeaveRecord>>({ key: 'startDate', direction: 'desc' });
  const [summarySortConfig, setSummarySortConfig] = useState<SortConfig<any>>({key: 'name', direction: 'asc'});
  const [upcomingSortConfig, setUpcomingSortConfig] = useState<SortConfig<LeaveRecord>>({ key: 'startDate', direction: 'asc'});


  const [recordsCurrentPage, setRecordsCurrentPage] = useState(1);
  const [recordsItemsPerPage, setRecordsItemsPerPage] = useState(10);
  const [summaryCurrentPage, setSummaryCurrentPage] = useState(1);
  const [summaryItemsPerPage, setSummaryItemsPerPage] = useState(10);
  const [upcomingCurrentPage, setUpcomingCurrentPage] = useState(1);
  const [upcomingItemsPerPage, setUpcomingItemsPerPage] = useState(10);

  const [employeeLeaveTrendChartType, setEmployeeLeaveTrendChartType] = useState<ChartDisplayType>(settings.chartTypes?.lvEmpTrend || 'line');
  const [monthlyLeaveAllChartType, setMonthlyLeaveAllChartType] = useState<ChartDisplayType>(settings.chartTypes?.lvMonthlyAll || 'bar');

  const TREND_CHART_OPTIONS = CHART_TYPE_OPTIONS.filter(opt => opt.value === 'bar' || opt.value === 'line');

  const handleReportDatePresetChange = useCallback((preset: string) => {
    setReportDatePreset(preset);
    setFilterEmployee(''); // Reset employee filter
    const today = new Date();
    let startDate = '', endDate = '';

    switch(preset) {
        case 'this_month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
            break;
        case 'this_quarter':
            const quarter = Math.floor((today.getMonth() + 3) / 3);
            startDate = new Date(today.getFullYear(), (quarter - 1) * 3, 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), quarter * 3, 0).toISOString().split('T')[0];
            break;
        case 'last_quarter':
            const currentQuarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
            startDate = new Date(today.getFullYear(), currentQuarterStartMonth - 3, 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), currentQuarterStartMonth, 0).toISOString().split('T')[0];
            break;
        case 'this_year':
            startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
            break;
        case 'last_year':
             startDate = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
             endDate = new Date(today.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
            break;
        case 'custom':
        default:
            return; 
    }
    setReportStartDate(startDate);
    setReportEndDate(endDate);
  }, []);

  useEffect(() => {
    handleReportDatePresetChange('this_year');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize on mount

  const leavesForReport = useMemo(() => {
    return leaves.filter(l => {
        const dateMatch = (!reportStartDate || l.endDate >= reportStartDate) &&
                          (!reportEndDate || l.startDate <= reportEndDate);
        if (!dateMatch) return false;
        if (filterEmployee) {
            return l.employeeId === filterEmployee;
        }
        return true;
    });
  }, [leaves, reportStartDate, reportEndDate, filterEmployee]);

  const reportKPIs = useMemo(() => {
    let totalLeaveDaysInRange = 0;
    const reasonCounts: Record<string, number> = {};
    leavesForReport.forEach(l => { // leavesForReport is now filtered by employee if filterEmployee is set
        let currentDate = new Date(l.startDate);
        const localEndDate = new Date(l.endDate);
        while(currentDate <= localEndDate) {
            totalLeaveDaysInRange++;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const reason = l.reason.trim() || "Unspecified";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const commonReason = Object.keys(reasonCounts).length > 0 
        ? Object.entries(reasonCounts).sort((a,b) => b[1] - a[1])[0][0] 
        : 'N/A';
    return { totalLeaveDaysInRange, commonReason };
  }, [leavesForReport]);
  
  const employeeLeaveTrendData = useMemo(() => {
    // leavesForReport is already filtered by the global filterEmployee if set
    const monthlyData: Record<string, number> = {};
    leavesForReport.forEach(l => {
        let currentDate = new Date(l.startDate);
        const localEndDate = new Date(l.endDate);
        while(currentDate <= localEndDate) {
            const month = currentDate.toISOString().substring(0,7); // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + 1;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });
    return Object.entries(monthlyData).map(([name, value]) => ({name, value})).sort((a,b) => a.name.localeCompare(b.name));
  }, [leavesForReport]); // Depends on leavesForReport which depends on filterEmployee

  const monthlyLeaveTrendAllEmployeesData = useMemo(() => { // This chart specifically shows ALL employees in date range, ignoring filterEmployee
    const allLeavesInDateRange = leaves.filter(l => 
        (!reportStartDate || l.endDate >= reportStartDate) &&
        (!reportEndDate || l.startDate <= reportEndDate)
    );
    const monthlyData: Record<string, number> = {};
    allLeavesInDateRange.forEach(l => {
        let currentDate = new Date(l.startDate);
        const localEndDate = new Date(l.endDate);
        while(currentDate <= localEndDate) {
            const month = currentDate.toISOString().substring(0,7);
            monthlyData[month] = (monthlyData[month] || 0) + 1;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    });
    return Object.entries(monthlyData).map(([name, value]) => ({name, value})).sort((a,b) => a.name.localeCompare(b.name));
  }, [leaves, reportStartDate, reportEndDate]); // Does not depend on filterEmployee

  const upcomingLeavesDataFull = useMemo(() => {
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 30);
    
    let data = leaves.filter(l => {
        const startDateDt = new Date(l.startDate);
        const dateMatch = startDateDt >= today && startDateDt <= futureLimit;
        if (!dateMatch) return false;
        if (filterEmployee) {
            return l.employeeId === filterEmployee;
        }
        return true;
    })
    .map(l => ({...l, employeeName: employees.find(e => e.id === l.employeeId)?.name || 'N/A'}));

    if (upcomingSortConfig.key) {
        data.sort((a,b) => {
            const valA = a[upcomingSortConfig.key!]; const valB = b[upcomingSortConfig.key!];
            if(typeof valA === 'string' && typeof valB === 'string') return upcomingSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            if(typeof valA === 'number' && typeof valB === 'number') return upcomingSortConfig.direction === 'asc' ? valA - valB : valB - valA;
            if (upcomingSortConfig.key === 'startDate' || upcomingSortConfig.key === 'endDate') { // Date comparison
                 return upcomingSortConfig.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
            }
            return 0;
        });
    }
    return data;
  }, [leaves, employees, upcomingSortConfig, filterEmployee]);

  const paginatedUpcomingLeavesData = useMemo(() => {
      const startIndex = (upcomingCurrentPage - 1) * upcomingItemsPerPage;
      return upcomingLeavesDataFull.slice(startIndex, startIndex + upcomingItemsPerPage);
  }, [upcomingLeavesDataFull, upcomingCurrentPage, upcomingItemsPerPage]);

  const upcomingLeavesTableFooter = useMemo(() => {
    return { totalCount: upcomingLeavesDataFull.length };
  }, [upcomingLeavesDataFull]);
  
  const individualLeaveSummaryDataFull = useMemo(() => {
    const targetEmployees = filterEmployee ? employees.filter(e => e.id === filterEmployee) : employees;
    const data = targetEmployees.map(emp => {
        const empLeaves = leavesForReport.filter(l => l.employeeId === emp.id && LEAVE_TYPES[l.leaveType]?.countsTowardsAllowance);
        const takenHours = empLeaves.reduce((sum, l) => sum + calculateLeaveHours(l.startDate, l.endDate), 0);
        const allowance = emp.leaveAllowance || 0;
        const remaining = allowance - takenHours;
        return {id: emp.id, name: emp.name, taken: takenHours, remaining, allowance};
    });
    if(summarySortConfig.key){
        data.sort((a,b) => {
            const valA = a[summarySortConfig.key!]; const valB = b[summarySortConfig.key!];
            if(typeof valA === 'string' && typeof valB === 'string') return summarySortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            if(typeof valA === 'number' && typeof valB === 'number') return summarySortConfig.direction === 'asc' ? valA - valB : valB - valA;
            return 0;
        });
    }
    return data;
  }, [employees, leavesForReport, calculateLeaveHours, summarySortConfig, filterEmployee]);

  const paginatedIndividualLeaveSummaryData = useMemo(() => {
      const startIndex = (summaryCurrentPage - 1) * summaryItemsPerPage;
      return individualLeaveSummaryDataFull.slice(startIndex, startIndex + summaryItemsPerPage);
  }, [individualLeaveSummaryDataFull, summaryCurrentPage, summaryItemsPerPage]);

  const individualLeaveSummaryTableFooter = useMemo(() => {
    const totalAllowance = individualLeaveSummaryDataFull.reduce((sum, item) => sum + item.allowance, 0);
    const totalTaken = individualLeaveSummaryDataFull.reduce((sum, item) => sum + item.taken, 0);
    const totalRemaining = individualLeaveSummaryDataFull.reduce((sum, item) => sum + item.remaining, 0);
    return { totalAllowance, totalTaken, totalRemaining };
  }, [individualLeaveSummaryDataFull]);


  const sortedLeavesForTableFull = useMemo(() => {
    const data = leaves
      .filter(l => filterEmployee ? l.employeeId === filterEmployee : true) // Filter by employee if selected
      .map(l => ({
        ...l, 
        employeeName: employees.find(e => e.id === l.employeeId)?.name || 'Unknown',
        totalHours: calculateLeaveHours(l.startDate, l.endDate)
    }));
    if (leavesSortConfig.key) {
        data.sort((a,b) => {
            const valA = a[leavesSortConfig.key!]; const valB = b[leavesSortConfig.key!];
            if(typeof valA === 'string' && typeof valB === 'string') return leavesSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            if(typeof valA === 'number' && typeof valB === 'number') return leavesSortConfig.direction === 'asc' ? valA - valB : valB - valA;
            if (leavesSortConfig.key === 'startDate' || leavesSortConfig.key === 'endDate') { // Date comparison
                 return leavesSortConfig.direction === 'asc' ? new Date(valA as string).getTime() - new Date(valB as string).getTime() : new Date(valB as string).getTime() - new Date(valA as string).getTime();
            }
            return 0;
        });
    }
    return data;
  }, [leaves, employees, calculateLeaveHours, leavesSortConfig, filterEmployee]);

  const paginatedSortedLeavesForTable = useMemo(() => {
      const startIndex = (recordsCurrentPage - 1) * recordsItemsPerPage;
      return sortedLeavesForTableFull.slice(startIndex, startIndex + recordsItemsPerPage);
  }, [sortedLeavesForTableFull, recordsCurrentPage, recordsItemsPerPage]);

  const leaveRecordsTableFooter = useMemo(() => {
    const totalCount = sortedLeavesForTableFull.length;
    const totalHoursSum = sortedLeavesForTableFull.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    return { totalCount, totalHoursSum };
  }, [sortedLeavesForTableFull]);


  const handleLeaveSubmit = (data: LeaveRecord) => {
    if (editingLeave) {
      setLeaves(prev => prev.map(l => l.id === data.id ? data : l));
      showToast("Leave record updated successfully!", "success");
    } else {
      setLeaves(prev => [...prev, data]);
      showToast("Leave record added successfully!", "success");
    }
    setEditingLeave(null);
  };
  
  const openEditModal = (leave: LeaveRecord) => {
    setEditingLeave(leave);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingLeave(null);
    setIsModalOpen(true);
  }

  const handleDeleteLeave = (id: string) => {
    confirmDelete("Are you sure you want to delete this leave record?", () => {
      setLeaves(prev => prev.filter(l => l.id !== id));
      showToast("Leave record deleted.", "success");
    });
  };
  
  const handleSort = <T,>(config: SortConfig<T>, setConfig: React.Dispatch<React.SetStateAction<SortConfig<T>>>, key: keyof T, setCurrentPageFn: React.Dispatch<React.SetStateAction<number>>) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (config.key === key && config.direction === 'asc') {
      direction = 'desc';
    }
    setConfig({ key, direction });
    setCurrentPageFn(1);
  };

  useEffect(() => { 
      setSummaryCurrentPage(1);
      setUpcomingCurrentPage(1);
      setRecordsCurrentPage(1);
  },[reportStartDate, reportEndDate, reportDatePreset, filterEmployee]);

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded shadow-lg border border-gray-700 text-sm">
          <p className="font-bold text-gray-200">{label || payload[0]?.payload?.name || 'Details'}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const employeeLeaveTrendTitle = filterEmployee 
    ? `${employees.find(e => e.id === filterEmployee)?.name || 'Employee'}'s Leave Trend` 
    : 'Overall Leave Trend (All Filtered Employees)';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Leave Tracker</h2>
        <button onClick={openNewModal} className="btn-primary py-2 px-4 rounded-md flex items-center">
          <i className="fas fa-plus mr-2"></i>Add Leave Record
        </button>
      </div>
      
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-bold mb-4 text-gray-200">Leave Reports</h3>
        <div className="bg-gray-900 p-4 rounded-lg shadow mb-6 flex flex-wrap items-center gap-4">
            <h3 className="font-bold text-lg mr-4 text-gray-200">Report Filters</h3>
            <div className="flex items-center gap-2">
                <label htmlFor="leave-report-date-preset" className="text-sm text-gray-300">Date Range:</label>
                <select id="leave-report-date-preset" value={reportDatePreset} onChange={e => handleReportDatePresetChange(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200">
                    <option value="custom">Custom Range</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_quarter">This Quarter</option>
                    <option value="last_quarter">Last Quarter</option>
                    <option value="this_year">This Year</option>
                    <option value="last_year">Last Year</option>
                </select>
            </div>
            <div className={`flex items-center gap-2 ${reportDatePreset !== 'custom' ? 'hidden' : ''}`}>
                <label htmlFor="leave-report-start-date" className="text-sm text-gray-300">From:</label>
                <input type="date" id="leave-report-start-date" value={reportStartDate} onChange={e => {setReportStartDate(e.target.value); setReportDatePreset('custom');}} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"/>
            </div>
            <div className={`flex items-center gap-2 ${reportDatePreset !== 'custom' ? 'hidden' : ''}`}>
                <label htmlFor="leave-report-end-date" className="text-sm text-gray-300">To:</label>
                <input type="date" id="leave-report-end-date" value={reportEndDate} onChange={e => {setReportEndDate(e.target.value); setReportDatePreset('custom');}} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"/>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="leave-report-employee-filter" className="text-sm text-gray-300">Employee:</label>
                <select 
                    id="leave-report-employee-filter" 
                    value={filterEmployee} 
                    onChange={e => setFilterEmployee(e.target.value)} 
                    className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200 min-w-[150px]"
                >
                    <option value="">All Employees</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>
            <button onClick={() => { handleReportDatePresetChange('this_year'); }} className="btn-secondary py-2 px-3 text-sm rounded-md">Clear</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Total Leave Days (Filtered)</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.totalLeaveDaysInRange}</p></div>
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Most Common Reason (Filtered)</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.commonReason}</p></div>
        </div>

        <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
            <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
                <div className="flex justify-between items-center mb-2">
                     <h3 className="font-bold text-gray-200">{employeeLeaveTrendTitle} (by Month)</h3>
                    <select value={employeeLeaveTrendChartType} onChange={(e) => setEmployeeLeaveTrendChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                        {TREND_CHART_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                    {employeeLeaveTrendChartType === 'bar' ? (
                        <BarChart data={employeeLeaveTrendData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false}/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Bar dataKey="value" name="Leave Days" fill={COLORS_LEAVES[0]} />
                        </BarChart>
                    ) : ( // Line chart
                        <LineChart data={employeeLeaveTrendData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false}/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Line type="monotone" dataKey="value" name="Leave Days" stroke={COLORS_LEAVES[0]} strokeWidth={2} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
             <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-200">Leave Days by Month (All Employees in Date Range)</h3>
                    <select value={monthlyLeaveAllChartType} onChange={(e) => setMonthlyLeaveAllChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                        {TREND_CHART_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                 <ResponsiveContainer width="100%" height="90%">
                    {monthlyLeaveAllChartType === 'bar' ? (
                        <BarChart data={monthlyLeaveTrendAllEmployeesData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false}/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Bar dataKey="value" name="Total Leave Days" fill={COLORS_LEAVES[1]} />
                        </BarChart>
                    ) : ( // Line chart
                        <LineChart data={monthlyLeaveTrendAllEmployeesData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false}/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Line type="monotone" dataKey="value" name="Total Leave Days" stroke={COLORS_LEAVES[1]} strokeWidth={2} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
        
        <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
            <div className="bg-gray-800 p-5 rounded-lg shadow">
                 <h3 className="font-bold mb-4 text-gray-200">Upcoming Leaves (Next 30 Days) {filterEmployee ? `(For ${employees.find(e => e.id === filterEmployee)?.name || 'Employee'})` : ''}</h3>
                <div className="overflow-x-auto max-h-96"> 
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs uppercase text-gray-400 sticky top-0 z-10">
                            <tr>
                                <SortableHeader label="Employee" sortKey="employeeName" sortConfig={upcomingSortConfig} onSort={key => handleSort(upcomingSortConfig, setUpcomingSortConfig, key as keyof LeaveRecord, setUpcomingCurrentPage)} />
                                <SortableHeader label="Start Date" sortKey="startDate" sortConfig={upcomingSortConfig} onSort={key => handleSort(upcomingSortConfig, setUpcomingSortConfig, key as keyof LeaveRecord, setUpcomingCurrentPage)} />
                                <SortableHeader label="End Date" sortKey="endDate" sortConfig={upcomingSortConfig} onSort={key => handleSort(upcomingSortConfig, setUpcomingSortConfig, key as keyof LeaveRecord, setUpcomingCurrentPage)} />
                                <SortableHeader label="Reason" sortKey="reason" sortConfig={upcomingSortConfig} onSort={key => handleSort(upcomingSortConfig, setUpcomingSortConfig, key as keyof LeaveRecord, setUpcomingCurrentPage)} />
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUpcomingLeavesData.length > 0 ? paginatedUpcomingLeavesData.map(l => (
                                <tr key={l.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3">{l.employeeName}</td>
                                    <td className="p-3">{l.startDate}</td>
                                    <td className="p-3">{l.endDate}</td>
                                    <td className="p-3">{l.reason}</td>
                                </tr>
                            )) : (<tr><td colSpan={4} className="p-3 text-center text-gray-400">No upcoming leaves.</td></tr>)}
                        </tbody>
                        {upcomingLeavesDataFull.length > 0 && (
                            <tfoot className="bg-gray-700 font-semibold text-gray-300">
                                <tr>
                                    <td className="p-3" colSpan={4}>Total Upcoming Leaves: {upcomingLeavesTableFooter.totalCount}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                <PaginationControls
                    totalItems={upcomingLeavesDataFull.length}
                    itemsPerPage={upcomingItemsPerPage}
                    currentPage={upcomingCurrentPage}
                    onPageChange={setUpcomingCurrentPage}
                    onItemsPerPageChange={setUpcomingItemsPerPage}
                    idPrefix="upcoming-leaves"
                />
            </div>
             <div className="bg-gray-800 p-5 rounded-lg shadow">
                 <h3 className="font-bold mb-4 text-gray-200">Employee Leave Summary (In Range, Counted) {filterEmployee ? `(For ${employees.find(e => e.id === filterEmployee)?.name || 'Employee'})` : ''}</h3>
                <div className="overflow-x-auto max-h-96"> 
                     <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs uppercase text-gray-400 sticky top-0 z-10">
                            <tr>
                                <SortableHeader label="Employee" sortKey="name" sortConfig={summarySortConfig} onSort={key => handleSort(summarySortConfig, setSummarySortConfig, key as keyof any, setSummaryCurrentPage)} />
                                <SortableHeader label="Allowance (Hrs)" sortKey="allowance" sortConfig={summarySortConfig} onSort={key => handleSort(summarySortConfig, setSummarySortConfig, key as keyof any, setSummaryCurrentPage)} textCenter/>
                                <SortableHeader label="Taken (Hrs)" sortKey="taken" sortConfig={summarySortConfig} onSort={key => handleSort(summarySortConfig, setSummarySortConfig, key as keyof any, setSummaryCurrentPage)} textCenter/>
                                <SortableHeader label="Remaining (Hrs)" sortKey="remaining" sortConfig={summarySortConfig} onSort={key => handleSort(summarySortConfig, setSummarySortConfig, key as keyof any, setSummaryCurrentPage)} textCenter/>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedIndividualLeaveSummaryData.map(emp => (
                                <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-medium">{emp.name}</td>
                                    <td className="p-3 text-center">{emp.allowance}</td>
                                    <td className="p-3 text-center">{emp.taken}</td>
                                    <td className="p-3 text-center">{emp.remaining}</td>
                                </tr>
                            ))}
                            {paginatedIndividualLeaveSummaryData.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-4 text-gray-400">No leave summary data.</td>
                                </tr>
                            )}
                        </tbody>
                        {individualLeaveSummaryDataFull.length > 0 && (
                            <tfoot className="bg-gray-700 font-semibold text-gray-300">
                                <tr>
                                    <td className="p-3">Filtered Totals</td>
                                    <td className="p-3 text-center">{individualLeaveSummaryTableFooter.totalAllowance}</td>
                                    <td className="p-3 text-center">{individualLeaveSummaryTableFooter.totalTaken}</td>
                                    <td className="p-3 text-center">{individualLeaveSummaryTableFooter.totalRemaining}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                 <PaginationControls
                    totalItems={individualLeaveSummaryDataFull.length}
                    itemsPerPage={summaryItemsPerPage}
                    currentPage={summaryCurrentPage}
                    onPageChange={setSummaryCurrentPage}
                    onItemsPerPageChange={setSummaryItemsPerPage}
                    idPrefix="leave-summary"
                />
            </div>
        </div>
      </div>

      {/* Leave Records Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4 text-gray-200">All Leave Records {filterEmployee ? `(Filtered for ${employees.find(e => e.id === filterEmployee)?.name || 'Employee'})` : ''}</h3>
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                <tr>
                    <SortableHeader label="Employee" sortKey="employeeName" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} />
                    <SortableHeader label="Start Date" sortKey="startDate" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} />
                    <SortableHeader label="End Date" sortKey="endDate" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} />
                    <SortableHeader label="Leave Type" sortKey="leaveType" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} />
                    <SortableHeader label="Total Hours" sortKey="totalHours" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} textCenter/>
                    <SortableHeader label="Reason" sortKey="reason" sortConfig={leavesSortConfig} onSort={key => handleSort(leavesSortConfig, setLeavesSortConfig, key as keyof LeaveRecord, setRecordsCurrentPage)} />
                    <th className="p-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                {paginatedSortedLeavesForTable.map(l => (
                    <tr key={l.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{l.employeeName}</td><td className="p-3">{l.startDate}</td>
                        <td className="p-3">{l.endDate}</td><td className="p-3">{LEAVE_TYPES[l.leaveType]?.name || l.leaveType}</td>
                        <td className="p-3 text-center">{l.totalHours}</td>
                        <td className="p-3">{l.reason}</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => openEditModal(l)} className="text-blue-400 hover:text-blue-300" title="Edit Leave"><i className="fas fa-edit"></i></button>
                            <button onClick={() => handleDeleteLeave(l.id)} className="text-red-400 hover:text-red-300" title="Delete Leave"><i className="fas fa-trash"></i></button>
                        </td>
                    </tr>
                ))}
                {paginatedSortedLeavesForTable.length === 0 && (
                     <tr>
                        <td colSpan={7} className="text-center p-4 text-gray-400">No leave records found.</td>
                    </tr>
                )}
            </tbody>
            {sortedLeavesForTableFull.length > 0 && (
                <tfoot className="bg-gray-700 font-semibold text-gray-300">
                    <tr>
                        <td className="p-3" colSpan={4}>Total Records: {leaveRecordsTableFooter.totalCount}</td>
                        <td className="p-3 text-center">Total Hours: {leaveRecordsTableFooter.totalHoursSum}</td>
                        <td className="p-3" colSpan={2}></td>
                    </tr>
                </tfoot>
            )}
        </table>
        <PaginationControls
            totalItems={sortedLeavesForTableFull.length}
            itemsPerPage={recordsItemsPerPage}
            currentPage={recordsCurrentPage}
            onPageChange={setRecordsCurrentPage}
            onItemsPerPageChange={setRecordsItemsPerPage}
            idPrefix="leave-records"
        />
      </div>
      
      <LeaveForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLeave(null);}}
        onSubmit={handleLeaveSubmit}
        employees={employees}
        initialData={editingLeave}
        existingLeaves={leaves}
        showToast={showToast}
      />
    </div>
  );
};

export default LeavesTab;

