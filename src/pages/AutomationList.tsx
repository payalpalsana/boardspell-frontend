import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAutomations, toggleAutomation, deleteAutomation } from '../api/client';
import { Automation } from '../types';
import StatusBadge from '../components/StatusBadge';

interface Props {
  workspaceId: string;
}

const AutomationList: React.FC<Props> = ({ workspaceId }) => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getAutomations(workspaceId);
        setAutomations(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.response?.data?.detail || e.message || 'Failed to load automations');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId]);

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      await toggleAutomation(id, !currentState);
      setAutomations(prev =>
        prev.map(a => a.id === id ? { ...a, is_active: !currentState } : a)
      );
    } catch {
      alert('Failed to toggle automation');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAutomation(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Failed to delete automation');
    }
  };

  if (loading) return (
    <div className="text-center py-20 text-slate-500 text-base">⏳ Loading your automations...</div>
  );

  if (error) return (
    <div className="text-center py-20 px-5">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Connection Error</h3>
      <p className="text-slate-500 mb-6">{error}</p>
      <a
        href="http://localhost:3000/oauth/start"
        className="inline-block bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] text-white font-semibold px-5 py-2.5 rounded-lg no-underline"
      >
        🔗 Connect to monday.com
      </a>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-5 py-7">

      {/* Top Bar */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 m-0">My Automations</h1>
          <p className="text-sm text-slate-500 mt-1">
            {automations.length} automation{automations.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          className="bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] text-white font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer text-sm"
          onClick={() => navigate('/builder')}
        >
          + New Automation
        </button>
      </div>

      {/* Empty State */}
      {automations.length === 0 && (
        <div className="text-center py-16 px-5 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No automations yet</h2>
          <p className="text-slate-500 mb-6">Create your first cross-board automation to get started</p>
          <button
            className="bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] text-white font-semibold px-5 py-2.5 rounded-lg border-0 cursor-pointer text-sm"
            onClick={() => navigate('/builder')}
          >
            + Create First Automation
          </button>
        </div>
      )}

      {/* Automation Cards */}
      {automations.map(automation => (
        <div key={automation.id} className="bg-white rounded-xl px-6 py-5 mb-4 shadow-sm border border-gray-200">

          {/* Card Header */}
          <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[17px] font-semibold text-slate-800">{automation.name}</span>
              <StatusBadge status={automation.is_active ? 'active' : 'paused'} />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                className={`border-0 rounded-md px-3 py-1.5 cursor-pointer font-semibold text-xs text-white ${automation.is_active ? 'bg-amber-500' : 'bg-emerald-600'}`}
                onClick={() => handleToggle(automation.id, automation.is_active)}
              >
                {automation.is_active ? '⏸ Pause' : '▶ Activate'}
              </button>
              <button
                className="border-0 rounded-md px-3 py-1.5 cursor-pointer font-semibold text-xs bg-gray-100 text-slate-600"
                onClick={() => navigate(`/logs/${automation.id}`)}
              >
                📋 Logs
              </button>
              <button
                className="border-0 rounded-md px-3 py-1.5 cursor-pointer font-semibold text-xs bg-blue-50 text-blue-600"
                onClick={() => navigate(`/builder/${automation.id}`)}
              >
                ✏️ Edit
              </button>
              <button
                className="border-0 rounded-md px-3 py-1.5 cursor-pointer font-semibold text-xs bg-red-50 text-red-600"
                onClick={() => handleDelete(automation.id, automation.name)}
              >
                🗑 Delete
              </button>
            </div>
          </div>

          {/* Flow */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm text-slate-600">
              🎯 {automation.trigger_type.replace(/_/g, ' ')}
            </span>
            <span className="text-lg font-bold text-[#6C47FF]">→</span>
            <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm text-slate-600">
              ⚡ {automation.action_type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-7 text-sm text-slate-500 flex-wrap">
            <span>🔁 Runs: <strong>{automation.run_count ?? 0}</strong></span>
            <span>
              🕐 Last triggered:{' '}
              <strong>
                {automation.last_triggered
                  ? new Date(automation.last_triggered).toLocaleString()
                  : 'Never'}
              </strong>
            </span>
            <span>📅 Created: <strong>{new Date(automation.created_at).toLocaleDateString()}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AutomationList;
