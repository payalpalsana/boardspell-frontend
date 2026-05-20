import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLogs } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const ExecutionLogs: React.FC = () => {
  const { automationId } = useParams<{ automationId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!automationId) return;
    getLogs(automationId)
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [automationId]);

  const formatTrigger = (payload: any): string => {
    if (!payload) return 'Unknown trigger';
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { return payload; }
    }
    if (payload.type === 'date_reached') {
      return `📅 Date trigger — item ${payload.item_id} matched today (${payload.date || ''})`;
    }
    const eventType = payload.type?.replace(/_/g, ' ') || 'event';
    const column    = payload.columnId || '';
    const valueText = payload.value?.label?.text || payload.value?.text || '';
    const itemId    = payload.pulseId || payload.item_id || '';
    return `🎯 ${eventType}${column ? ` on column "${column}"` : ''}${valueText ? ` → "${valueText}"` : ''}${itemId ? ` (item ${itemId})` : ''}`;
  };

  const formatAction = (action: any): string => {
    if (!action) return '';
    if (typeof action === 'string') {
      try { action = JSON.parse(action); } catch { return action; }
    }
    if (action.user_ids) return `Sent notification to ${action.user_ids.length} user(s): "${action.message || ''}"`;
    if (action.user_id) return `Assigned user ${action.user_id} to item ${action.target_item_id || ''}`;
    if (action.value !== undefined && action.column_id) {
      return `Changed column "${action.column_id}" to "${action.value}" on item ${action.target_item_id || ''}`;
    }
    return JSON.stringify(action);
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount  = logs.filter(l => l.status === 'failed').length;
  const skippedCount = logs.filter(l => l.status === 'skipped').length;

  if (loading) return (
    <div className="text-center py-20 text-slate-500">⏳ Loading execution logs...</div>
  );

  return (
    <div className="max-w-[860px] mx-auto px-5 py-7">

      {/* Back */}
      <button
        className="bg-transparent border-0 text-[#6C47FF] cursor-pointer text-sm font-semibold p-0 mb-5"
        onClick={() => navigate('/')}
      >
        ← Back to Automations
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">📋 Execution Logs</h1>
          <p className="text-sm text-slate-500">Last {logs.length} runs for this automation</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <span className="bg-green-100 text-green-700 px-3.5 py-1 rounded-full text-sm font-semibold">
            ✅ {successCount} success
          </span>
          <span className="bg-red-100 text-red-600 px-3.5 py-1 rounded-full text-sm font-semibold">
            ❌ {failedCount} failed
          </span>
          <span className="bg-gray-100 text-gray-500 px-3.5 py-1 rounded-full text-sm font-semibold">
            ⏭️ {skippedCount} skipped
          </span>
        </div>
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No runs yet</h2>
          <p className="text-slate-500">Trigger the automation by changing a status in monday.com</p>
        </div>
      )}

      {/* Log Entries */}
      {logs.map((log, i) => (
        <div key={log.id || i} className="bg-white rounded-xl p-5 mb-3 shadow-sm border border-gray-200">

          <div className="flex items-center gap-3 mb-3">
            <StatusBadge status={log.status} />
            <span className="text-sm text-slate-500">
              🕐 {new Date(log.triggered_at).toLocaleString()}
            </span>
          </div>

          {log.trigger_payload && (
            <div className="text-sm text-slate-600 bg-gray-50 px-3 py-2 rounded-md mb-2">
              {formatTrigger(log.trigger_payload)}
            </div>
          )}

          {log.status === 'success' && log.action_taken && (
            <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
              ⚡ {formatAction(log.action_taken)}
            </div>
          )}

          {log.status === 'skipped' && (
            <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
              ⏭️ {log.error_message || 'Condition not met or trigger did not match'}
            </div>
          )}

          {log.status === 'failed' && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              ❌ Error: {log.error_message || 'Unknown error occurred'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ExecutionLogs;
