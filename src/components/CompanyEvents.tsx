'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyMemoryRecord } from '../types/infrastructure';

interface CompanyEventsProps {
  companyId: string;
}

interface CompanyEvent {
  id: string;
  title: string;
  description: string;
  type: 'milestone' | 'meeting' | 'deployment' | 'incident' | 'announcement' | 'other';
  date: Date;
  participants?: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export const CompanyEvents: React.FC<CompanyEventsProps> = ({ companyId }) => {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newEvent, setNewEvent] = useState<Partial<CompanyEvent>>({
    title: '',
    description: '',
    type: 'other',
    date: new Date(),
    participants: [],
    status: 'scheduled',
    priority: 'medium'
  });
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    loadCompanyAndEvents();
  }, [companyId]);

  const loadCompanyAndEvents = async () => {
    try {
      setLoading(true);
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
        // Load events from company metadata or create sample events
        const existingEvents = foundCompany.metadata?.events || generateSampleEvents(foundCompany);
        setEvents(existingEvents);
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleEvents = (company: CompanyMemoryRecord): CompanyEvent[] => {
    const now = new Date();
    const sampleEvents = [
      {
        title: 'Company Foundation',
        description: `${company.name} was officially established`,
        type: 'milestone' as const,
        date: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        status: 'completed' as const,
        priority: 'high' as const
      },
      {
        title: 'Q4 All-Hands Meeting',
        description: 'Quarterly company-wide meeting to discuss progress and goals',
        type: 'meeting' as const,
        date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        status: 'scheduled' as const,
        priority: 'medium' as const,
        participants: ['All Staff']
      },
      {
        title: 'Infrastructure Deployment',
        description: 'Deploy new infrastructure components to production',
        type: 'deployment' as const,
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'scheduled' as const,
        priority: 'high' as const,
        participants: ['DevOps Team', 'Engineering Team']
      },
      {
        title: 'Security Audit Complete',
        description: 'Annual security audit completed successfully',
        type: 'milestone' as const,
        date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
        status: 'completed' as const,
        priority: 'high' as const
      }
    ];

    return sampleEvents.map((event, index) => ({
      id: `event-${index + 1}`,
      ...event,
      participants: event.participants || [],
      createdAt: new Date(now.getTime() - index * 24 * 60 * 60 * 1000)
    }));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.description) return;
    
    const event: CompanyEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      description: newEvent.description,
      type: newEvent.type || 'other',
      date: newEvent.date || new Date(),
      participants: newEvent.participants || [],
      status: newEvent.status || 'scheduled',
      priority: newEvent.priority || 'medium',
      createdAt: new Date()
    };
    
    const updatedEvents = [event, ...events];
    setEvents(updatedEvents);
    
    // Persist to backend
    if (company) {
      try {
        const updatedCompany: CompanyMemoryRecord = {
          ...company,
          metadata: {
            ...company.metadata,
            events: updatedEvents
          },
          updatedAt: new Date()
        };
        
        await vectorService.updateCompanyInMemory(updatedCompany);
        setCompany(updatedCompany);
        console.log('✅ Event added and persisted successfully');
      } catch (error) {
        console.error('Failed to persist event addition:', error);
        // Revert local state on error
        setEvents(events);
      }
    }
    
    setNewEvent({
      title: '',
      description: '',
      type: 'other',
      date: new Date(),
      participants: [],
      status: 'scheduled',
      priority: 'medium'
    });
    setShowAddEvent(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    setEvents(updatedEvents);
    
    // Persist to backend
    if (company) {
      try {
        const updatedCompany: CompanyMemoryRecord = {
          ...company,
          metadata: {
            ...company.metadata,
            events: updatedEvents
          },
          updatedAt: new Date()
        };
        
        await vectorService.updateCompanyInMemory(updatedCompany);
        setCompany(updatedCompany);
        console.log('✅ Event deleted and persisted successfully');
      } catch (error) {
        console.error('Failed to persist event deletion:', error);
        // Revert local state on error
        setEvents(events);
      }
    }
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: CompanyEvent['status']) => {
    const updatedEvents = events.map(event => 
      event.id === eventId ? { ...event, status: newStatus } : event
    );
    setEvents(updatedEvents);
    
    // Persist to backend
    if (company) {
      try {
        const updatedCompany: CompanyMemoryRecord = {
          ...company,
          metadata: {
            ...company.metadata,
            events: updatedEvents
          },
          updatedAt: new Date()
        };
        
        await vectorService.updateCompanyInMemory(updatedCompany);
        setCompany(updatedCompany);
        console.log('✅ Event status updated and persisted successfully');
      } catch (error) {
        console.error('Failed to persist event status update:', error);
        // Revert local state on error
        setEvents(events);
      }
    }
  };

  const filteredEvents = events.filter(event => {
    const typeMatch = filterType === 'all' || event.type === filterType;
    const statusMatch = filterStatus === 'all' || event.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getTypeIcon = (type: CompanyEvent['type']) => {
    switch (type) {
      case 'milestone': return '🎯';
      case 'meeting': return '🤝';
      case 'deployment': return '🚀';
      case 'incident': return '⚠️';
      case 'announcement': return '📢';
      default: return '📅';
    }
  };

  const getTypeColor = (type: CompanyEvent['type']) => {
    switch (type) {
      case 'milestone': return 'bg-purple-600';
      case 'meeting': return 'bg-blue-600';
      case 'deployment': return 'bg-green-600';
      case 'incident': return 'bg-red-600';
      case 'announcement': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusColor = (status: CompanyEvent['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: CompanyEvent['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleBackToDashboard = () => {
    router.push(`/company/${companyId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company events...</h3>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">Company Events</h1>
            </div>
            <button
              onClick={() => setShowAddEvent(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Add New Event
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto p-6 border-b border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="milestone">Milestones</option>
              <option value="meeting">Meetings</option>
              <option value="deployment">Deployments</option>
              <option value="incident">Incidents</option>
              <option value="announcement">Announcements</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Add Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold text-white mb-4">Add New Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({...prev, title: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({...prev, description: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent(prev => ({...prev, type: e.target.value as CompanyEvent['type']}))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="milestone">Milestone</option>
                      <option value="meeting">Meeting</option>
                      <option value="deployment">Deployment</option>
                      <option value="incident">Incident</option>
                      <option value="announcement">Announcement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                    <select
                      value={newEvent.priority}
                      onChange={(e) => setNewEvent(prev => ({...prev, priority: e.target.value as CompanyEvent['priority']}))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                  <input
                    type="datetime-local"
                    value={newEvent.date ? new Date(newEvent.date.getTime() - newEvent.date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewEvent(prev => ({...prev, date: new Date(e.target.value)}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleAddEvent}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Add Event
                </button>
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events Timeline */}
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl">{getTypeIcon(event.type)}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                    <p className="text-gray-300 text-sm mt-1">{event.description}</p>
                    <div className="flex items-center space-x-4 mt-3">
                      <span className="text-sm text-gray-400">
                        📅 {event.date.toLocaleDateString()} {event.date.toLocaleTimeString()}
                      </span>
                      {event.participants && event.participants.length > 0 && (
                        <span className="text-sm text-gray-400">
                          👥 {event.participants.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(event.type)}`}>
                    {event.type}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(event.priority)}`}>
                    {event.priority}
                  </span>
                  <select
                    value={event.status}
                    onChange={(e) => handleUpdateEventStatus(event.id, e.target.value as CompanyEvent['status'])}
                    className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(event.status)} focus:outline-none`}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-red-400 hover:text-red-300 ml-2"
                    title="Delete Event"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl text-gray-400 mb-2">No events found</h3>
            <p className="text-gray-500 mb-4">
              {events.length === 0 
                ? `Start by adding some events for ${company.name}`
                : 'Try adjusting your filters to see more events'
              }
            </p>
            <button
              onClick={() => setShowAddEvent(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Add First Event
            </button>
          </div>
        )}
      </div>
    </div>
  );
};