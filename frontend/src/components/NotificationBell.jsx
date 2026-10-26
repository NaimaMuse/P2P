import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function NotificationBell() {
  const { user } = useAuth();
  const [feed, setFeed] = useState({ items: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await api.get('/auth/notifications');
        if (active && Array.isArray(response.data.data.items)) setFeed(response.data.data);
      } catch { /* Keep the last successful notification list on connection loss. */ }
    }
    refresh(); const timer = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh); window.addEventListener('order-updated', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('order-updated', refresh); };
  }, [user]);
  if (!user || user.role === 'admin') return null;
  return <div className="notification-bell">
    <button aria-label={`Notifications${feed.unreadCount ? `, ${feed.unreadCount} unread` : ''}`} aria-expanded={open} aria-controls="order-notifications" onClick={() => setOpen(value => !value)}><Bell size={20} />{feed.unreadCount > 0 && <b>{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</b>}</button>
    {open && <section id="order-notifications" className="notification-panel" aria-label="Order notifications"><h3>Notifications</h3>{feed.items.length ? feed.items.map(notification => <Link key={notification._id} className={notification.readAt ? '' : 'unread'} to={user.role === 'supplier' ? `/supplier/dashboard?tab=orders&order=${notification.order}` : `/orders?order=${notification.order}`} onClick={async () => {
      setOpen(false);
      try { await api.patch(`/auth/notifications/${notification._id}/read`); window.dispatchEvent(new Event('order-updated')); } catch { /* Remains unread until the server confirms. */ }
    }}><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString()}</small></Link>) : <p>No order notifications yet.</p>}</section>}
  </div>;
}
