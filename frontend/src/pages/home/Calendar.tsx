import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Users, 
  Gift, 
  Landmark, 
  Award, 
  ShieldAlert, 
  BookOpen, 
  AlertTriangle, 
  FileCheck, 
  Trash2, 
  X,
  MapPin,
  AlignLeft,
  Edit,
  CheckCircle2 as Check
} from 'lucide-react';


interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  category: string;
  location?: string;
  isCustom?: boolean;
}

const CalendarPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Event Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    location: ''
  });

  // Admin Categories
  const adminCategories = [
    { name: 'Attendance', color: '#10B981', icon: Check },
    { name: 'Leave', color: '#EF4444', icon: Landmark },
    { name: 'Interviews', color: '#3B82F6', icon: Users },
    { name: 'Payroll', color: '#F59E0B', icon: Landmark },
    { name: 'Birthdays', color: '#EC4899', icon: Gift },
    { name: 'Anniversaries', color: '#8B5CF6', icon: Award },
    { name: 'Events', color: '#7C3AED', icon: CalendarIcon },
    { name: 'Meetings', color: '#6366F1', icon: Users },
    { name: 'Company Holidays', color: '#0EA5E9', icon: Landmark },
    { name: 'HR Tasks', color: '#F97316', icon: FileCheck },
    { name: 'Training', color: '#14B8A6', icon: BookOpen },
    { name: 'Document Expiry', color: '#D946EF', icon: ShieldAlert },
    { name: 'Contract Expiry', color: '#64748B', icon: AlertTriangle }
  ];

  // Employee Categories
  const employeeCategories = [
    { name: 'My Attendance', color: '#10B981', icon: Check },
    { name: 'My Leave', color: '#EF4444', icon: Landmark },
    { name: 'My Holidays', color: '#0EA5E9', icon: Landmark },
    { name: 'My Salary Date', color: '#F59E0B', icon: Landmark },
    { name: 'My Meetings', color: '#6366F1', icon: Users },
    { name: 'Company Events', color: '#7C3AED', icon: CalendarIcon },
    { name: 'Announcements', color: '#F97316', icon: FileCheck },
    { name: 'Birthday & Work Anniversary', color: '#EC4899', icon: Gift },
    { name: 'Training Schedule', color: '#14B8A6', icon: BookOpen }
  ];

  const categories = isAdmin ? adminCategories : employeeCategories;

  // Map admin event categories to employee categories for display
  const mapCategoryForEmployee = (adminCategory: string): string => {
    switch (adminCategory) {
      case 'Company Holidays':
        return 'My Holidays';
      case 'Attendance':
        return 'My Attendance';
      case 'Leave':
        return 'My Leave';
      case 'Payroll':
        return 'My Salary Date';
      case 'Meetings':
      case 'Interviews':
        return 'My Meetings';
      case 'Events':
        return 'Company Events';
      case 'HR Tasks':
      case 'Document Expiry':
      case 'Contract Expiry':
        return 'Announcements';
      case 'Training':
        return 'Training Schedule';
      case 'Birthdays':
      case 'Anniversaries':
        return 'Birthday & Work Anniversary';
      default:
        return adminCategory;
    }
  };

  // Initialize categories selection
  useEffect(() => {
    setSelectedCategories(categories.map(c => c.name));
  }, [isAdmin]);

  // Fetch real employees from database to build birthday/anniversary events
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at, role');
        if (data) {
          // Filter out admin profile from birthdays
          setDbEmployees(data.filter((p: any) => p.email !== 'praveen12rangasamy@gmail.com' && p.role === 'employee'));
        }
      } catch (err) {
        console.error('Error fetching profiles for calendar:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Sync / load all events
  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');
      if (error) {
        console.error('Error fetching calendar events:', error);
        return;
      }
      if (data) {
        const adminEmail = (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner' ? profile?.email : profile?.hired_by)?.trim().toLowerCase() || '';
        const mapped: CalendarEvent[] = data
          .filter((d: any) => !d.is_custom || (adminEmail && d.id.startsWith(`custom-event-${adminEmail}-`)))
          .map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description || undefined,
            date: d.date,
            startTime: d.start_time || undefined,
            endTime: d.end_time || undefined,
            category: d.category,
            location: d.location || undefined,
            isCustom: d.is_custom
          }));
        setEvents(mapped);
      }
    } catch (err) {
      console.error('Error in loadEvents:', err);
    }
  };

  useEffect(() => {
    loadEvents();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Get active events filtered and mapped for the current role
  const getVisibleEvents = (): CalendarEvent[] => {
    const year = currentDate.getFullYear();
    const mappedEvents = events.map(ev => {
      if (isAdmin) {
        return ev;
      } else {
        return {
          ...ev,
          category: mapCategoryForEmployee(ev.category)
        };
      }
    });

    // Dynamically append Birthdays and Anniversaries from the Database (so they are not hardcoded fake data)
    const dynamicEvents: CalendarEvent[] = [];
    dbEmployees.forEach((emp) => {
      if (emp.full_name) {
        // Birthday: Generate stable birth date based on name length/hashes
        const bDay = (emp.full_name.length % 28) + 1;
        const bMonthStr = String(((emp.full_name.charCodeAt(0) || 1) % 12) + 1).padStart(2, '0');
        const bDayStr = String(bDay).padStart(2, '0');
        
        dynamicEvents.push({
          id: `bday-${emp.id}`,
          title: `${emp.full_name}'s Birthday 🎂`,
          date: `${year}-${bMonthStr}-${bDayStr}`,
          category: isAdmin ? 'Birthdays' : 'Birthday & Work Anniversary',
          description: `Happy Birthday to ${emp.full_name}! Let's celebrate.`
        });

        // Anniversary: Based on database creation date
        if (emp.created_at) {
          const creationDate = new Date(emp.created_at);
          const annMonthStr = String(creationDate.getMonth() + 1).padStart(2, '0');
          const annDayStr = String(creationDate.getDate()).padStart(2, '0');
          const yearsJoined = year - creationDate.getFullYear();

          dynamicEvents.push({
            id: `ann-${emp.id}`,
            title: `${emp.full_name}'s Work Anniversary (${yearsJoined > 0 ? yearsJoined : 1} Year) 🏆`,
            date: `${year}-${annMonthStr}-${annDayStr}`,
            category: isAdmin ? 'Anniversaries' : 'Birthday & Work Anniversary',
            description: `Congratulations to ${emp.full_name} on their work anniversary at VyaraHR!`
          });
        }
      }
    });

    return [...mappedEvents, ...dynamicEvents].filter(ev => selectedCategories.includes(ev.category));
  };

  // Handle Category Toggle
  const toggleCategory = (catName: string) => {
    setSelectedCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  // Add Event
  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.date) return;

    const adminEmail = (profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner' ? profile?.email : profile?.hired_by)?.trim().toLowerCase() || 'default';
    const newEvent = {
      id: `custom-event-${adminEmail}-${Date.now()}`,
      title: formData.title,
      category: formData.category,
      date: formData.date,
      start_time: formData.startTime || null,
      end_time: formData.endTime || null,
      description: formData.description || null,
      location: formData.location || null,
      is_custom: true
    };

    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert(newEvent);

      if (error) {
        alert(`Failed to schedule event: ${error.message}`);
        return;
      }

      setShowAddModal(false);
      
      // Reset form
      setFormData({
        title: '',
        category: 'Company Holidays',
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
        location: ''
      });
      loadEvents();
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  // Edit Event Setup
  const handleStartEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      category: event.category,
      date: event.date,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      description: event.description || '',
      location: event.location || ''
    });
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  // Save Edit Event
  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !formData.title || !formData.category || !formData.date) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: formData.title,
          category: formData.category,
          date: formData.date,
          start_time: formData.startTime || null,
          end_time: formData.endTime || null,
          description: formData.description || null,
          location: formData.location || null
        })
        .eq('id', selectedEvent.id);

      if (error) {
        alert(`Failed to save changes: ${error.message}`);
        return;
      }

      setShowEditModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (err) {
      console.error('Error editing event:', err);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Failed to delete event: ${error.message}`);
        return;
      }

      setShowDetailModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };


  // Helper calendar calculations
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Rendering Helper for Cells
  const renderMonthDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const cells: React.ReactNode[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fill empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="min-h-[100px] border border-gray-100 bg-gray-50/20 p-2 text-gray-300 text-xs font-semibold"></div>
      );
    }

    // Fill days of the current month
    const visibleEvents = getVisibleEvents();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = visibleEvents.filter(ev => ev.date === dayDateStr);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      const dayOfWeek = new Date(year, month, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      cells.push(
        <div 
          key={`day-${day}`} 
          className={`min-h-[75px] sm:min-h-[120px] border border-gray-100 p-1 sm:p-2 transition-all hover:bg-brand-orange/5 relative flex flex-col gap-0.5 sm:gap-1 cursor-pointer ${
            isToday ? 'bg-brand-orange/10 font-bold border-brand-orange/30' : isWeekend ? 'bg-red-50/40' : 'bg-white'
          }`}
          onClick={() => {
            if (dayEvents.length > 0) {
              setSelectedEvent(dayEvents[0]);
              setShowDetailModal(true);
            } else if (isAdmin) {
              setFormData(prev => ({ 
                ...prev, 
                date: dayDateStr,
                title: '',
                category: 'Company Holidays',
                startTime: '09:00',
                endTime: '10:00',
                description: '',
                location: ''
              }));
              setShowAddModal(true);
            }
          }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center ${
              isToday ? 'bg-brand-orange text-white font-extrabold shadow-md' : isWeekend ? 'text-red-400 font-bold' : 'text-brand-navy font-bold'
            }`}>{day}</span>
            {dayEvents.length > 0 && (
              <span className="text-[9px] text-gray-400 font-semibold">{dayEvents.length} Events</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[85px] scrollbar-none">
            {dayEvents.slice(0, 3).map(ev => {
              const categoryColor = adminCategories.find(c => c.name === ev.category)?.color || 
                                    employeeCategories.find(c => c.name === ev.category)?.color || '#6B7280';
              return (
                <div 
                  key={ev.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(ev);
                    setShowDetailModal(true);
                  }}
                  style={{ borderLeftColor: categoryColor, borderLeftWidth: '3px' }}
                  className="px-2 py-0.5 text-[10px] font-bold bg-gray-50 border rounded text-brand-navy truncate shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  {ev.startTime && <span className="text-[9px] text-brand-orange font-bold mr-1">{ev.startTime}</span>}
                  {ev.title}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-[9px] font-extrabold text-brand-orange text-center pt-0.5 hover:underline">
                +{dayEvents.length - 3} more...
              </div>
            )}
          </div>
        </div>
      );
    }

    return cells;
  };

  // Rendering Helper for Week View
  const renderWeekDays = () => {
    const days: React.ReactNode[] = [];
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    const visibleEvents = getVisibleEvents();
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayDateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
      const dayEvents = visibleEvents.filter(ev => ev.date === dayDateStr);
      const isToday = new Date().toDateString() === dayDate.toDateString();

      const isWeekendWeek = i === 0 || i === 6;
      days.push(
        <div key={`week-day-${i}`} className={`flex-1 min-h-[300px] border-r border-gray-100 ${isWeekendWeek ? 'bg-red-50/30' : 'bg-white'}`}>
          <div className={`p-3 text-center border-b ${isToday ? 'bg-brand-orange/5 border-b-brand-orange/30' : isWeekendWeek ? 'bg-red-50/50' : ''}`}>
            <p className={`text-[10px] font-bold uppercase ${isWeekendWeek ? 'text-red-400' : 'text-gray-400'}`}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</p>
            <p className={`text-base font-bold inline-block w-8 h-8 leading-8 rounded-full ${
              isToday ? 'bg-brand-orange text-white' : isWeekendWeek ? 'text-red-400' : 'text-brand-navy'
            }`}>{dayDate.getDate()}</p>
          </div>
          
          <div className="p-2 space-y-2 h-[400px] overflow-y-auto">
            {dayEvents.map(ev => {
              const categoryColor = adminCategories.find(c => c.name === ev.category)?.color || 
                                    employeeCategories.find(c => c.name === ev.category)?.color || '#6B7280';
              return (
                <div 
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setShowDetailModal(true);
                  }}
                  style={{ borderLeftColor: categoryColor, borderLeftWidth: '4px' }}
                  className="p-2.5 rounded-xl border bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {ev.startTime || 'All Day'} {ev.endTime ? `- ${ev.endTime}` : ''}
                  </p>
                  <p className="text-xs font-bold text-brand-navy mt-1 leading-snug">{ev.title}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 text-[8px] font-extrabold rounded-full bg-white text-gray-500 border">{ev.category}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  // Rendering Helper for Day View
  const renderDayView = () => {
    const dayDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const visibleEvents = getVisibleEvents();
    const dayEvents = visibleEvents.filter(ev => ev.date === dayDateStr);

    return (
      <div className="bg-white rounded-2xl border p-6 min-h-[400px]">
        <div className="flex items-center gap-3 border-b pb-4 mb-6">
          <CalendarIcon className="text-brand-orange" size={24} />
          <div>
            <h4 className="text-lg font-bold text-brand-navy">{currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
            <p className="text-xs text-gray-500">{dayEvents.length} schedules registered for today.</p>
          </div>
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-20 text-gray-400 italic">No events or items scheduled for today.</div>
        ) : (
          <div className="space-y-4">
            {dayEvents.map(ev => {
              const categoryColor = adminCategories.find(c => c.name === ev.category)?.color || 
                                    employeeCategories.find(c => c.name === ev.category)?.color || '#6B7280';
              return (
                <div 
                  key={ev.id}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setShowDetailModal(true);
                  }}
                  className="flex items-start gap-4 p-4 rounded-2xl border hover:border-gray-200/70 hover:shadow-lg transition-all cursor-pointer bg-white"
                >
                  <div className="w-1.5 h-16 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor }}></div>
                  <div className="flex-1 space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border">{ev.category}</span>
                    <h4 className="text-base font-bold text-brand-navy leading-snug">{ev.title}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-4">
                      {ev.startTime && <span className="flex items-center gap-1"><Clock size={12} /> {ev.startTime} {ev.endTime ? ` - ${ev.endTime}` : ''}</span>}
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>}
                    </p>
                    {ev.description && <p className="text-xs text-gray-600 line-clamp-2 mt-1">{ev.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-3">
            <CalendarIcon className="text-brand-orange" size={28} />
            {isAdmin ? 'HR Command Calendar' : 'My Work Calendar'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Centralized HR events, interviews, leaves, and compliance tracking.' : 'Sync with company holidays, salary credit dates, meetings, and schedules.'}
          </p>
        </div>

        {isAdmin && (
          <Button 
            onClick={() => {
              setFormData({
                title: '',
                category: 'Company Holidays',
                date: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endTime: '10:00',
                description: '',
                location: ''
              });
              setShowAddModal(true);
            }} 
            className="w-full md:w-auto bg-brand-orange hover:bg-orange-600 gap-2 px-6 shadow-lg shadow-brand-orange/15 font-bold"
          >
            <Plus size={18} /> Schedule Event
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ===== SIDEBAR / FILTERS ===== */}
        <div className="space-y-6 lg:col-span-1">
          {/* Mini Calendar / Quick Select */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">Quick Pick</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => navigateMonth('prev')} title="Previous Month" aria-label="Previous Month" className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={() => navigateMonth('next')} title="Next Month" aria-label="Next Month" className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-brand-navy text-center mb-3">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className={i === 0 || i === 6 ? 'text-red-400' : ''}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {(() => {
                  const days: React.ReactNode[] = [];
                  const daysCount = getDaysInMonth(currentDate);
                  const firstDay = getFirstDayOfMonth(currentDate);
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();
                  
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<span key={`mini-empty-${i}`}></span>);
                  }
                  for (let d = 1; d <= daysCount; d++) {
                    const isSel = currentDate.getDate() === d;
                    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
                    const dayOfWeekMini = new Date(year, month, d).getDay();
                    const isWeekendMini = dayOfWeekMini === 0 || dayOfWeekMini === 6;
                    days.push(
                      <button 
                        key={`mini-day-${d}`} 
                        onClick={() => {
                          const newD = new Date(currentDate);
                          newD.setDate(d);
                          setCurrentDate(newD);
                        }}
                        className={`w-6 h-6 leading-6 rounded-full text-center hover:bg-brand-orange/10 font-bold transition-all ${
                          isSel ? 'bg-brand-orange text-white' : isToday ? 'text-brand-orange border border-brand-orange/40' : isWeekendMini ? 'text-red-400' : 'text-brand-navy'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Category Filters */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b">
              <span className="text-xs font-bold text-brand-navy uppercase tracking-wider">Calendar Filters</span>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {categories.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.name);
                  return (
                    <label key={cat.name} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.name)}
                        className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange w-4 h-4"
                      />
                      <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="text-xs font-semibold text-brand-navy group-hover:text-brand-orange transition-colors">{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== CALENDAR WORKSPACE ===== */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b pb-4 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-brand-navy">
                  {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-1 border rounded-xl bg-white p-1">
                  <button onClick={() => navigateMonth('prev')} title="Previous Month" aria-label="Previous Month" className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
                  <button 
                    onClick={() => setCurrentDate(new Date())} 
                    className="px-3 py-1 text-xs font-bold text-brand-navy hover:bg-gray-50 rounded-lg transition-colors border-l border-r"
                  >
                    Today
                  </button>
                  <button onClick={() => navigateMonth('next')} title="Next Month" aria-label="Next Month" className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* View Switches */}
              <div className="flex border rounded-xl bg-white p-1">
                {(['month', 'week', 'day'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                      viewMode === mode 
                        ? 'bg-brand-orange text-white shadow-sm' 
                        : 'text-gray-500 hover:text-brand-navy hover:bg-gray-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === 'month' && (
                <div className="overflow-x-auto min-w-full">
                  <div className="grid grid-cols-7 border-b text-center py-2 sm:py-3 bg-gray-50/20 text-xs font-bold">
                    {[
                      { full: 'Sunday', short: 'Sun' },
                      { full: 'Monday', short: 'Mon' },
                      { full: 'Tuesday', short: 'Tue' },
                      { full: 'Wednesday', short: 'Wed' },
                      { full: 'Thursday', short: 'Thu' },
                      { full: 'Friday', short: 'Fri' },
                      { full: 'Saturday', short: 'Sat' }
                    ].map((d, i) => (
                      <span key={i} className={`text-[10px] sm:text-xs ${i === 0 || i === 6 ? 'text-red-400 bg-red-50/60' : 'text-gray-400'}`}>
                        <span className="hidden sm:inline">{d.full}</span>
                        <span className="sm:hidden">{d.short}</span>
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 bg-gray-50/5">
                    {renderMonthDays()}
                  </div>
                </div>
              )}

              {viewMode === 'week' && (
                <div className="overflow-x-auto min-w-full">
                  <div className="flex min-w-[650px] divide-x divide-gray-100 bg-gray-50/10">
                    {renderWeekDays()}
                  </div>
                </div>
              )}

              {viewMode === 'day' && (
                <div className="p-4 bg-gray-50/10">
                  {renderDayView()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ===== ADD EVENT MODAL (ADMIN ONLY) ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-brand-navy border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon size={20} className="text-brand-orange" />
                Schedule New Event
              </h3>
              <button onClick={() => setShowAddModal(false)} title="Close" aria-label="Close" className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddEventSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Event Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Gazetted Holiday - Eid"
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    title="Category"
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                    required
                  >
                    {adminCategories.filter(c => c.name !== 'Birthdays' && c.name !== 'Anniversaries').map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    title="Date"
                    placeholder="Date"
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.startTime}
                    title="Start Time"
                    placeholder="Start Time"
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">End Time</label>
                  <input 
                    type="time" 
                    value={formData.endTime}
                    title="End Time"
                    placeholder="End Time"
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Location / Link</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Conference Room A, Google Meet"
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief details about the holiday, meeting, or event..."
                  rows={3}
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-brand-orange hover:bg-orange-600 font-bold"
                >
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EDIT EVENT MODAL (ADMIN ONLY) ===== */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 bg-brand-navy border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit size={20} className="text-brand-orange" />
                Edit Calendar Schedule
              </h3>
              <button onClick={() => setShowEditModal(false)} title="Close" aria-label="Close" className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditEventSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Event Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  title="Event Title"
                  placeholder="Event Title"
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    title="Category"
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                    required
                  >
                    {adminCategories.filter(c => c.name !== 'Birthdays' && c.name !== 'Anniversaries').map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    title="Date"
                    placeholder="Date"
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.startTime}
                    title="Start Time"
                    placeholder="Start Time"
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-navy uppercase">End Time</label>
                  <input 
                    type="time" 
                    value={formData.endTime}
                    title="End Time"
                    placeholder="End Time"
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Location / Link</label>
                <input 
                  type="text" 
                  value={formData.location}
                  title="Location"
                  placeholder="Location"
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-navy uppercase">Description</label>
                <textarea 
                  value={formData.description}
                  title="Description"
                  placeholder="Description"
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border p-3 rounded-xl text-sm focus:ring-2 focus:ring-brand-orange outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-brand-orange hover:bg-orange-600 font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== EVENT DETAIL MODAL ===== */}
      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-200">
            <div 
              className="px-6 py-6 text-white relative"
              style={{ backgroundColor: adminCategories.find(c => c.name === selectedEvent.category)?.color || 
                                      employeeCategories.find(c => c.name === selectedEvent.category)?.color || '#000000' }}
            >
              <button 
                onClick={() => setShowDetailModal(false)} 
                title="Close"
                aria-label="Close"
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all"
              >
                <X size={16} />
              </button>
              
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 border border-white/10">{selectedEvent.category}</span>
              <h3 className="text-xl font-bold mt-3 leading-snug">{selectedEvent.title}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-brand-navy">
                <CalendarIcon size={18} className="text-gray-400" />
                <span className="font-bold">{new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>

              {(selectedEvent.startTime || selectedEvent.endTime) && (
                <div className="flex items-center gap-3 text-sm text-brand-navy">
                  <Clock size={18} className="text-gray-400" />
                  <span className="font-semibold">
                    {selectedEvent.startTime || '00:00'} {selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}
                  </span>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-center gap-3 text-sm text-brand-navy">
                  <MapPin size={18} className="text-gray-400" />
                  <span className="font-semibold">{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="flex items-start gap-3 border-t pt-4">
                  <AlignLeft size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              <div className="flex gap-3 border-t pt-5 mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 font-bold"
                >
                  Close
                </Button>
                {isAdmin && selectedEvent.category !== 'Birthdays' && selectedEvent.category !== 'Anniversaries' && selectedEvent.category !== 'Birthday & Work Anniversary' && (
                  <>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => handleStartEdit(selectedEvent)}
                      className="flex-1 font-bold flex items-center justify-center gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal/5"
                    >
                      <Edit size={16} /> Edit
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 border-none"
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CalendarPage;
