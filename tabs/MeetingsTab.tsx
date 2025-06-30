
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Meeting, Employee, LeaveRecord, SortConfig, AttendanceStatus, MeetingFrequency, AppSettings, ChartDataItem, ChartDisplayType } from '../types';
import Modal from '../components/Modal';
import SortableHeader from '../components/SortableHeader';
import PaginationControls from '../components/PaginationControls';
import { ATTENDANCE_STATUSES, CHART_TYPE_OPTIONS } from '../constants';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS_ATTENDANCE = ['#10B981', '#F59E0B', '#60A5FA', '#F87171', '#9CA3AF', '#A855F7']; // On Time, Late, Excused, Unexcused, N/A, Other


interface MeetingsTabProps {
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  employees: Employee[];
  leaves: LeaveRecord[];
  confirmDelete: (message: string, onConfirm: () => void) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  settings: AppSettings;
}

// Helper function
const calculateMeetingScore = (record?: { status: AttendanceStatus; minutesLate?: number }): number | null => {
  if (!record || !record.status) {
    // Treat as Unexcused Absent for scoring if no explicit status or record undefined
    return 0.0;
  }

  switch (record.status) {
    case 'On Time':
      return 1.0; // 100%
    case 'Late':
      const mins = record.minutesLate || 0;
      if (mins <= 5) return 0.95;  // 95%
      if (mins <= 10) return 0.85; // 85%
      if (mins <= 15) return 0.80; // 80%
      if (mins <= 20) return 0.70; // 70%
      return 0.0; // More than 20 minutes late (includes 30 minutes and above) is 0%
    case 'Excused Absent':
      return null; // Excluded from KPI score calculation
    case 'Unexcused Absent':
      return 0.0; // 0%
    case 'Not Applicable':
      return null; // Excluded from KPI score calculation
    default:
      return 0.0; // Should not happen with defined statuses, but default to 0
  }
};


interface RecurrenceOptions {
  frequency: 'daily' | 'weekly' | 'monthly';
  recurrenceEndDate: string;
  weeklyDays?: number[];
  monthlyRepeatType?: 'day' | 'weekday';
  monthlyDay?: number;
  monthlyWeekNumber?: number; // 1-4 for first-fourth, 5 for last
  monthlyWeekday?: number; // 0-6 for Sun-Sat
}

const MeetingForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Meeting, isRecurring: boolean, recurrenceOptions?: RecurrenceOptions) => void;
    initialData?: Meeting | null;
    existingMeetings: Meeting[];
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onSubmit, initialData, existingMeetings, showToast }) => {
    const [id, setId] = useState<string | undefined>(undefined);
    const [topic, setTopic] = useState('');
    const [date, setDate] = useState('');
    const [frequency, setFrequency] = useState<MeetingFrequency>('none');
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
    const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
    const [monthlyRepeatType, setMonthlyRepeatType] = useState<'day' | 'weekday'>('day');
    const [monthlyDay, setMonthlyDay] = useState<number>(1);
    const [monthlyWeekNumber, setMonthlyWeekNumber] = useState<number>(1);
    const [monthlyWeekday, setMonthlyWeekday] = useState<number>(1); // Monday

    useEffect(() => {
        if (initialData) {
            setId(initialData.id);
            setTopic(initialData.topic);
            setDate(initialData.date);
            setFrequency(initialData.frequency || 'none');
            setRecurrenceEndDate(initialData.recurrenceEndDate || '');
            setWeeklyDays(initialData.weeklyDays || []);
            setMonthlyRepeatType(initialData.monthlyRepeatType || 'day');
            setMonthlyDay(initialData.monthlyDay || 1);
            setMonthlyWeekNumber(initialData.monthlyWeekNumber || 1);
            setMonthlyWeekday(initialData.monthlyWeekday || 1);
            if (initialData.id) {
                setFrequency('none');
            }

        } else {
            setId(undefined);
            setTopic('');
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setDate(now.toISOString().slice(0, 16));
            setFrequency('none');
            setRecurrenceEndDate('');
            setWeeklyDays([]);
            setMonthlyRepeatType('day');
            setMonthlyDay(1);
            setMonthlyWeekNumber(1);
            setMonthlyWeekday(1);
        }
    }, [initialData, isOpen]);

    const handleWeeklyDayChange = (day: number) => {
        setWeeklyDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isRecurringFrequency = frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly';
        const isRecurringForm = isRecurringFrequency && !id;

        if (!isRecurringForm) { // Check for single meeting duplicates
            const isDuplicate = existingMeetings.some(m =>
                m.id !== (id || '') &&
                m.topic.trim().toLowerCase() === topic.trim().toLowerCase() &&
                m.date === date
            );
            if (isDuplicate) {
                showToast("A meeting with the same topic and date/time already exists.", "error");
                return;
            }
        }

        // Date validation for recurrence
        if (isRecurringForm && recurrenceEndDate && new Date(date) > new Date(recurrenceEndDate)) {
             showToast("Recurrence end date cannot be before the meeting start date.", "error");
             return;
        }


        const baseMeetingData: Meeting = {
            id: id || crypto.randomUUID(),
            topic,
            date,
            attendance: initialData?.attendance || []
        };

        let recurrenceDetails: RecurrenceOptions | undefined;

        if (isRecurringForm) {
            if (!recurrenceEndDate) {
                showToast("Please select an end date for recurrence.", "error");
                return;
            }

            // Within this block, `frequency` is one of 'daily', 'weekly', or 'monthly'.
            // Its type is narrowed by TypeScript's control flow analysis due to `isRecurringForm`.
            recurrenceDetails = {
                frequency: frequency, // Use the narrowed type of frequency
                recurrenceEndDate,
                weeklyDays: frequency === 'weekly' ? weeklyDays : undefined,
                monthlyRepeatType: frequency === 'monthly' ? monthlyRepeatType : undefined,
                monthlyDay: frequency === 'monthly' && monthlyRepeatType === 'day' ? monthlyDay : undefined,
                monthlyWeekNumber: frequency === 'monthly' && monthlyRepeatType === 'weekday' ? monthlyWeekNumber : undefined,
                monthlyWeekday: frequency === 'monthly' && monthlyRepeatType === 'weekday' ? monthlyWeekday : undefined,
            };

            baseMeetingData.frequency = recurrenceDetails.frequency;
            baseMeetingData.recurrenceEndDate = recurrenceDetails.recurrenceEndDate;

            if (frequency === 'weekly') {
                baseMeetingData.weeklyDays = recurrenceDetails.weeklyDays;
                 if (!baseMeetingData.weeklyDays || baseMeetingData.weeklyDays.length === 0) {
                     showToast("Please select at least one day for weekly recurrence.", "error"); return;
                 }
            }
            if (frequency === 'monthly') {
                baseMeetingData.monthlyRepeatType = recurrenceDetails.monthlyRepeatType;
                if (recurrenceDetails.monthlyRepeatType === 'day') {
                    baseMeetingData.monthlyDay = recurrenceDetails.monthlyDay;
                    if (!baseMeetingData.monthlyDay || baseMeetingData.monthlyDay < 1 || baseMeetingData.monthlyDay > 31) {
                         showToast("Please enter a valid day of the month (1-31).", "error"); return;
                    }
                } else {
                    baseMeetingData.monthlyWeekNumber = recurrenceDetails.monthlyWeekNumber;
                    baseMeetingData.monthlyWeekday = recurrenceDetails.monthlyWeekday;
                }
            }
        } else {
            baseMeetingData.frequency = 'none';
            if (id) { // If editing an existing meeting, ensure recurrence fields are cleared if frequency becomes 'none'
                baseMeetingData.recurrenceEndDate = undefined;
                baseMeetingData.weeklyDays = undefined;
                baseMeetingData.monthlyRepeatType = undefined;
                baseMeetingData.monthlyDay = undefined;
                baseMeetingData.monthlyWeekNumber = undefined;
                baseMeetingData.monthlyWeekday = undefined;
            }
        }
        onSubmit(baseMeetingData, isRecurringForm, recurrenceDetails);
        onClose();
    };

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={id ? "Edit Meeting" : "Create Meeting"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="meeting-topic" className="block mb-1 text-sm font-medium text-gray-300">Topic</label>
                    <input type="text" id="meeting-topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                </div>
                <div>
                    <label htmlFor="meeting-date" className="block mb-1 text-sm font-medium text-gray-300">Start Date & Time</label>
                    <input type="datetime-local" id="meeting-date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                </div>
                {!id && (
                    <>
                        <div>
                            <label htmlFor="meeting-frequency" className="block mb-1 text-sm font-medium text-gray-300">Frequency</label>
                            <select id="meeting-frequency" value={frequency} onChange={e => setFrequency(e.target.value as MeetingFrequency)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200">
                                <option value="none">None (Single Meeting)</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>

                        {frequency !== 'none' && (
                            <div>
                                <label htmlFor="recurrence-end-date" className="block mb-1 text-sm font-medium text-gray-300">Repeat Until</label>
                                <input type="date" id="recurrence-end-date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200" required />
                            </div>
                        )}

                        {frequency === 'weekly' && (
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-300">Repeat on Days</label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                    {weekdays.map((day, index) => (
                                        <label key={day} className="flex items-center text-gray-300">
                                            <input type="checkbox" value={index} checked={weeklyDays.includes(index)} onChange={() => handleWeeklyDayChange(index)} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded mr-1" />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {frequency === 'monthly' && (
                            <div className="space-y-3 p-3 bg-gray-700/50 rounded-md">
                                <div>
                                    <label className="flex items-center text-gray-300">
                                        <input type="radio" name="monthly-repeat-type" value="day" checked={monthlyRepeatType === 'day'} onChange={() => setMonthlyRepeatType('day')} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 mr-2"/>
                                        On day
                                    </label>
                                    <input type="number" value={monthlyDay} onChange={e => setMonthlyDay(parseInt(e.target.value))} min="1" max="31" className="w-full mt-1 p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200" disabled={monthlyRepeatType !== 'day'}/>
                                </div>
                                <div>
                                    <label className="flex items-center text-gray-300">
                                        <input type="radio" name="monthly-repeat-type" value="weekday" checked={monthlyRepeatType === 'weekday'} onChange={() => setMonthlyRepeatType('weekday')} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 mr-2"/>
                                        On the
                                    </label>
                                    <div className="flex gap-2 mt-1">
                                        <select value={monthlyWeekNumber} onChange={e => setMonthlyWeekNumber(parseInt(e.target.value))} className="w-1/2 p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200" disabled={monthlyRepeatType !== 'weekday'}>
                                            <option value="1">First</option><option value="2">Second</option><option value="3">Third</option><option value="4">Fourth</option><option value="5">Last</option>
                                        </select>
                                        <select value={monthlyWeekday} onChange={e => setMonthlyWeekday(parseInt(e.target.value))} className="w-1/2 p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200" disabled={monthlyRepeatType !== 'weekday'}>
                                            {weekdays.map((day, index) => <option key={index} value={index}>{day}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div className="flex justify-end space-x-3 pt-3">
                    <button type="button" onClick={onClose} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary py-2 px-4 rounded-md">Save</button>
                </div>
            </form>
        </Modal>
    );
};

type IndividualPerfDataType = ChartDataItem & {id: string, onTime: number, late: number, excused: number, unexcused: number, notApplicable: number, totalMeetingsScheduled: number, rate: number };
type AttendanceRecordState = {status: AttendanceStatus, minutesLate?: number, remark?: string, isOnLeave?: boolean};


const MeetingsTab: React.FC<MeetingsTabProps> = ({ meetings, setMeetings, employees, leaves, confirmDelete, showToast, settings }) => {
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [currentMeetingForAttendance, setCurrentMeetingForAttendance] = useState<Meeting | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecordState>>({});

  // Filters for Meeting List
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingDateStartFilter, setMeetingDateStartFilter] = useState('');
  const [meetingDateEndFilter, setMeetingDateEndFilter] = useState('');

  // Filters for Reports
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportDatePreset, setReportDatePreset] = useState('this_year');
  const [filterEmployee, setFilterEmployee] = useState(''); // New filter

  const [meetingsSortConfig, setMeetingsSortConfig] = useState<SortConfig<Meeting & { rate: number }>>({ key: 'date', direction: 'desc' });
  const [perfSortConfig, setPerfSortConfig] = useState<SortConfig<IndividualPerfDataType>>({key: 'name', direction: 'asc'});

  const [individualChartEmployeeId, setIndividualChartEmployeeId] = useState<string>(''); // For the individual chart's dedicated select

  const [meetingListCurrentPage, setMeetingListCurrentPage] = useState(1);
  const [meetingListItemsPerPage, setMeetingListItemsPerPage] = useState(10);
  const [perfCurrentPage, setPerfCurrentPage] = useState(1);
  const [perfItemsPerPage, setPerfItemsPerPage] = useState(10);

  const [overallAttendanceChartType, setOverallAttendanceChartType] = useState<ChartDisplayType>(settings.chartTypes?.mtgOverallAttendance || 'pie');
  const [monthlyAttendanceChartType, setMonthlyAttendanceChartType] = useState<ChartDisplayType>(settings.chartTypes?.mtgMonthlyTrend || 'line');
  const [individualEmployeeChartType, setIndividualEmployeeChartType] = useState<ChartDisplayType>(settings.chartTypes?.mtgIndividualEmp || 'bar');

  const TREND_CHART_OPTIONS = CHART_TYPE_OPTIONS.filter(opt => opt.value === 'bar' || opt.value === 'line');
  const INDIVIDUAL_STATUS_CHART_OPTIONS = CHART_TYPE_OPTIONS.filter(opt => opt.value === 'bar' || opt.value === 'pie' || opt.value === 'doughnut');


   useEffect(() => { // Ensure individual chart select has a default if employees exist
    if (employees.length > 0 && !individualChartEmployeeId) {
      setIndividualChartEmployeeId(employees[0].id);
    }
  }, [employees, individualChartEmployeeId]);

  const handleReportDatePresetChange = useCallback((preset: string) => {
    setReportDatePreset(preset);
    setFilterEmployee(''); // Reset employee filter on date preset change
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
            // Clearing employee is handled above.
            return;
    }
    setReportStartDate(startDate);
    setReportEndDate(endDate);
  }, []);

  useEffect(() => {
    handleReportDatePresetChange('this_year');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize on mount


  const findNthWeekdayOfMonth = (year: number, month: number, dayOfWeek: number, weekNumber: number, originalStartDate: Date): Date | null => {
        const date = new Date(year, month, 1, originalStartDate.getHours(), originalStartDate.getMinutes());
        let count = 0;
        if (weekNumber < 5) { // First, Second, Third, Fourth
            while (date.getMonth() === month) {
                if (date.getDay() === dayOfWeek) {
                    count++;
                    if (count === weekNumber) return date;
                }
                date.setDate(date.getDate() + 1);
            }
        } else { // Last
            const lastDayOfMonth = new Date(year, month + 1, 0, originalStartDate.getHours(), originalStartDate.getMinutes());
            while (lastDayOfMonth.getMonth() === month) {
                if (lastDayOfMonth.getDay() === dayOfWeek) return lastDayOfMonth;
                lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
            }
        }
        return null;
    };


  const handleMeetingSubmit = (data: Meeting, isSubmittedAsRecurring: boolean, recurrenceOptions?: RecurrenceOptions) => {
    if (editingMeeting && !isSubmittedAsRecurring) {
      setMeetings(prev => prev.map(m => m.id === data.id ? data : m));
      showToast("Meeting updated successfully!", "success");
    } else if (isSubmittedAsRecurring && recurrenceOptions) {
        const newMeetings: Meeting[] = [];
        const startDate = new Date(data.date);
        const recurrenceEndDateValue = new Date(recurrenceOptions.recurrenceEndDate);
        recurrenceEndDateValue.setHours(23,59,59,999);

        let currentDate = new Date(startDate);

        const meetingTemplate = { ...data };
        delete meetingTemplate.id;
        delete meetingTemplate.attendance;


        if (recurrenceOptions.frequency === 'daily') {
            while(currentDate <= recurrenceEndDateValue) {
                newMeetings.push({
                    ...meetingTemplate,
                    id: crypto.randomUUID(),
                    date: new Date(currentDate).toISOString().slice(0,16),
                    attendance: []
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else if (recurrenceOptions.frequency === 'weekly') {
            const selectedDays = recurrenceOptions.weeklyDays as number[];
            while(currentDate <= recurrenceEndDateValue) {
                if (selectedDays.includes(currentDate.getDay())) {
                     newMeetings.push({
                        ...meetingTemplate,
                        id: crypto.randomUUID(),
                        date: new Date(currentDate).toISOString().slice(0,16),
                        attendance: []
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else if (recurrenceOptions.frequency === 'monthly') {
            let loopDate = new Date(startDate);
            while(loopDate <= recurrenceEndDateValue) {
                let candidateDate: Date | null = null;
                if (recurrenceOptions.monthlyRepeatType === 'day') {
                    const dayOfMonth = recurrenceOptions.monthlyDay as number;
                    candidateDate = new Date(loopDate.getFullYear(), loopDate.getMonth(), dayOfMonth, startDate.getHours(), startDate.getMinutes());
                     if (candidateDate.getMonth() !== loopDate.getMonth()) { // Check if date rolled over (e.g., Feb 30th)
                        candidateDate = null;
                    }
                } else {
                    candidateDate = findNthWeekdayOfMonth(loopDate.getFullYear(), loopDate.getMonth(), recurrenceOptions.monthlyWeekday!, recurrenceOptions.monthlyWeekNumber!, startDate);
                }

                if (candidateDate && candidateDate >= startDate && candidateDate <= recurrenceEndDateValue) {
                     newMeetings.push({
                        ...meetingTemplate,
                        id: crypto.randomUUID(),
                        date: candidateDate.toISOString().slice(0,16),
                        attendance: []
                    });
                }
                loopDate.setMonth(loopDate.getMonth() + 1, 1); // Move to the first day of the next month
            }
        }
        setMeetings(prev => [...prev, ...newMeetings]);
        showToast(`${newMeetings.length} recurring meetings created.`, "success");

    } else { // New single meeting
      setMeetings(prev => [...prev, data]);
      showToast("Meeting created successfully!", "success");
    }
    setEditingMeeting(null);
  };

  const openEditMeetingModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setIsMeetingModalOpen(true);
  };

  const openNewMeetingModal = () => {
    setEditingMeeting(null);
    setIsMeetingModalOpen(true);
  }

  const handleDeleteMeeting = (id: string) => {
    confirmDelete("Are you sure you want to delete this meeting? All associated attendance records will also be removed.", () => {
      setMeetings(prev => prev.filter(m => m.id !== id));
      showToast("Meeting deleted.", "success");
    });
  };

  const openAttendanceModal = (meeting: Meeting) => {
    setCurrentMeetingForAttendance(meeting);
    const initialRecords: Record<string, AttendanceRecordState> = {};
    const meetingDateStr = meeting.date.split('T')[0];

    employees.forEach(emp => {
        const employeeIsOnLeave = leaves.some(l =>
            l.employeeId === emp.id &&
            meetingDateStr >= l.startDate &&
            meetingDateStr <= l.endDate
        );

        const existingRecord = meeting.attendance.find(a => a.employeeId === emp.id);

        if (employeeIsOnLeave) {
            initialRecords[emp.id] = {
                status: 'Excused Absent',
                remark: existingRecord?.remark || 'On Leave',
                isOnLeave: true
            };
        } else if (existingRecord) {
            initialRecords[emp.id] = {
                status: existingRecord.status,
                minutesLate: existingRecord.minutesLate,
                remark: existingRecord.remark,
                isOnLeave: false
            };
        } else {
            initialRecords[emp.id] = { status: '', isOnLeave: false };
        }
    });
    setAttendanceRecords(initialRecords);
    setIsAttendanceModalOpen(true);
  };

  const handleAttendanceChange = (employeeId: string, field: 'status' | 'minutesLate' | 'remark', value: string | number) => {
    setAttendanceRecords(prev => ({
        ...prev,
        [employeeId]: {
            ...prev[employeeId],
            [field]: value,
             minutesLate: field === 'status' && value !== 'Late' ? undefined : (field === 'minutesLate' ? Number(value) : prev[employeeId]?.minutesLate)

        }
    }));
  };

  const saveAttendance = () => {
    if (!currentMeetingForAttendance) return;
    const updatedAttendance = Object.entries(attendanceRecords)
        .filter(([_, record]) => record.status !== '') // Only save if a status is selected
        .map(([employeeId, record]) => ({
            employeeId,
            status: record.status,
            minutesLate: record.status === 'Late' ? Number(record.minutesLate) || 0 : undefined,
            remark: record.remark
        }));

    setMeetings(prevMeetings => prevMeetings.map(m =>
        m.id === currentMeetingForAttendance.id ? { ...m, attendance: updatedAttendance } : m
    ));
    setIsAttendanceModalOpen(false);
    setCurrentMeetingForAttendance(null);
    showToast("Attendance saved.", "success");
  };

  // Report Data Calculations
  const meetingsForReport = useMemo(() => {
    return meetings.filter(m => {
        const meetingDate = m.date.split('T')[0];
        const dateMatch = (!reportStartDate || meetingDate >= reportStartDate) &&
                          (!reportEndDate || meetingDate <= reportEndDate);
        if (!dateMatch) return false;

        if (filterEmployee) {
            // If filtering by employee, include the meeting if the employee was scheduled
            // or if they have an attendance record (they might have attended even if not initially scheduled, though less common)
            // For simplicity here, we assume if filterEmployee is set, we only care about their attendance.
            // This might need refinement if "scheduled" vs "attended" logic becomes more complex.
            return m.attendance.some(att => att.employeeId === filterEmployee) || employees.some(e => e.id === filterEmployee);
        }
        return true;
    });
  }, [meetings, reportStartDate, reportEndDate, filterEmployee, employees]);

  const reportKPIs = useMemo(() => {
    const totalEmployees = filterEmployee ? 1 : employees.length; // Count only filtered employee if one is selected
    const meetingsInRangeCount = meetingsForReport.length;

    let grandTotalScore = 0;
    let grandTotalScorableInstances = 0;

    const employeesToConsiderForRate = filterEmployee ? employees.filter(e => e.id === filterEmployee) : employees;

    meetingsForReport.forEach(m => {
        const meetingDateStr = m.date.split('T')[0];
        employeesToConsiderForRate.forEach(emp => {
            const employeeIsOnLeave = leaves.some(l =>
                l.employeeId === emp.id &&
                meetingDateStr >= l.startDate &&
                meetingDateStr <= l.endDate
            );

            if (!employeeIsOnLeave) {
                const record = m.attendance.find(a => a.employeeId === emp.id);
                const score = calculateMeetingScore(record);
                if (score !== null) {
                    grandTotalScore += score;
                    grandTotalScorableInstances++;
                }
            }
        });
    });

    const overallAttendanceRate = grandTotalScorableInstances > 0 ? (grandTotalScore / grandTotalScorableInstances * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const onLeaveTodayCount = (filterEmployee ? employees.filter(e=>e.id === filterEmployee) : employees).filter(emp =>
        leaves.some(l => l.employeeId === emp.id && today >= l.startDate && today <= l.endDate)
    ).length;

    return { totalEmployees, meetingsInRange: meetingsInRangeCount, overallAttendanceRate, onLeaveTodayCount };
  }, [employees, meetingsForReport, leaves, filterEmployee]);

  const overallAttendanceBreakdownData: ChartDataItem[] = useMemo(() => {
    const counts: Record<string, number> = {'On Time':0, 'Late':0, 'Excused Absent':0, 'Unexcused Absent':0, 'Not Applicable':0};
    meetingsForReport.forEach(m => {
        if (filterEmployee) {
            const record = m.attendance.find(a => a.employeeId === filterEmployee);
            if (record && counts[record.status] !== undefined) counts[record.status]++;
        } else {
            m.attendance.forEach(a => {
                if (counts[a.status] !== undefined) counts[a.status]++;
            });
        }
    });
    return Object.entries(counts).map(([name, value]) => ({name, value})).filter(item => item.value > 0);
  }, [meetingsForReport, filterEmployee]);

  const monthlyAttendanceTrendData: ChartDataItem[] = useMemo(() => {
    const monthlyData: Record<string, { totalScoreSum: number; scorableInstances: number}> = {};
    const employeesToConsider = filterEmployee ? employees.filter(e => e.id === filterEmployee) : employees;

    meetingsForReport.forEach(m => {
        const month = m.date.substring(0,7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = { totalScoreSum: 0, scorableInstances: 0};

        const meetingDateStr = m.date.split('T')[0];
        employeesToConsider.forEach(emp => {
            const employeeIsOnLeave = leaves.some(l =>
                l.employeeId === emp.id &&
                meetingDateStr >= l.startDate &&
                meetingDateStr <= l.endDate
            );
            if (!employeeIsOnLeave) {
                const record = m.attendance.find(a => a.employeeId === emp.id);
                const score = calculateMeetingScore(record);
                if (score !== null) {
                    monthlyData[month].totalScoreSum += score;
                    monthlyData[month].scorableInstances++;
                }
            }
        });
    });
    return Object.entries(monthlyData).map(([name, data]) => ({
        name, // month
        value: data.scorableInstances > 0 ? (data.totalScoreSum / data.scorableInstances * 100) : 0
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [meetingsForReport, employees, leaves, filterEmployee]);

  const individualPerformanceDataFull: IndividualPerfDataType[] = useMemo(() => {
    const targetEmployees = filterEmployee ? employees.filter(e => e.id === filterEmployee) : employees;
    const data = targetEmployees.map(emp => {
        const stats: Record<string, number> = {'On Time':0, 'Late':0, 'Excused Absent':0, 'Unexcused Absent':0, 'Not Applicable': 0};
        let empTotalScore = 0;
        let empScorableMeetings = 0;
        let totalMeetingsScheduledForEmployee = 0;

        meetingsForReport.forEach(m => {
            const meetingDateStr = m.date.split('T')[0];
            let relevantForThisEmployee = true;
            if (filterEmployee && emp.id !== filterEmployee) {
                 relevantForThisEmployee = false;
            }

            if(relevantForThisEmployee) {
                const employeeIsOnLeave = leaves.some(l =>
                    l.employeeId === emp.id &&
                    meetingDateStr >= l.startDate &&
                    meetingDateStr <= l.endDate
                );

                if (!employeeIsOnLeave) {
                    const record = m.attendance.find(a => a.employeeId === emp.id);
                    // Count total meetings scheduled for KPI denominator if not 'Not Applicable' or 'Excused Absent'
                    if (!record || (record.status !== 'Not Applicable' && record.status !== 'Excused Absent')) {
                         totalMeetingsScheduledForEmployee++;
                    }

                    if (record && stats[record.status] !== undefined) {
                        stats[record.status]++;
                    }

                    const score = calculateMeetingScore(record);
                    if (score !== null) { // Only count if scorable (On Time, Late, Unexcused, or no record)
                        empTotalScore += score;
                        empScorableMeetings++;
                    }
                } else { // Employee is on leave
                     stats['Excused Absent']++; // Count as excused for stats if on leave
                }
            }
        });
        const rate = empScorableMeetings > 0 ? (empTotalScore / empScorableMeetings * 100) : (totalMeetingsScheduledForEmployee > 0 ? 0 : 100); // 100% if no scorable meetings scheduled
        return {
            id: emp.id,
            name: emp.name,
            onTime: stats['On Time'],
            late: stats['Late'],
            excused: stats['Excused Absent'],
            unexcused: stats['Unexcused Absent'],
            notApplicable: stats['Not Applicable'],
            totalMeetingsScheduled: empScorableMeetings, // Use empScorableMeetings for scheduled count in this context
            rate,
            value: rate
        };
    });

    if(perfSortConfig.key){
        const sortKey = perfSortConfig.key as keyof IndividualPerfDataType;
        data.sort((a,b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if(typeof valA === 'string' && typeof valB === 'string') return perfSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            if(typeof valA === 'number' && typeof valB === 'number') return perfSortConfig.direction === 'asc' ? valA - valB : valB - valA;
            return 0;
        });
    }
    return data;
  }, [employees, meetingsForReport, leaves, perfSortConfig, filterEmployee]);

  const paginatedIndividualPerformanceData = useMemo(() => {
    const startIndex = (perfCurrentPage - 1) * perfItemsPerPage;
    return individualPerformanceDataFull.slice(startIndex, startIndex + perfItemsPerPage);
  }, [individualPerformanceDataFull, perfCurrentPage, perfItemsPerPage]);

  const individualPerformanceTableFooter = useMemo(() => {
    const totals: Omit<IndividualPerfDataType, 'id' | 'name' | 'value' | 'rate'> & { avgRate: number } = {
        onTime: 0, late: 0, excused: 0, unexcused: 0, notApplicable: 0, totalMeetingsScheduled: 0, avgRate: 0
    };
    individualPerformanceDataFull.forEach(item => {
        totals.onTime += item.onTime;
        totals.late += item.late;
        totals.excused += item.excused;
        totals.unexcused += item.unexcused;
        totals.notApplicable += item.notApplicable;
        totals.totalMeetingsScheduled += item.totalMeetingsScheduled;
    });
    const sumOfRates = individualPerformanceDataFull.reduce((sum, item) => sum + item.rate, 0);
    totals.avgRate = individualPerformanceDataFull.length > 0 ? sumOfRates / individualPerformanceDataFull.length : 0;
    return totals;
}, [individualPerformanceDataFull]);


  const individualChartDataMain: ChartDataItem[] = useMemo(() => {
    if (!individualChartEmployeeId) return [];
    const empPerformance = individualPerformanceDataFull.find(emp => emp.id === individualChartEmployeeId);
    if (!empPerformance) return [];

    return [
        { name: 'On Time', value: empPerformance.onTime },
        { name: 'Late', value: empPerformance.late },
        { name: 'Excused Absent', value: empPerformance.excused },
        { name: 'Unexcused Absent', value: empPerformance.unexcused },
        { name: 'Not Applicable', value: empPerformance.notApplicable },
    ].filter(item => item.value > 0);
  }, [individualPerformanceDataFull, individualChartEmployeeId]);

  // Meeting List Table Data
  const filteredMeetingsForTableFull = useMemo(() => {
    return meetings.filter(m => {
        const topicMatch = m.topic.toLowerCase().includes(meetingSearch.toLowerCase());
        const startDateMatch = !meetingDateStartFilter || m.date.split('T')[0] >= meetingDateStartFilter;
        const endDateMatch = !meetingDateEndFilter || m.date.split('T')[0] <= meetingDateEndFilter;

        let employeeFilterMatchForTable = true;
        if (filterEmployee) {
            employeeFilterMatchForTable = m.attendance.some(att => att.employeeId === filterEmployee) || employees.some(e => e.id === filterEmployee);
        }

        return topicMatch && startDateMatch && endDateMatch && employeeFilterMatchForTable;
    }).map(m => {
        const employeesToConsider = filterEmployee ? employees.filter(e => e.id === filterEmployee) : employees;
        const meetingDateStr = m.date.split('T')[0];

        let hasUnexcusedAbsent = false;
        let scorableAttendeesInMeeting = 0;
        let totalScoreForMeeting = 0;
        let allRelevantAreExcusedOrNA = true;
        let relevantAttendeesCountForMeeting = 0;

        employeesToConsider.forEach(emp => {
            const employeeIsOnLeave = leaves.some(l =>
                l.employeeId === emp.id &&
                meetingDateStr >= l.startDate &&
                meetingDateStr <= l.endDate
            );

            if (!employeeIsOnLeave) {
                relevantAttendeesCountForMeeting++;
                const record = m.attendance.find(a => a.employeeId === emp.id);

                if (record) {
                    if (record.status === 'Unexcused Absent') {
                        hasUnexcusedAbsent = true;
                    }
                    if (record.status !== 'Excused Absent' && record.status !== 'Not Applicable') {
                        allRelevantAreExcusedOrNA = false;
                    }
                } else { // No record and not on leave: considered Unexcused Absent
                    hasUnexcusedAbsent = true;
                    allRelevantAreExcusedOrNA = false;
                }
                
                const score = calculateMeetingScore(record);
                if (score !== null) {
                    totalScoreForMeeting += score;
                    scorableAttendeesInMeeting++;
                }
            }
        });

        let rate;
        if (relevantAttendeesCountForMeeting === 0) {
            rate = 100; // No one expected (after leave filter), so 100% attendance.
        } else if (allRelevantAreExcusedOrNA) {
            rate = 100; // All relevant attendees were explicitly Excused or NA
        } else if (!hasUnexcusedAbsent) {
            rate = 100;
        } else { 
            if (scorableAttendeesInMeeting > 0) {
                rate = (totalScoreForMeeting / scorableAttendeesInMeeting) * 100;
            } else {
                rate = 0; 
            }
        }
        return {...m, rate };
    });
  }, [meetings, meetingSearch, meetingDateStartFilter, meetingDateEndFilter, filterEmployee, employees, leaves]);

  const sortedMeetingsForTable = useMemo(() => {
    const data = [...filteredMeetingsForTableFull];
    if (meetingsSortConfig.key) {
        const sortKey = meetingsSortConfig.key;
        data.sort((a,b) => {
            if (sortKey === 'date') {
                return meetingsSortConfig.direction === 'asc' ? new Date(a.date).getTime() - new Date(b.date).getTime() : new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            const valA = a[sortKey];
            const valB = b[sortKey];
            if(typeof valA === 'string' && typeof valB === 'string') {
                 return meetingsSortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if(typeof valA === 'number' && typeof valB === 'number') {
                return meetingsSortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }
    return data;
  },[filteredMeetingsForTableFull, meetingsSortConfig]);

  const paginatedMeetingsForTable = useMemo(() => {
    const startIndex = (meetingListCurrentPage - 1) * meetingListItemsPerPage;
    return sortedMeetingsForTable.slice(startIndex, startIndex + meetingListItemsPerPage);
  }, [sortedMeetingsForTable, meetingListCurrentPage, meetingListItemsPerPage]);

  const meetingListTableFooter = useMemo(() => {
    const totalMeetings = sortedMeetingsForTable.length;
    const sumOfRates = sortedMeetingsForTable.reduce((sum, m) => sum + m.rate, 0);
    const averageRate = totalMeetings > 0 ? sumOfRates / totalMeetings : 0;
    return { totalMeetings, averageRate };
  }, [sortedMeetingsForTable]);

  const handleSort = <T,>(config: SortConfig<T>, setConfig: React.Dispatch<React.SetStateAction<SortConfig<T>>>, key: keyof T, setCurrentPageFn: React.Dispatch<React.SetStateAction<number>>) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (config.key === key && config.direction === 'asc') {
      direction = 'desc';
    }
    setConfig({ key, direction });
    setCurrentPageFn(1);
  };

  useEffect(() => {
    setPerfCurrentPage(1);
    setMeetingListCurrentPage(1); // Also reset meeting list table page if report employee filter changes
  }, [reportStartDate, reportEndDate, reportDatePreset, filterEmployee]);

  useEffect(() => {
    setMeetingListCurrentPage(1);
  }, [meetingSearch, meetingDateStartFilter, meetingDateEndFilter]); // filterEmployee already covered by above useEffect

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded shadow-lg border border-gray-700 text-sm">
          <p className="font-bold text-gray-200">{label || payload[0]?.payload?.name || 'Details'}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
              {`${entry.name}: ${entry.value.toLocaleString()}${entry.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const selectedEmployeeName = filterEmployee ? employees.find(e => e.id === filterEmployee)?.name : null;
  const overallAttendanceTitle = selectedEmployeeName ? `${selectedEmployeeName}'s Attendance Breakdown` : 'Overall Attendance Breakdown';
  const monthlyAttendanceTitle = selectedEmployeeName ? `${selectedEmployeeName}'s Monthly Attendance Trend` : 'Monthly Attendance Trend (All Filtered)';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Meeting Management</h2>
        <button onClick={openNewMeetingModal} className="btn-primary py-2 px-4 rounded-md flex items-center">
          <i className="fas fa-plus mr-2"></i>Create Meeting
        </button>
      </div>

      {/* Reports Section */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-bold mb-4 text-gray-200">Meeting Reports</h3>
        <div className="bg-gray-900 p-4 rounded-lg shadow mb-6 flex flex-wrap items-center gap-4">
            <h3 className="font-bold text-lg mr-4 text-gray-200">Report Filters</h3>
            <div className="flex items-center gap-2">
                <label htmlFor="meeting-report-date-preset" className="text-sm text-gray-300">Date Range:</label>
                <select id="meeting-report-date-preset" value={reportDatePreset} onChange={e => handleReportDatePresetChange(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200">
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
                <label htmlFor="meeting-report-start-date" className="text-sm text-gray-300">From:</label>
                <input type="date" id="meeting-report-start-date" value={reportStartDate} onChange={e => {setReportStartDate(e.target.value); setReportDatePreset('custom');}} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"/>
            </div>
            <div className={`flex items-center gap-2 ${reportDatePreset !== 'custom' ? 'hidden' : ''}`}>
                <label htmlFor="meeting-report-end-date" className="text-sm text-gray-300">To:</label>
                <input type="date" id="meeting-report-end-date" value={reportEndDate} onChange={e => {setReportEndDate(e.target.value); setReportDatePreset('custom');}} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200"/>
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor="meeting-report-employee-filter" className="text-sm text-gray-300">Employee:</label>
                <select
                    id="meeting-report-employee-filter"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Total Employees (Filtered)</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.totalEmployees}</p></div>
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Meetings in Range</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.meetingsInRange}</p></div>
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">Attendance Rate</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.overallAttendanceRate.toFixed(0)}%</p></div>
            <div className="bg-gray-800 p-5 rounded-lg shadow"><h3 className="text-sm font-medium text-gray-400">On Leave Today</h3><p className="text-3xl font-bold text-gray-100">{reportKPIs.onLeaveTodayCount}</p></div>
        </div>

        <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 mb-6`}>
            <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-200">{overallAttendanceTitle}</h3>
                    <select value={overallAttendanceChartType} onChange={(e) => setOverallAttendanceChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                        {CHART_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    {overallAttendanceChartType === 'bar' ? (
                        <BarChart data={overallAttendanceBreakdownData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false} />
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Bar dataKey="value" name="Count">
                                {overallAttendanceBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_ATTENDANCE[ATTENDANCE_STATUSES.indexOf(entry.name as AttendanceStatus) % COLORS_ATTENDANCE.length]} />)}
                            </Bar>
                        </BarChart>
                    ) : overallAttendanceChartType === 'line' ? (
                        <LineChart data={overallAttendanceBreakdownData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" allowDecimals={false}/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Line type="monotone" dataKey="value" name="Count" stroke={COLORS_ATTENDANCE[4]} activeDot={{ r: 6 }} />
                        </LineChart>
                    ) : ( (overallAttendanceChartType === 'pie' || overallAttendanceChartType === 'doughnut') &&
                        <PieChart>
                            <Pie data={overallAttendanceBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={overallAttendanceChartType === 'doughnut' ? 60 : 0} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {overallAttendanceBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_ATTENDANCE[ATTENDANCE_STATUSES.indexOf(entry.name as AttendanceStatus) % COLORS_ATTENDANCE.length]} />)}
                            </Pie>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
            <div className="bg-gray-800 p-5 rounded-lg shadow h-[400px]">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-200">{monthlyAttendanceTitle}</h3>
                    <select value={monthlyAttendanceChartType} onChange={(e) => setMonthlyAttendanceChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                        {TREND_CHART_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                 <ResponsiveContainer width="100%" height="90%">
                    {monthlyAttendanceChartType === 'bar' ? (
                        <BarChart data={monthlyAttendanceTrendData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" domain={[0,100]} unit="%"/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Bar dataKey="value" name="Avg. Attendance Rate" fill={COLORS_ATTENDANCE[4]} unit="%" />
                        </BarChart>
                    ) : ( // Line chart default
                        <LineChart data={monthlyAttendanceTrendData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                            <XAxis dataKey="name" stroke="#9ca3af"/>
                            <YAxis stroke="#9ca3af" domain={[0,100]} unit="%"/>
                            <Tooltip content={renderTooltip} />
                            <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            <Line type="monotone" dataKey="value" name="Avg. Attendance Rate" stroke={COLORS_ATTENDANCE[4]} strokeWidth={2} activeDot={{ r: 6 }} unit="%"/>
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-gray-800 p-5 rounded-lg shadow">
             <h3 className="font-bold mb-4 text-gray-200">
                {filterEmployee ? `${employees.find(e => e.id === filterEmployee)?.name || 'Selected Employee'}'s Attendance` : 'Individual Attendance Performance'}
            </h3>
            <div className={`grid grid-cols-1 ${settings.chartLayout === 'full-width' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                            <tr>
                                <SortableHeader label="Employee" sortKey="name" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} />
                                <SortableHeader label="On Time" sortKey="onTime" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                                <SortableHeader label="Late" sortKey="late" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                                <SortableHeader label="Excused" sortKey="excused" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                                <SortableHeader label="Unexcused" sortKey="unexcused" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                                <SortableHeader label="Total Meetings Sched." sortKey="totalMeetingsScheduled" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                                <SortableHeader label="Attendance Rate" sortKey="rate" sortConfig={perfSortConfig as SortConfig<IndividualPerfDataType>} onSort={key => handleSort(perfSortConfig, setPerfSortConfig, key as keyof IndividualPerfDataType, setPerfCurrentPage)} textCenter/>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedIndividualPerformanceData.map(emp => (
                                <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-medium">
                                        <button onClick={() => setIndividualChartEmployeeId(emp.id) } className="text-blue-400 hover:underline">{emp.name}</button>
                                    </td>
                                    <td className="p-3 text-center text-green-400">{emp.onTime}</td>
                                    <td className="p-3 text-center text-yellow-400">{emp.late}</td>
                                    <td className="p-3 text-center text-blue-400">{emp.excused}</td>
                                    <td className="p-3 text-center text-red-400">{emp.unexcused}</td>
                                    <td className="p-3 text-center">{emp.totalMeetingsScheduled}</td>
                                    <td className="p-3 text-center font-bold">{emp.rate.toFixed(0)}%</td>
                                </tr>
                            ))}
                            {paginatedIndividualPerformanceData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center p-4 text-gray-400">No performance data available.</td>
                                </tr>
                            )}
                        </tbody>
                        {individualPerformanceDataFull.length > 0 && (
                        <tfoot className="bg-gray-700 font-semibold text-gray-300">
                            <tr>
                                <td className="p-3">Filtered Totals / Avg.</td>
                                <td className="p-3 text-center text-green-400">{individualPerformanceTableFooter.onTime}</td>
                                <td className="p-3 text-center text-yellow-400">{individualPerformanceTableFooter.late}</td>
                                <td className="p-3 text-center text-blue-400">{individualPerformanceTableFooter.excused}</td>
                                <td className="p-3 text-center text-red-400">{individualPerformanceTableFooter.unexcused}</td>
                                <td className="p-3 text-center">{individualPerformanceTableFooter.totalMeetingsScheduled}</td>
                                <td className="p-3 text-center font-bold">{individualPerformanceTableFooter.avgRate.toFixed(0)}%</td>
                            </tr>
                        </tfoot>
                        )}
                    </table>
                     <PaginationControls
                        totalItems={individualPerformanceDataFull.length}
                        itemsPerPage={perfItemsPerPage}
                        currentPage={perfCurrentPage}
                        onPageChange={setPerfCurrentPage}
                        onItemsPerPageChange={setPerfItemsPerPage}
                        idPrefix="meeting-perf"
                    />
                </div>
                <div className="h-[400px]">
                     <div className="flex items-center justify-between gap-2 mb-2">
                         <h4 className="text-md font-semibold text-gray-200">
                            Status for: {employees.find(e => e.id === individualChartEmployeeId)?.name || 'Select Employee'}
                        </h4>
                        <select id="individual-chart-employee-select" value={individualChartEmployeeId} onChange={e => setIndividualChartEmployeeId(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 text-sm text-gray-200">
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <select value={individualEmployeeChartType} onChange={(e) => setIndividualEmployeeChartType(e.target.value as ChartDisplayType)} className="bg-gray-700 text-xs p-1 rounded">
                            {INDIVIDUAL_STATUS_CHART_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height="90%">
                        {individualEmployeeChartType === 'bar' ? (
                            <BarChart data={individualChartDataMain}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                <XAxis dataKey="name" stroke="#9ca3af"/>
                                <YAxis stroke="#9ca3af" allowDecimals={false}/>
                                <Tooltip content={renderTooltip}/>
                                <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                                <Bar dataKey="value" name="Status Count">
                                    {individualChartDataMain.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_ATTENDANCE[ATTENDANCE_STATUSES.indexOf(entry.name as AttendanceStatus) % COLORS_ATTENDANCE.length]} />)}
                                </Bar>
                            </BarChart>
                        ) : ( (individualEmployeeChartType === 'pie' || individualEmployeeChartType === 'doughnut') &&
                            <PieChart>
                                <Pie data={individualChartDataMain} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={individualEmployeeChartType === 'doughnut' ? 60 : 0} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {individualChartDataMain.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_ATTENDANCE[ATTENDANCE_STATUSES.indexOf(entry.name as AttendanceStatus) % COLORS_ATTENDANCE.length]} />)}
                                </Pie>
                                <Tooltip content={renderTooltip}/>
                                <Legend wrapperStyle={{color: '#e5e7eb'}}/>
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* Meeting List Section */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-xl font-bold mb-4 text-gray-200">Meeting List {filterEmployee ? `(Filtered for ${employees.find(e => e.id === filterEmployee)?.name || 'Employee'})` : ''}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" value={meetingSearch} onChange={e => setMeetingSearch(e.target.value)} placeholder="Search meetings by topic..." className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            <input type="date" value={meetingDateStartFilter} onChange={e => setMeetingDateStartFilter(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200"/>
            <input type="date" value={meetingDateEndFilter} onChange={e => setMeetingDateEndFilter(e.target.value)} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 text-gray-200"/>
        </div>
        <table className="w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400">
                <tr>
                    <SortableHeader label="Topic" sortKey="topic" sortConfig={meetingsSortConfig} onSort={key => handleSort(meetingsSortConfig, setMeetingsSortConfig, key as keyof (Meeting & { rate: number }), setMeetingListCurrentPage)} />
                    <SortableHeader label="Date" sortKey="date" sortConfig={meetingsSortConfig} onSort={key => handleSort(meetingsSortConfig, setMeetingsSortConfig, key as keyof (Meeting & { rate: number }), setMeetingListCurrentPage)} />
                    <SortableHeader label="Avg. Attendance Rate" sortKey="rate" sortConfig={meetingsSortConfig} onSort={key => handleSort(meetingsSortConfig, setMeetingsSortConfig, key as keyof (Meeting & { rate: number }), setMeetingListCurrentPage)} textCenter />
                    <th className="p-3">Actions</th>
                </tr>
            </thead>
            <tbody>
                {paginatedMeetingsForTable.map(m => (
                    <tr key={m.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{m.topic}</td>
                        <td className="p-3">{new Date(m.date).toLocaleString()}</td>
                        <td className="p-3 text-center">{m.rate.toFixed(0)}%</td>
                        <td className="p-3 space-x-2">
                            <button onClick={() => openAttendanceModal(m)} className="text-green-400 hover:text-green-300" title="Manage Attendance"><i className="fas fa-user-check"></i></button>
                            <button onClick={() => openEditMeetingModal(m)} className="text-blue-400 hover:text-blue-300" title="Edit Meeting"><i className="fas fa-edit"></i></button>
                            <button onClick={() => handleDeleteMeeting(m.id)} className="text-red-400 hover:text-red-300" title="Delete Meeting"><i className="fas fa-trash"></i></button>
                        </td>
                    </tr>
                ))}
                {paginatedMeetingsForTable.length === 0 && (
                     <tr>
                        <td colSpan={4} className="text-center p-4 text-gray-400">No meetings found.</td>
                    </tr>
                )}
            </tbody>
            {sortedMeetingsForTable.length > 0 && (
                <tfoot className="bg-gray-700 font-semibold text-gray-300">
                    <tr>
                        <td className="p-3">Filtered Totals: {meetingListTableFooter.totalMeetings} meetings</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-center">Avg. Rate: {meetingListTableFooter.averageRate.toFixed(0)}%</td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            )}
        </table>
        <PaginationControls
            totalItems={sortedMeetingsForTable.length}
            itemsPerPage={meetingListItemsPerPage}
            currentPage={meetingListCurrentPage}
            onPageChange={setMeetingListCurrentPage}
            onItemsPerPageChange={setMeetingListItemsPerPage}
            idPrefix="meeting-list"
        />
      </div>

      <MeetingForm
        isOpen={isMeetingModalOpen}
        onClose={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); }}
        onSubmit={handleMeetingSubmit}
        initialData={editingMeeting}
        existingMeetings={meetings}
        showToast={showToast}
      />

      {currentMeetingForAttendance && (
        <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title={`Manage Attendance: ${currentMeetingForAttendance.topic}`} size="lg">
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                {employees.map(emp => {
                    const record = attendanceRecords[emp.id] || { status: '', isOnLeave: false };
                    const employeeIsOnLeave = record.isOnLeave;
                    return (
                        <div key={emp.id} className="p-3 bg-gray-700 rounded-md">
                            <div className="flex items-center justify-between gap-4 mb-2">
                                <span className="flex-1 font-medium text-gray-200">
                                  {emp.name}
                                  {employeeIsOnLeave && <span className="text-xs text-yellow-400 ml-2">(On Leave)</span>}
                                </span>
                                <div className="w-1/3">
                                    <select
                                        value={record.status}
                                        onChange={e => handleAttendanceChange(emp.id, 'status', e.target.value as AttendanceStatus)}
                                        className="w-full p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200"
                                        disabled={employeeIsOnLeave}
                                    >
                                        <option value="">Select...</option>
                                        {ATTENDANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Remarks..."
                                    value={record.remark || ''}
                                    onChange={e => handleAttendanceChange(emp.id, 'remark', e.target.value)}
                                    className="flex-1 p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200"
                                    disabled={employeeIsOnLeave && record.remark === 'On Leave'}
                                />
                            </div>
                           {record.status === 'Late' && !employeeIsOnLeave && (
                                <div className="ml-auto w-2/3 flex items-center gap-2 pl-[calc(33%+1rem)]"> {/* Approximate alignment */}
                                    <label htmlFor={`minutes-late-${emp.id}`} className="text-sm text-gray-300">Mins Late:</label>
                                    <input
                                        type="number"
                                        id={`minutes-late-${emp.id}`}
                                        value={record.minutesLate || ''}
                                        onChange={e => handleAttendanceChange(emp.id, 'minutesLate', parseInt(e.target.value))}
                                        min="0"
                                        className="w-full p-2 bg-gray-600 rounded-md border border-gray-500 text-gray-200"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsAttendanceModalOpen(false)} className="btn-secondary py-2 px-4 rounded-md">Cancel</button>
                <button type="button" onClick={saveAttendance} className="btn-primary py-2 px-4 rounded-md">Save Attendance</button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default MeetingsTab;
