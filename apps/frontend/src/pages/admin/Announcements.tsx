// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/Announcements.tsx
import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, Calendar, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { Announcement } from '../../types/admin.types';

export const Announcements: React.FC = () => {
  const { announcements, announcementsLoading, announcementsError, fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    
    const data = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
    };
    
    if (editingAnnouncement) {
      await updateAnnouncement(editingAnnouncement.id, data);
    } else {
      await createAnnouncement(data);
    }
    
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', type: 'info', isActive: true, startDate: '', endDate: '' });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      startDate: announcement.startDate.split('T')[0],
      endDate: announcement.endDate?.split('T')[0] || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
    }
  };

  const typeColors = {
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    error: 'bg-red-100 text-red-700 border-red-200',
  };

  const typeIcons = {
    info: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
  };

  if (announcementsLoading && !announcements) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">System Announcements</h2>
          <p className="text-sm text-secondary-500">Manage announcements shown to all users</p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({ title: '', content: '', type: 'info', isActive: true, startDate: '', endDate: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* Announcements List */}
      {announcementsError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-300">{announcementsError}</p>
          <button onClick={() => fetchAnnouncements()} className="mt-2 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(announcement => (
            <div key={announcement.id} className={`border rounded-xl p-4 ${typeColors[announcement.type]}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  {typeIcons[announcement.type]}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[announcement.type]}`}>
                        {announcement.type.toUpperCase()}
                      </span>
                      {!announcement.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">Inactive</span>}
                    </div>
                    <p className="text-sm mt-1">{announcement.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs opacity-75">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />From: {new Date(announcement.startDate).toLocaleDateString()}</span>
                      {announcement.endDate && <span>To: {new Date(announcement.endDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(announcement)} className="p-1 rounded hover:bg-white/20">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(announcement.id)} className="p-1 rounded hover:bg-white/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-12 text-secondary-500 bg-white dark:bg-secondary-800 rounded-xl border">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No announcements yet</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-sm text-primary-600 hover:underline"
              >
                Create your first announcement
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded hover:bg-secondary-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                  placeholder="Announcement content"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active (visible to users)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border hover:bg-secondary-50">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Announcements;
