import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../services/api';
import { Notification } from '../../types';
import {
  Bell,
  LogOut,
  Shield,
  GraduationCap,
  Users,
  User,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setShowNotificationMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationAPI.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const list = await notificationAPI.getAll();
      setNotificationsList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotificationMenu = () => {
    const nextState = !showNotificationMenu;
    setShowNotificationMenu(nextState);
    setShowProfileMenu(false);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotificationsList((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await notificationAPI.markAsRead(notif.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotificationsList((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        console.error(e);
      }
    }
    setShowNotificationMenu(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <header className="h-16 border-b border-[#DCE3EC] bg-white sticky top-0 z-40 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <Link
          to={
            user?.role === 'admin'
              ? '/admin'
              : user?.role === 'staff'
              ? '/staff-dashboard'
              : user?.role === 'mentor'
              ? '/mentor-dashboard'
              : '/dashboard'
          }
          className="flex items-center space-x-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#142B4A] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-[#142B4A] tracking-tight">
              SkillNova
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider text-[#315B8A] bg-[#EAF0F7] px-2 py-0.5 rounded border border-[#DCE3EC]">
              Academic Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Right Upper Side Controls */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Notifications Dropdown (Right Upper Side) */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={toggleNotificationMenu}
            className={`relative p-2 text-[#142B4A] border rounded-xl transition-all ${
              showNotificationMenu
                ? 'bg-[#EAF0F7] border-[#142B4A]'
                : 'hover:bg-[#EAF0F7] border-[#DCE3EC]'
            }`}
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 text-[#142B4A]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#DC2626] text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DCE3EC] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-[#DCE3EC] bg-[#F5F7FA] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-[#142B4A]" />
                  <span className="text-xs font-bold text-[#142B4A]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold border border-red-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center space-x-1 text-[11px] text-[#315B8A] font-bold hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#DCE3EC]">
                {loadingNotifications ? (
                  <div className="py-8 flex items-center justify-center text-[#64748B] text-xs">
                    <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#142B4A]" />
                    <span>Loading notifications...</span>
                  </div>
                ) : notificationsList.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#EAF0F7] flex items-center justify-center mx-auto mb-2 text-[#315B8A]">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#142B4A]">All caught up!</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      No new notifications right now.
                    </p>
                  </div>
                ) : (
                  notificationsList.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 flex items-start space-x-3 hover:bg-[#F5F7FA] cursor-pointer transition-colors ${
                        !notif.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                          notif.type === 'drop_warning'
                            ? 'bg-red-50 text-[#B91C1C]'
                            : notif.type === 'gap_alert'
                            ? 'bg-amber-50 text-amber-700'
                            : notif.type === 'roadmap_update'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-[#EAF0F7] text-[#315B8A]'
                        }`}
                      >
                        {notif.type === 'drop_warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : notif.type === 'gap_alert' ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : notif.type === 'roadmap_update' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-bold text-[#142B4A] truncate">
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-[#F5F7FA] border-t border-[#DCE3EC] text-center">
                <Link
                  to="/notifications"
                  onClick={() => setShowNotificationMenu(false)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#142B4A] hover:text-[#315B8A] transition-colors"
                >
                  <span>View All in Notification Center</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl border border-[#DCE3EC] hover:bg-[#EAF0F7] bg-white transition-all shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-[#142B4A] text-white font-bold flex items-center justify-center text-xs">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left pr-1">
              <p className="text-xs font-bold text-[#142B4A] leading-tight">{user?.full_name}</p>
              <p className="text-[10px] text-[#64748B] capitalize">{user?.role}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#DCE3EC] rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-100">
              <div className="px-3.5 py-2.5 border-b border-[#DCE3EC] bg-[#F5F7FA]">
                <p className="text-xs font-bold text-[#142B4A] truncate">{user?.full_name}</p>
                <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
              </div>

              {user?.role === 'student' && (
                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-[#142B4A] hover:bg-[#EAF0F7] transition-colors"
                >
                  <User className="w-4 h-4 text-[#315B8A]" />
                  <span>My Profile</span>
                </Link>
              )}

              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-[#142B4A] hover:bg-[#EAF0F7] transition-colors"
                >
                  <Shield className="w-4 h-4 text-[#315B8A]" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              {user?.role === 'staff' && (
                <Link
                  to="/staff-dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-[#142B4A] hover:bg-[#EAF0F7] transition-colors"
                >
                  <Users className="w-4 h-4 text-[#315B8A]" />
                  <span>Staff Dashboard</span>
                </Link>
              )}

              {user?.role === 'mentor' && (
                <Link
                  to="/mentor-dashboard"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-[#142B4A] hover:bg-[#EAF0F7] transition-colors"
                >
                  <Users className="w-4 h-4 text-[#315B8A]" />
                  <span>Mentor Dashboard</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full flex items-center space-x-2 px-3.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-[#DC2626]" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

