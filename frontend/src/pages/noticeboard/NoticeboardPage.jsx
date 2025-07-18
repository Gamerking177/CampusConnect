import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, CalendarIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getEvents, deleteEvent } from '../../services/noticeboardService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

const NoticeboardPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    event_type: '',
    date_range: 'upcoming',
    is_online: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare query parameters
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.event_type) params.event_type = filters.event_type;
      if (filters.date_range === 'upcoming') params.is_upcoming = true;
      if (filters.date_range === 'past') params.is_past = true;
      if (filters.is_online !== '') params.is_online = filters.is_online === 'true';
      
      console.log('Fetching events with params:', params);
      
      // The getEvents function now handles the response format
      const eventsData = await getEvents(params);
      
      if (!Array.isArray(eventsData)) {
        console.error('Expected an array of events but got:', eventsData);
        setEvents([]);
        return;
      }
      
      console.log('Successfully fetched', eventsData.length, 'events');
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEditEvent = (eventId) => {
    navigate(`/noticeboard/edit/${eventId}`);
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (window.confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      try {
        await deleteEvent(eventId);
        toast.success('Event deleted successfully');
        fetchEvents(); // Refresh the events list
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.error('Failed to delete event. Please try again.');
      }
    }
  };

  // Check if current user can edit/delete an event
  const canEditEvent = useMemo(() => {
    return (event) => {
      if (!user) return false;
      return user.is_staff || user.id === event.organizer?.id;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('Filtering events. Total events:', events?.length || 0);
  const filteredEvents = (Array.isArray(events) ? events : []).filter(event => {
    if (!event) return false;
    
    const searchTerm = filters.search?.toLowerCase() || '';
    const eventTitle = event.title?.toLowerCase() || '';
    const eventDescription = event.description?.toLowerCase() || '';
    
    const matchesSearch = eventTitle.includes(searchTerm) || 
                         eventDescription.includes(searchTerm);
    
    const matchesType = !filters.event_type || 
                       (event.event_type && event.event_type === filters.event_type);
    
    const matchesFormat = filters.is_online === '' || 
                         (event.is_online && filters.is_online === 'true') ||
                         (!event.is_online && filters.is_online === 'false');
    
    try {
      const eventDate = event.start_datetime ? new Date(event.start_datetime) : null;
      if (!eventDate) return false;
      
      const now = new Date();
      const matchesStartDate = !filters.date_range ||
        (filters.date_range === 'upcoming' && eventDate >= now) ||
        (filters.date_range === 'past' && eventDate < now);
      
      return matchesSearch && matchesType && matchesFormat && matchesStartDate;
    } catch (e) {
      console.error('Error processing event date:', e);
      return false;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Campus Events & Noticeboard</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={toggleFilters} className="flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </Button>
          <Link to="/noticeboard/new">
            <Button>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search events..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  id="event_type"
                  name="event_type"
                  value={filters.event_type}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="conference">Conference</option>
                  <option value="social">Social Gathering</option>
                  <option value="sports">Sports Event</option>
                  <option value="cultural">Cultural Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="date_range" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  id="date_range"
                  name="date_range"
                  value={filters.date_range}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="upcoming">Upcoming Events</option>
                  <option value="past">Past Events</option>
                  <option value="all">All Events</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="is_online" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Format
                </label>
                <select
                  id="is_online"
                  name="is_online"
                  value={filters.is_online}
                  onChange={handleFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">All Formats</option>
                  <option value="true">Online Only</option>
                  <option value="false">In-Person Only</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 gap-6">
        {!filteredEvents || filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter to find what you're looking for.
            </p>
            <div className="mt-6">
              <Link
                to="/noticeboard/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(filteredEvents) && filteredEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    {event.images && event.images.length > 0 && (
                      <div className="w-full md:w-48 flex-shrink-0">
                        <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                          <img
                            src={event.images[0].image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <span>
                          {formatDate(event.start_datetime)} • {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <MapPinIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <span>{event.is_online ? 'Online Event' : event.location}</span>
                      </div>
                      
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                        {event.description}
                      </p>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <span className="inline-block h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 font-medium flex items-center justify-center">
                              {event.organizer?.name?.charAt(0) || 'O'}
                            </span>
                          </div>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900">
                              {event.organizer?.name || 'Organizer'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {event.registrations_count || 0} {event.registrations_count === 1 ? 'attendee' : 'attendees'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {canEditEvent(event) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditEvent(event.id);
                                }}
                                className="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                title="Edit event"
                              >
                                <PencilIcon className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id, event.title);
                                }}
                                className="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                title="Delete event"
                              >
                                <TrashIcon className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </button>
                            </>
                          )}
                          
                          {event.is_online && event.meeting_link && (
                            <a
                              href={event.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Join Online
                            </a>
                          )}
                          
                          <Link
                            to={`/noticeboard/${event.id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeboardPage;
