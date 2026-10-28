import React, { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { Notification } from '../types';
import { Card, Badge, LoadingState, ErrorState, EmptyState } from '../components/common/UIComponents';
import { Bell, CheckCheck, AlertTriangle, Info, Sparkles } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationAPI.markAsRead(id);
      await loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      await loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingState message="Fetching system notifications..." />;
  if (error) return <ErrorState message={error} onRetry={loadNotifications} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DCE3EC] p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-[#315B8A] text-xs font-bold mb-1">
            <Bell className="w-4 h-4" />
            <span>Notification Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#142B4A] tracking-tight">System Alerts &amp; Early Warnings</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Live updates on roadmap shifts, assessment feedback, and progress drops.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-4 py-2 bg-[#EAF0F7] hover:bg-[#DCE3EC] text-[#142B4A] border border-[#DCE3EC] rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5"
        >
          <CheckCheck className="w-4 h-4 text-[#315B8A]" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={`p-4 transition-all flex items-start justify-between ${
              notif.is_read ? 'opacity-70' : 'border-[#315B8A]/30'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  notif.type === 'drop_warning'
                    ? 'bg-red-50 text-[#B91C1C]'
                    : notif.type === 'gap_alert'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-[#EAF0F7] text-[#315B8A]'
                }`}
              >
                {notif.type === 'drop_warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-[#142B4A]">{notif.title}</h4>
                  {!notif.is_read && <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />}
                </div>
                <p className="text-xs text-[#475569] mt-1">{notif.message}</p>
                <span className="text-[10px] text-[#64748B] font-mono mt-2 block">{notif.created_at}</span>
              </div>
            </div>

            {!notif.is_read && (
              <button
                onClick={() => handleMarkRead(notif.id)}
                className="text-xs text-[#315B8A] hover:text-[#142B4A] font-semibold shrink-0 ml-4"
              >
                Mark Read
              </button>
            )}
          </Card>
        ))}

        {notifications.length === 0 && (
          <EmptyState title="No Notifications" description="You are all caught up! No active warnings or alerts." />
        )}
      </div>
    </div>
  );
};
