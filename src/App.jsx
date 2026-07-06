import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader } from './components/index';

// Auth module pages
import Login from './modules/auth/Login';
import ResetPassword from './modules/auth/ResetPassword';

// Dashboard module pages
import AdminDashboard from './modules/dashboard/admin/AdminDashboard';
import MemberDashboard from './modules/dashboard/member/MemberDashboard';

// Event module pages
import EventsPage from './modules/events/EventsPage';
import EventDetail from './modules/events/EventDetail';
import MyEvents from './modules/events/MyEvents';

// Meetings & Members
import MeetingsPage from "./modules/meetings/MeetingsPage";
import MembersPage from "./modules/members/Memberspage";
import MemberDetail from "./modules/members/MemberDetail";


import AdminProfile from './modules/dashboard/admin/AdminProfile';
import LandingPage from "./pages/LandingPage";
// Sidebar icons as inline SVGs
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  events: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  meetings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  members: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM19 21a7 7 0 00-14 0" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

function Sidebar() {
  const { role, signOut } = useAuth();
  const isAdmin = role === 'admin' || role === 'moderator';
  const navigate = useNavigate();

  const menuItems = [
    { to: isAdmin ? '/admin/dashboard' : '/member/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { to: isAdmin ? '/admin/events' : '/member/events', label: 'Events', icon: icons.events },
    { to: isAdmin ? '/admin/meetings' : '/member/meetings', label: 'Meetings', icon: icons.meetings },
    { to: isAdmin ? '/admin/members' : '/member/members', label: 'Members', icon: icons.members },
   { 
  to: isAdmin ? '/admin/profile' : '/member/profile', 
  label: 'My Profile', 
  icon: icons.profile 
},
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[200px] bg-white border-r border-slate-200 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">Cintel Club</h1>
          <p className="text-[11px] text-slate-400 leading-tight">{isAdmin ? 'Admin Portal' : 'Member Portal'}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 mt-2">
        <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Main</p>
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive && item.to !== '#'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Account section */}
      <div className="px-3 pb-6">
        <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Settings</p>
        <NavLink
          to={'/admin/settings'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`
          }
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Admin Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 w-full"
        >
          {icons.logout}
          Logout
        </button>
      </div>
    </aside>
  );
}

function AppLayout() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader text="Initializing Cintel Club..." />
      </div>
    );
  }
  
if (!user) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
  const isAdmin = role === 'admin' || role === 'moderator';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 ml-[200px]">
        <Routes>

          {/* ── Admin routes ── */}
          <Route path="/admin/dashboard" element={isAdmin ? <AdminDashboard /> : <Navigate to="/member/events" replace />} />
          <Route path="/admin/events"    element={isAdmin ? <EventsPage />     : <Navigate to="/member/events" replace />} />
          <Route path="/admin/events/:id" element={isAdmin ? <EventDetail />   : <Navigate to="/member/events" replace />} />
          <Route path="/admin/meetings"  element={isAdmin ? <MeetingsPage />   : <Navigate to="/member/events" replace />} />
          <Route path="/admin/members"   element={isAdmin ? <MembersPage />    : <Navigate to="/member/events" replace />} />
         <Route 
  path="/admin/profile" 
  element={isAdmin ? <AdminProfile /> : <Navigate to="/member/events" replace />} 
/>
          {/* ── Member routes ── */}
          <Route path="/member/dashboard" element={!isAdmin ? <MemberDashboard /> : <Navigate to="/admin/events" replace />} />
          <Route path="/member/events"    element={!isAdmin ? <EventsPage />      : <Navigate to="/admin/events" replace />} />
          <Route path="/member/events/:id" element={!isAdmin ? <EventDetail />    : <Navigate to="/admin/events" replace />} />
          <Route path="/member/my-events" element={!isAdmin ? <MyEvents />        : <Navigate to="/admin/events" replace />} />
          <Route path="/member/meetings"  element={!isAdmin ? <MeetingsPage />    : <Navigate to="/admin/events" replace />} />
          <Route path="/member/members"   element={!isAdmin ? <MembersPage />     : <Navigate to="/admin/events" replace />} />

          {/* ── Shared: Member detail (accessible by both admin and members) ── */}
          <Route path="/members/:id" element={<MemberDetail />} />

          {/* ── Default redirect ── */}
         <Route path="*" element={<Navigate to={isAdmin ? '/admin/dashboard' : '/member/dashboard'} replace />} />

        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}