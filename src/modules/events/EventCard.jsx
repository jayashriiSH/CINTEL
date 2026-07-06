import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/index';

export default function EventCard({ event, basePath = '/admin/events' }) {
  const navigate = useNavigate();

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'TBA';

  return (
    <div
      onClick={() => navigate(`${basePath}/${event.id}`)}
      className="group relative cursor-pointer rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Gradient accent bar */}
      <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top row — type & status badges */}
      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={event.type || 'event'} size="xs" />
        <StatusBadge status={event.status || 'upcoming'} size="xs" />
      </div>

      {/* Event name */}
      <h3 className="text-base font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
        {event.name}
      </h3>

      {/* Details */}
      <div className="mt-3 space-y-2">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedDate}</span>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1">{event.location}</span>
          </div>
        )}
      </div>

      {/* Footer — volunteer count */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{event.volunteer_count ?? 0} Volunteers</span>
        </div>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
