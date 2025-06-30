
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TicketLog, Employee, SortConfig, AppSettings, ChartDataItem, ChartDisplayType } from '../types';
import Modal from '../components/Modal';
import SortableHeader from '../components/SortableHeader';
import PaginationControls from '../components/PaginationControls';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { CHART_TYPE_OPTIONS } from '../constants';

interface ServiceDeskTabProps {
  tickets: TicketLog[];
  setTickets: React.Dispatch<React.SetStateAction<TicketLog[]>>;
  employees: Employee[];
  confirmDelete: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  settings: AppSettings;
}

const COLORS_SERVICE_DESK = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];


const TicketForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TicketLog) => void;
  technicians: Employee[];
  initialData?: TicketLog | null;
  existingTickets: TicketLog[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onSubmit, technicians, initialData, existingTickets, showToast }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [accomplished, setAccomplished] = useState(0);
  const [pending, setPending] = useState(0);
  const [violated, setViolated] = useState(0);
  const [logId, setLogId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialData) {
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setTechnicianId(initialData.technicianId);
      setAccomplished(initialData.accomplished);
      setPending(initialData.pending);
      setViolated(initialData.violated);
      setLogId(initialData.id);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
      setTechnicianId(technicians.length > 0 ? technicians[0].id : '');
      setAccomplished(0);
      setPending(0);
      setViolated(0);
      setLogId(undefined);
    }
  }, [initialData, technicians, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianId) {
      showToast("Please select a technician.", "error");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showToast("Start date cannot be after end date.", "error");
      return;
    }

    const isDuplicate = existingTickets.some(ticket =>
      ticket.id !== (logId || '') &&
      ticket.technicianId === technicianId &&
      ticket.startDate === startDate &&
      ticket.endDate === endDate
    );

    if (isDuplicate) {
      showToast("A ticket log for this technician and date range already exists.", "error");
      return;
    }
    
    onSubmit({
      id: logId || crypto.randomUUID(),
      startDate,
      endDate,
      technicianId,
      accomplished,
      pending,
      violated,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={logId ? "Edit Ticket Log" : "Log Service Desk Tickets"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="ticket-log-start-date" className="block mb-2 text-sm font-medium text-gray-300">From Date</label>
            <input type="date" id="ticket-log-start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
          </div>
          <div>
            <label htmlFor="ticket-log-end-date" className="block mb-2 text-sm font-medium text-gray-300">To Date</label>
            <input type="date" id="ticket-log-end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="ticket-technician" className="block mb-2 text-sm font-medium text-gray-300">Technician</label>
          <select id="ticket-technician" value={technicianId} onChange={e => setTechnicianId(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
            <label htmlFor="ticket-received" className="block mb-2 text-sm font-medium text-gray-300">Total Tickets Received (auto-calculated)</label>
            <input type="number" id="ticket-received" value={accomplished + pending} className="w-full p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-300" readOnly />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="ticket-accomplished" className="block mb-2 text-sm font-medium text-gray-300">Accomplished</label>
            <input type="number" id="ticket-accomplished" value={accomplished} onChange={e => setAccomplished(parseInt(e.target.value) || 0)} min="0" className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
          </div>
          <div>
            <label htmlFor="ticket-pending" className="block mb-2 text-sm font-medium text-gray-300">Pending</label>
            <input type="number" id="ticket-pending" value={pending} onChange={e => setPending(parseInt(e.target.value) || 0)} min="0" className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
          </div>
          <div>
            <label htmlFor="ticket-violated" className="block mb-2 text-sm font-medium text-gray-300">Violated</label>
            <input type="number" id="ticket-violated" value={violated} onChange={e => setViolated(parseInt(e.target.value) || 0)} min="0" className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" />
          </div>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
          <button type="submit" className="btn-primary py-2 px-4 rounded-md">Save Log</button>
        </div>
      </form>
    </Modal>
  );
};


const ServiceDeskTab: React.FC<ServiceDeskTabProps> = ({ tickets, setTickets, employees, confirmDelete, showToast, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketLog | null>(null);
  
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDatePreset, setFilterDatePreset] = useState('this_year');

  const [ticketLogSortConfig, setTicketLogSortConfig] = useState<SortConfig<TicketLog>>({ key: 'startDate', direction: 'desc' });
  const [summarySortConfig, setSummarySortConfig] = useState<SortConfig<ChartDataItem>>({ key: 'name', direction: 'asc' });

  const [ticketLogCurrentPage, setTicketLogCurrentPage] = useState(1);
  const [ticketLogItemsPerPage, setTicketLogItemsPerPage] = useState(10);
  const [summaryCurrentPage, setSummaryCurrentPage] = useState(1);
  const [summaryItemsPerPage, setSummaryItemsPerPage] = useState(10);

  const [ticketVolumeChartType, setTicketVolumeChartType] = useState<ChartDisplayType>(settings.chartTypes?.sdTicketVolume || 'bar');
  const [ticketStatusChartType, setTicketStatusChartType] = useState<ChartDisplayType>(settings.chartTypes?.sdTicketStatus || 'doughnut');


  const technicians = useMemo(() => employees.filter(e => e.isTechnician), [employees]);

  const handleDateRangePresetChange = useCallback((preset: string) => {
    setFilterDatePreset(preset);
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
            // For custom, retain existing dates or clear if needed by design
            // For now, it will use whatever is in filterStartDate & filterEndDate
            return; 
    }
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
  }, []);

  useEffect(() => {
    handleDateRangePresetChange('this_year');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize on mount


  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      (!filterStartDate || t.endDate >= filterStartDate) &&
      (!filterEndDate || t.startDate <= filterEndDate) &&
      (!filterTechnician || t.technicianId === filterTechnician)
    ).map(t => ({...t, technicianName: technicians.find(emp => emp.id === t.technicianId)?.name || 'N/A'}));
  }, [tickets, filterStartDate, filterEndDate, filterTechnician, technicians]);

  const kpis = useMemo(() => {
    let totalAccomplished = 0, totalPending = 0, totalViolated = 0;
    filteredTickets.forEach(t => {
        totalAccomplished += t.accomplished;
        totalPending += t.pending;
        totalViolated += t.violated;
    });
    const totalTicketsForClosure = totalAccomplished + totalPending;
    const closureRate = totalTicketsForClosure > 0 ? (totalAccomplished / totalTicketsForClosure * 100) : 0;
    const totalTicketsForSla = totalAccomplished + totalViolated;
    const slaCompliance = totalTicketsForSla > 0 ? (totalAccomplished / totalTicketsForSla * 100) : 0;
    return { totalAccomplished, totalPending, totalViolated, closureRate, slaCompliance };
  }, [filteredTickets]);

  const serviceDeskSummaryDataFull = useMemo(() => {
    const data = technicians.map(tech => {
        const techTickets = filteredTickets.filter(t => t.technicianId === tech.id);
        const accomplished = techTickets.reduce((sum, t) => sum + t.accomplished, 0);
        const pending = techTickets.reduce((sum, t) => sum + t.pending, 0);
        const violated = techTickets.reduce((sum, t) => sum + t.violated, 0);
        const totalForClosure = accomplished + pending;
        const totalForSla = accomplished + violated;
        const closureRate = totalForClosure > 0 ? (accomplished / totalForClosure * 100) : 0;
        const slaRate = totalForSla > 0 ? (accomplished / totalForSla * 100) : 0;
        return { id: tech.id, name: tech.name, accomplished, pending, violated, closureRate, slaRate, value: accomplished }; // 'value' for generic chart data
    });

    if (summarySortConfig.key) {
      data.sort((a, b) => {
        const valA = a[summarySortConfig.key!];
        const valB = b[summarySortConfig.key!];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return summarySortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return summarySortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return data;
  }, [technicians, filteredTickets, summarySortConfig]);

  const paginatedServiceDeskSummaryData = useMemo(() => {
    const startIndex = (summaryCurrentPage - 1) * summaryItemsPerPage;
    return serviceDeskSummaryDataFull.slice(startIndex, startIndex + summaryItemsPerPage);
  }, [serviceDeskSummaryDataFull, summaryCurrentPage, summaryItemsPerPage]);

  const sortedTicketLogsFull = useMemo(() => {
    const data = [...filteredTickets];
     if (ticketLogSortConfig.key) {
      data.sort((a, b) => {
        const valA = a[ticketLogSortConfig.key!];
        const valB = b[ticketLogSortConfig.key!];
         if (typeof valA === 'string' && typeof valB === 'string') {
          return ticketLogSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return ticketLogSortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return data;
  }, [filteredTickets, ticketLogSortConfig]);
  
  const paginatedTicketLogs = useMemo(() => {
    const startIndex = (ticketLogCurrentPage - 1) * ticketLogItemsPerPage;
    return sortedTicketLogsFull.slice(startIndex, startIndex + ticketLogItemsPerPage);
  }, [sortedTicketLogsFull, ticketLogCurrentPage, ticketLogItemsPerPage]);

  const ticketLogTableFooter = useMemo(() => {
    const totalAccomplished = sortedTicketLogsFull.reduce((sum, t) => sum + t.accomplished, 0);
    const totalPending = sortedTicketLogsFull.reduce((sum, t) => sum + t.pending, 0);
    const totalViolated = sortedTicketLogsFull.reduce((sum, t) => sum + t.violated, 0);
    return { totalAccomplished, totalPending, totalViolated };
  }, [sortedTicketLogsFull]);

  const summaryTableFooter = useMemo(() => {
    const totalAccomplished = serviceDeskSummaryDataFull.reduce((sum, d) => sum + d.accomplished, 0);
    const totalPending = serviceDeskSummaryDataFull.reduce((sum, d) => sum + d.pending, 0);
    const totalViolated = serviceDeskSummaryDataFull.reduce((sum, d) => sum + d.violated, 0);
    return { totalAccomplished, totalPending, totalViolated };
  }, [serviceDeskSummaryDataFull]);


  const handleTicketSubmit = (data: TicketLog) => {
    if (editingTicket) {
      setTickets(prev => prev.map(t => t.id === data.id ? data : t));
      showToast("Ticket log updated successfully!", "success");
    } else {
      setTickets(prev => [...prev, data]);
      showToast("Ticket log added successfully!", "success");
    }
    setEditingTicket(null);
  };

  const openEditModal = (ticket: TicketLog) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };
  
  const openNewModal = () => {
    setEditingTicket(null);
    setIsModalOpen(true);
  }

  const handleDeleteTicket = (id: string) => {
    confirmDelete("Are you sure you want to delete this ticket log?", () => {
      setTickets(prev => prev.filter(t => t.id !== id));
      showToast("Ticket log deleted.", "success");
    });
  };

  const clearFilters = () => {
    setFilterTechnician('');
    handleDateRangePresetChange('this_year'); 
    setTicketLogCurrentPage(1);
    setSummaryCurrentPage(1);
  };
  
  const handleSort = <T,>(config: SortConfig<T>, setConfig: React.Dispatch<React.SetStateAction<SortConfig<T>>>, key: keyof T, setCurrentPageFn: React.Dispatch<React.SetStateAction<number>>) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (config.key === key && config.direction === 'asc') {
      direction = 'desc';
    }
    setConfig({ key, direction });
    setCurrentPageFn(1);
  };
  

  const ticketStatusChartDataMain: ChartDataItem[] = useMemo(() => [
    { name: 'Accomplished', value: kpis.totalAccomplished, color: COLORS_SERVICE_DESK[0] },
    { name: 'Pending', value: kpis.totalPending, color: COLORS_SERVICE_DESK[1] },
    { name: 'Violated', value: kpis.totalViolated, color: COLORS_SERVICE_DESK[2] },
  ], [kpis]);

  const ticketVolumeChartDataMain: ChartDataItem[] = useMemo(() => serviceDeskSummaryDataFull.map(item => ({
      name: item.name,
      accomplished: item.accomplished,
      pending: item.pending,
      violated: item.violated,
      value: item.accomplished, // Default value for pie if this chart type is chosen for volume
  })), [serviceDeskSummaryDataFull]);
  
  const ticketVolumePieData = useMemo(() => 
    ticketVolumeChartDataMain.map(d => ({ name: d.name, value: d.accomplished })),
  [ticketVolumeChartDataMain]);


  useEffect(() => { // Reset page on filter change
    setTicketLogCurrentPage(1);
    setSummaryCurrentPage(1);
  }, [filterTechnician, filterStartDate, filterEndDate]);


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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Service Desk KPI</h2>
        <button onClick={openNewModal} className="btn-primary py-2 px-4 rounded-md flex items-center">
          <i className="fas fa-plus mr-2"></i>Log Tickets
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap items-center gap-4">
        <h3 className="font-bold text-lg mr-4 text-gray-200">Filters</h3>
        <div className="flex items-center gap-2">
            <label htmlFor="ticket-technician-filter" className="text-sm text-gray-300">Technician:</label>
            <select id="ticket-technician-filter" value={filterTechnician} onChange={e => setFilterTechnician(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200">
                <option value="">All Technicians</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-2">
            <label htmlFor="ticket-date-preset-filter" className="text-sm text-gray-300">Date Range:</label>
            <select id="ticket-date-preset-filter" value={filterDatePreset} onChange={e => handleDateRangePresetChange(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200">
                <option value="custom">Custom Range</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="last_quarter">Last Quarter</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
            </select>
        </div>
         <div className={`flex flex-wrap items-center gap-4 ${filterDatePreset !== 'custom' ? 'hidden' : ''}`}>
            <div className="flex items-center gap-2">
                <label htmlFor="ticket-start-date" className="text-sm text-gray-300">From:</label>
                <input type="date" id="ticket-start-date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setFilterDatePreset('custom'); }} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200" />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="ticket-end-date" className="text-sm text-gray-300">To:</label>
                <input type="date" id="ticket-end-date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setFilterDatePreset('custom'); }} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200" />
            </div>
        </div>
        <button onClick={clearFilters} className="btn-secondary py-2 px-3 text-sm rounded-md">Clear Filters</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Accomplished</h3><p className="text-3xl font-bold text-gray-100">{kpis.totalAccomplished}</p></div>
        <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Pending</h3><p className="text-3xl font-bold text-gray-100">{kpis.totalPending}</p></div>
        <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Violated</h3><p className="text-3xl font-bold text-red-400">{kpis.totalViolated}</p></div>
        <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Closure Rate</h3><p className="text-3xl font-bold text-gray-100">{kpis.closureRate.toFixed(0)}%</p></div>
        <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">SLA Compliance</h3><p className="text-3xl font-bold text-gray-100">{kpis.slaCompliance.toFixed(0)}%</p></div>
      </div>
      
      <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
        <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-200">Ticket Volume by Technician</h3>
                <select value={ticketVolumeChartType} onChange={(e) => setTicketVolumeChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                   {CHART_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            <ResponsiveContainer width="100%" height="90%">
                {ticketVolumeChartType === 'bar' ? (
                    <BarChart data={ticketVolumeChartDataMain}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                        <Bar dataKey="accomplished" stackId="a" fill={COLORS_SERVICE_DESK[0]} name="Accomplished" />
                        <Bar dataKey="pending" stackId="a" fill={COLORS_SERVICE_DESK[1]} name="Pending" />
                        <Bar dataKey="violated" stackId="a" fill={COLORS_SERVICE_DESK[2]} name="Violated" />
                    </BarChart>
                ) : ticketVolumeChartType === 'line' ? (
                     <LineChart data={ticketVolumeChartDataMain}> 
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                        <Line type="monotone" dataKey="accomplished" stroke={COLORS_SERVICE_DESK[0]} name="Accomplished" activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="pending" stroke={COLORS_SERVICE_DESK[1]} name="Pending" activeDot={{ r: 6 }}/>
                        <Line type="monotone" dataKey="violated" stroke={COLORS_SERVICE_DESK[2]} name="Violated" activeDot={{ r: 6 }}/>
                    </LineChart>
                ) : ( (ticketVolumeChartType === 'pie' || ticketVolumeChartType === 'doughnut') &&
                    <PieChart>
                        <Pie 
                            data={ticketVolumePieData} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" cy="50%" 
                            outerRadius={100} 
                            innerRadius={ticketVolumeChartType === 'doughnut' ? 60 : 0} 
                            labelLine={false} 
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {ticketVolumePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_SERVICE_DESK[index % COLORS_SERVICE_DESK.length]} />)}
                        </Pie>
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
        <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-200">Ticket Status Breakdown</h3>
                 <select value={ticketStatusChartType} onChange={(e) => setTicketStatusChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                   {CHART_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
            <ResponsiveContainer width="100%" height="90%">
                {ticketStatusChartType === 'bar' ? (
                    <BarChart data={ticketStatusChartDataMain}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                        <Bar dataKey="value" name="Count">
                             {ticketStatusChartDataMain.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS_SERVICE_DESK[index % COLORS_SERVICE_DESK.length]} />)}
                        </Bar>
                    </BarChart>
                ) : ticketStatusChartType === 'line' ? (
                    <LineChart data={ticketStatusChartDataMain}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                        <Line type="monotone" dataKey="value" name="Count" stroke={COLORS_SERVICE_DESK[3]} activeDot={{ r: 6 }} />
                    </LineChart>
                ) : ( (ticketStatusChartType === 'pie' || ticketStatusChartType === 'doughnut') &&
                    <PieChart>
                        <Pie data={ticketStatusChartDataMain} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={ticketStatusChartType === 'doughnut' ? 60 : 0} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {ticketStatusChartDataMain.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || COLORS_SERVICE_DESK[index % COLORS_SERVICE_DESK.length]} />)}
                        </Pie>
                        <Tooltip content={renderTooltip} />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                    </PieChart>
                )}
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 p-5 rounded-lg shadow mb-6">
        <h3 className="font-bold mb-4 text-gray-200">Service Desk Summary Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <SortableHeader label="Technician" sortKey="name" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} />
                <SortableHeader label="Accomplished" sortKey="accomplished" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} textCenter/>
                <SortableHeader label="Pending" sortKey="pending" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} textCenter/>
                <SortableHeader label="Violated" sortKey="violated" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} textCenter/>
                <SortableHeader label="Closure Rate" sortKey="closureRate" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} textCenter/>
                <SortableHeader label="SLA Compliance" sortKey="slaRate" sortConfig={summarySortConfig} onSort={(key) => handleSort(summarySortConfig, setSummarySortConfig, key as keyof ChartDataItem, setSummaryCurrentPage)} textCenter/>
              </tr>
            </thead>
            <tbody>
              {paginatedServiceDeskSummaryData.map(d => (
                <tr key={d.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3 text-center">{d.accomplished}</td>
                  <td className="p-3 text-center">{d.pending}</td>
                  <td className="p-3 text-center text-red-400">{d.violated}</td>
                  <td className="p-3 text-center">{d.closureRate?.toFixed(0)}%</td>
                  <td className="p-3 text-center">{d.slaRate?.toFixed(0)}%</td>
                </tr>
              ))}
              {paginatedServiceDeskSummaryData.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-400">No summary data available for current filters.</td>
                </tr>
              )}
            </tbody>
            {serviceDeskSummaryDataFull.length > 0 && (
            <tfoot className="bg-gray-700 font-semibold text-gray-300">
                <tr>
                    <td className="p-3">Totals</td>
                    <td className="p-3 text-center">{summaryTableFooter.totalAccomplished}</td>
                    <td className="p-3 text-center">{summaryTableFooter.totalPending}</td>
                    <td className="p-3 text-center text-red-400">{summaryTableFooter.totalViolated}</td>
                    <td className="p-3 text-center">-</td>
                    <td className="p-3 text-center">-</td>
                </tr>
            </tfoot>
            )}
          </table>
        </div>
        <PaginationControls
            totalItems={serviceDeskSummaryDataFull.length}
            itemsPerPage={summaryItemsPerPage}
            currentPage={summaryCurrentPage}
            onPageChange={setSummaryCurrentPage}
            onItemsPerPageChange={setSummaryItemsPerPage}
            idPrefix="sd-summary"
        />
      </div>

      <div className="bg-gray-800 p-5 rounded-lg shadow">
        <h3 className="font-bold mb-4 text-gray-200">Ticket Log Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <SortableHeader label="Date Range" sortKey="startDate" sortConfig={ticketLogSortConfig} onSort={(key) => handleSort(ticketLogSortConfig, setTicketLogSortConfig, key as keyof TicketLog, setTicketLogCurrentPage)} />
                <SortableHeader label="Technician" sortKey="technicianName" sortConfig={ticketLogSortConfig} onSort={(key) => handleSort(ticketLogSortConfig, setTicketLogSortConfig, key as keyof TicketLog, setTicketLogCurrentPage)} />
                <SortableHeader label="Accomplished" sortKey="accomplished" sortConfig={ticketLogSortConfig} onSort={(key) => handleSort(ticketLogSortConfig, setTicketLogSortConfig, key as keyof TicketLog, setTicketLogCurrentPage)} textCenter/>
                <SortableHeader label="Pending" sortKey="pending" sortConfig={ticketLogSortConfig} onSort={(key) => handleSort(ticketLogSortConfig, setTicketLogSortConfig, key as keyof TicketLog, setTicketLogCurrentPage)} textCenter/>
                <SortableHeader label="Violated" sortKey="violated" sortConfig={ticketLogSortConfig} onSort={(key) => handleSort(ticketLogSortConfig, setTicketLogSortConfig, key as keyof TicketLog, setTicketLogCurrentPage)} textCenter/>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTicketLogs.map(t => (
                <tr key={t.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3">{t.startDate === t.endDate ? t.startDate : `${t.startDate} to ${t.endDate}`}</td>
                  <td className="p-3">{t.technicianName}</td>
                  <td className="p-3 text-center">{t.accomplished}</td>
                  <td className="p-3 text-center">{t.pending}</td>
                  <td className="p-3 text-center text-red-400">{t.violated}</td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => openEditModal(t)} className="text-blue-400 hover:text-blue-300" title="Edit Log"><i className="fas fa-edit"></i></button>
                    <button onClick={() => handleDeleteTicket(t.id)} className="text-red-400 hover:text-red-300" title="Delete Log"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {paginatedTicketLogs.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-400">No ticket logs found for current filters.</td>
                </tr>
               )}
            </tbody>
            {sortedTicketLogsFull.length > 0 && (
            <tfoot className="bg-gray-700 font-semibold text-gray-300">
                <tr>
                    <td className="p-3" colSpan={2}>Filtered Totals</td>
                    <td className="p-3 text-center">{ticketLogTableFooter.totalAccomplished}</td>
                    <td className="p-3 text-center">{ticketLogTableFooter.totalPending}</td>
                    <td className="p-3 text-center text-red-400">{ticketLogTableFooter.totalViolated}</td>
                    <td className="p-3"></td>
                </tr>
            </tfoot>
            )}
          </table>
        </div>
        <PaginationControls
            totalItems={sortedTicketLogsFull.length}
            itemsPerPage={ticketLogItemsPerPage}
            currentPage={ticketLogCurrentPage}
            onPageChange={setTicketLogCurrentPage}
            onItemsPerPageChange={setTicketLogItemsPerPage}
            idPrefix="ticket-log"
        />
      </div>
      
      <TicketForm 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); }}
        onSubmit={handleTicketSubmit}
        technicians={technicians}
        initialData={editingTicket}
        existingTickets={tickets}
        showToast={showToast}
      />
    </div>
  );
};

export default ServiceDeskTab;