import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createAutomation,
  updateAutomationFull,
  getBoards,
  getBoardColumns,
  getBoardGroups,
  getUsers,
  getAutomations,
  getBoardItems,
  getStatusLabels,
} from '../api/client';
import { Board, BoardColumn, BoardGroup, User, StatusLabel } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Props { workspaceId: string; }

const TRIGGER_TYPES = [
  {
    value:       'status_change',
    label:       '🔄 Status column changes to a value',
    description: 'Fires when a status column on Board A changes to a specific value',
  },
  {
    value:       'item_moved',
    label:       '📦 Item moved to a group',
    description: 'Fires when an item is moved to a specific group on Board A',
  },
  {
    value:       'date_reached',
    label:       '📅 Date column is reached (today)',
    description: "Fires at midnight when an item's date column matches today's date",
  },
];

const ACTION_TYPES = [
  {
    value:       'change_column',
    label:       '✏️ Change a column value',
    description: 'Update any column on a target item in Board B',
  },
  {
    value:       'assign_person',
    label:       '👤 Assign a person',
    description: 'Assign a team member to an item in Board B',
  },
  {
    value:       'send_notification',
    label:       '🔔 Send a notification',
    description: 'Send an in-app monday.com notification to selected users',
  },
];

const STEPS = ['Trigger', 'Condition', 'Action', 'Save'];

// Shared input/select classes
const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm outline-none bg-white cursor-pointer';
const labelCls = 'block text-[13px] font-semibold text-slate-600 mb-1.5 mt-4';

const AutomationBuilder: React.FC<Props> = ({ workspaceId }) => {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const isEdit   = !!id;

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [boards, setBoards]               = useState<Board[]>([]);
  const [triggerColumns, setTriggerCols]  = useState<BoardColumn[]>([]);
  const [triggerGroups, setTriggerGroups] = useState<BoardGroup[]>([]);
  const [actionColumns, setActionCols]    = useState<BoardColumn[]>([]);
  const [actionItems, setActionItems]     = useState<any[]>([]);
  const [users, setUsers]                 = useState<User[]>([]);
  const [statusLabels, setStatusLabels]   = useState<StatusLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  const [form, setForm] = useState({
    name:             '',
    trigger_type:     '',
    trigger_board_id: '',
    trigger_config:   {} as Record<string, any>,
    use_condition:    false,
    condition_config: {} as Record<string, any>,
    action_type:      '',
    action_board_id:  '',
    action_config:    {} as Record<string, any>,
  });

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!workspaceId) return;
    getBoards(workspaceId).then(setBoards).catch(console.error);
    getUsers(workspaceId).then(setUsers).catch(console.error);
  }, [workspaceId]);

  useEffect(() => {
    if (!isEdit || !id || !workspaceId) return;
    getAutomations(workspaceId).then((list: any[]) => {
      const auto = list.find((a: any) => a.id === id);
      if (!auto) return;
      const tc = typeof auto.trigger_config   === 'string' ? JSON.parse(auto.trigger_config)   : (auto.trigger_config   || {});
      const cc = typeof auto.condition_config === 'string' ? JSON.parse(auto.condition_config) : (auto.condition_config || {});
      const ac = typeof auto.action_config    === 'string' ? JSON.parse(auto.action_config)    : (auto.action_config    || {});
      setForm({
        name:             auto.name             || '',
        trigger_type:     auto.trigger_type     || '',
        trigger_board_id: auto.trigger_board_id || '',
        trigger_config:   tc,
        use_condition:    !!auto.condition_config,
        condition_config: cc,
        action_type:      auto.action_type     || '',
        action_board_id:  auto.action_board_id || '',
        action_config:    ac,
      });
    }).finally(() => setLoading(false));
  }, [id, isEdit, workspaceId]);

  useEffect(() => {
    if (!form.trigger_board_id || !workspaceId) return;
    setTriggerCols([]); setTriggerGroups([]);
    getBoardColumns(workspaceId, form.trigger_board_id).then(setTriggerCols).catch(console.error);
    getBoardGroups(workspaceId,  form.trigger_board_id).then(setTriggerGroups).catch(console.error);
  }, [form.trigger_board_id, workspaceId]);

  useEffect(() => {
    const colId = form.trigger_config?.column_id;
    if (!colId || !form.trigger_board_id || !workspaceId) return;
    const col = triggerColumns.find(c => c.id === colId);
    if (!col || col.type !== 'status') return;
    setLoadingLabels(true);
    getStatusLabels(workspaceId, form.trigger_board_id, colId)
      .then(setStatusLabels)
      .catch(console.error)
      .finally(() => setLoadingLabels(false));
  }, [form.trigger_config?.column_id, form.trigger_board_id, workspaceId, triggerColumns]);

  useEffect(() => {
    if (!form.action_board_id || !workspaceId) return;
    setActionCols([]); setActionItems([]);
    getBoardColumns(workspaceId, form.action_board_id).then(setActionCols).catch(console.error);
    getBoardItems(workspaceId,   form.action_board_id).then(setActionItems).catch(console.error);
  }, [form.action_board_id, workspaceId]);

  const canNext = () => {
    if (step === 0) return !!form.trigger_type && !!form.trigger_board_id;
    if (step === 1) return true;
    if (step === 2) return !!form.action_type;
    if (step === 3) return form.name.trim().length > 0;
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        workspace_id:     workspaceId,
        name:             form.name,
        trigger_type:     form.trigger_type,
        trigger_board_id: form.trigger_board_id,
        trigger_config:   form.trigger_config,
        condition_config: form.use_condition ? form.condition_config : null,
        action_type:      form.action_type,
        action_board_id:  form.action_board_id || null,
        action_config:    form.action_config,
      };
      if (isEdit && id) {
        await updateAutomationFull(id, payload);
      } else {
        await createAutomation(payload);
      }
      navigate('/');
    } catch (e: any) {
      alert(`Failed to save: ${e.response?.data?.detail || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="text-center py-20 text-slate-500">⏳ Loading automation...</div>
  );

  return (
    <div className="max-w-[740px] mx-auto px-5 py-6">

      {/* Progress Steps */}
      <div className="flex justify-center gap-12 mb-8">
        {STEPS.map((stepName, i) => (
          <div key={stepName} className="flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              i <= step
                ? 'bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] text-white'
                : 'bg-gray-200 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-semibold ${i <= step ? 'text-[#6C47FF]' : 'text-gray-400'}`}>
              {stepName}
            </span>
          </div>
        ))}
      </div>

      {/* ── STEP 0: TRIGGER ── */}
      {step === 0 && (
        <div className="bg-white rounded-xl p-7 shadow-sm border border-gray-200 mb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-1.5">🎯 Step 1 — Set Your Trigger</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            What event on Board A should start this automation?
          </p>

          <label className={labelCls}>Trigger Board (Board A)</label>
          <select className={inputCls}
            value={form.trigger_board_id}
            onChange={e => { set('trigger_board_id', e.target.value); set('trigger_config', {}); }}>
            <option value="">— Select the board to watch —</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name} ({b.items_count} items)</option>)}
          </select>

          <label className={labelCls}>Trigger Type</label>
          <div className="flex flex-col gap-2.5 mt-2">
            {TRIGGER_TYPES.map(t => (
              <div key={t.value}
                className={`px-4 py-3.5 rounded-xl cursor-pointer text-sm transition-all border-2 ${
                  form.trigger_type === t.value
                    ? 'border-[#6C47FF] bg-violet-50'
                    : 'border-gray-200 bg-white'
                }`}
                onClick={() => { set('trigger_type', t.value); set('trigger_config', {}); }}>
                <div className="font-semibold mb-0.5">{t.label}</div>
                <div className="text-xs text-slate-500">{t.description}</div>
              </div>
            ))}
          </div>

          {form.trigger_type === 'status_change' && (
            <>
              <label className={labelCls}>Which Status Column to Watch?</label>
              <select className={inputCls}
                value={form.trigger_config?.column_id || ''}
                onChange={e => set('trigger_config', { ...form.trigger_config, column_id: e.target.value, value: '' })}>
                <option value="">— Select a status column —</option>
                {triggerColumns.filter(c => c.type === 'status').map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>

              {form.trigger_config?.column_id && (
                <>
                  <label className={labelCls}>When Status Changes To</label>
                  {loadingLabels ? (
                    <p className="text-sm text-slate-500">⏳ Loading status options...</p>
                  ) : statusLabels.length > 0 ? (
                    <select className={inputCls}
                      value={form.trigger_config?.value || ''}
                      onChange={e => set('trigger_config', { ...form.trigger_config, value: e.target.value })}>
                      <option value="">— Select a status value —</option>
                      {statusLabels.map((l: StatusLabel) => (
                        <option key={l.index} value={l.label}>{l.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input className={inputCls}
                      placeholder="e.g. Done, Working on it, Stuck"
                      value={form.trigger_config?.value || ''}
                      onChange={e => set('trigger_config', { ...form.trigger_config, value: e.target.value })} />
                  )}
                </>
              )}
            </>
          )}

          {form.trigger_type === 'item_moved' && (
            <>
              <label className={labelCls}>Which Group (destination)?</label>
              {!form.trigger_board_id ? (
                <p className="text-red-500 text-sm">⚠️ Select a Trigger Board first</p>
              ) : triggerGroups.length === 0 ? (
                <p className="text-slate-500 text-sm">⏳ Loading groups...</p>
              ) : (
                <select className={inputCls}
                  value={form.trigger_config?.group_id || ''}
                  onChange={e => set('trigger_config', { group_id: e.target.value })}>
                  <option value="">— Select destination group —</option>
                  {triggerGroups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              )}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 mt-3.5">
                <p className="text-sm text-amber-600 font-semibold mb-1.5">⚠️ One-Time Manual Setup Required</p>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  monday.com's API doesn't support auto-registering group move webhooks.<br />
                  Please do this once:<br />
                  <strong>monday.com → Your Board → Automate → Search "webhook"</strong><br />
                  Select "When item moves to group → Send webhook to:"<br />
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {API_URL}/webhooks/receive
                  </code>
                </p>
              </div>
            </>
          )}

          {form.trigger_type === 'date_reached' && (
            <>
              <label className={labelCls}>Which Date Column to Check?</label>
              <select className={inputCls}
                value={form.trigger_config?.column_id || ''}
                onChange={e => set('trigger_config', { column_id: e.target.value })}>
                <option value="">— Select a date column —</option>
                {triggerColumns.filter(c => c.type === 'date').map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-600 font-semibold">ℹ️ How Date Trigger Works</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  This automation fires automatically at midnight every day.<br />
                  When any item's date column matches today's date, the action executes.<br />
                  It will not fire twice for the same item on the same day.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 1: CONDITION ── */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-7 shadow-sm border border-gray-200 mb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-1.5">🔍 Step 2 — Add Condition (Optional)</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Only run this automation if an additional condition is met on the triggering item.
          </p>

          <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={form.use_condition}
              onChange={e => set('use_condition', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            Only fire if a column equals a specific value
          </label>

          {form.use_condition && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <label className={labelCls}>Column to Check</label>
              <select className={inputCls}
                value={form.condition_config?.column_id || ''}
                onChange={e => set('condition_config', { ...form.condition_config, column_id: e.target.value })}>
                <option value="">— Select a column —</option>
                {triggerColumns.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.type})</option>
                ))}
              </select>

              <label className={labelCls}>Must Equal</label>
              <input className={inputCls}
                placeholder="e.g. High, Urgent, Done"
                value={form.condition_config?.value || ''}
                onChange={e => set('condition_config', { ...form.condition_config, value: e.target.value })} />

              {form.condition_config?.column_id && form.condition_config?.value && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-green-700 m-0">
                    ✅ Will only fire when:{' '}
                    <strong>{triggerColumns.find(c => c.id === form.condition_config?.column_id)?.title}</strong>
                    {' = "'}
                    <strong>{form.condition_config.value}</strong>
                    {'"'}
                  </p>
                </div>
              )}
            </div>
          )}

          {!form.use_condition && (
            <div className="mt-4 p-3.5 bg-gray-100 rounded-lg">
              <p className="text-sm text-slate-500 m-0">
                ⚡ No condition set — automation will fire for ALL matching events
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: ACTION ── */}
      {step === 2 && (
        <div className="bg-white rounded-xl p-7 shadow-sm border border-gray-200 mb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-1.5">⚡ Step 3 — Set Your Action</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            What should happen automatically on Board B when the trigger fires?
          </p>

          <label className={labelCls}>Action Type</label>
          <div className="flex flex-col gap-2.5 mt-2">
            {ACTION_TYPES.map(a => (
              <div key={a.value}
                className={`px-4 py-3.5 rounded-xl cursor-pointer text-sm transition-all border-2 ${
                  form.action_type === a.value
                    ? 'border-[#6C47FF] bg-violet-50'
                    : 'border-gray-200 bg-white'
                }`}
                onClick={() => { set('action_type', a.value); set('action_config', {}); }}>
                <div className="font-semibold mb-0.5">{a.label}</div>
                <div className="text-xs text-slate-500">{a.description}</div>
              </div>
            ))}
          </div>

          {(form.action_type === 'change_column' || form.action_type === 'assign_person') && (
            <>
              <label className={labelCls}>Target Board (Board B)</label>
              <select className={inputCls}
                value={form.action_board_id}
                onChange={e => { set('action_board_id', e.target.value); set('action_config', {}); }}>
                <option value="">— Select the target board —</option>
                {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              {form.action_board_id && (
                <>
                  <label className={labelCls}>Target Item</label>
                  {actionItems.length === 0 ? (
                    <p className="text-sm text-slate-500">⏳ Loading items...</p>
                  ) : (
                    <select className={inputCls}
                      value={form.action_config?.target_item_id || ''}
                      onChange={e => set('action_config', { ...form.action_config, target_item_id: e.target.value })}>
                      <option value="">— Select which item to update —</option>
                      {actionItems.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.name} — {item.group?.title}</option>
                      ))}
                    </select>
                  )}

                  <label className={labelCls}>Target Column</label>
                  <select className={inputCls}
                    value={form.action_config?.column_id || ''}
                    onChange={e => set('action_config', { ...form.action_config, column_id: e.target.value })}>
                    <option value="">— Select which column to change —</option>
                    {actionColumns.map(c => (
                      <option key={c.id} value={c.id}>{c.title} ({c.type})</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}

          {form.action_type === 'change_column' && form.action_config?.column_id && (
            <>
              <label className={labelCls}>New Value to Set</label>
              <input className={inputCls}
                placeholder="e.g. Done, Ready, In Progress"
                value={form.action_config?.value || ''}
                onChange={e => set('action_config', { ...form.action_config, value: e.target.value })} />
              <p className="text-xs text-slate-500 mt-1">
                For status columns, type the exact label name (case-insensitive)
              </p>
            </>
          )}

          {form.action_type === 'assign_person' && (
            <>
              <label className={labelCls}>Assign To (User)</label>
              <select className={inputCls}
                value={form.action_config?.user_id || ''}
                onChange={e => set('action_config', { ...form.action_config, user_id: e.target.value })}>
                <option value="">— Select a team member —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </>
          )}

          {form.action_type === 'send_notification' && (
            <>
              <label className={labelCls}>Who to Notify?</label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                {users.map(u => {
                  const isSelected = (form.action_config?.user_ids || []).includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2.5 py-2 px-1 cursor-pointer border-b border-gray-100 last:border-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          const current: string[] = form.action_config?.user_ids || [];
                          const updated = e.target.checked
                            ? [...current, u.id]
                            : current.filter((x: string) => x !== u.id);
                          set('action_config', { ...form.action_config, user_ids: updated });
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                      {isSelected && <span className="ml-auto text-green-600 text-xs font-semibold">✅</span>}
                    </label>
                  );
                })}
              </div>

              {(form.action_config?.user_ids || []).length > 0 && (
                <div className="bg-green-50 rounded-md px-3 py-2 mt-2 text-sm text-green-700">
                  ✅ {(form.action_config?.user_ids || []).length} user(s) selected
                </div>
              )}

              <label className={labelCls}>Notification Message</label>
              <input className={inputCls}
                placeholder="e.g. Engineering task is Done! Please proceed."
                value={form.action_config?.message || ''}
                onChange={e => set('action_config', { ...form.action_config, message: e.target.value })} />
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: SAVE ── */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-7 shadow-sm border border-gray-200 mb-5">
          <h2 className="text-xl font-bold text-slate-800 mb-1.5">💾 Step 4 — Name & Save</h2>
          <p className="text-sm text-slate-500 mb-6">Give your automation a clear, descriptive name.</p>

          <label className={labelCls}>Automation Name</label>
          <input className={inputCls}
            placeholder="e.g. Engineering Done → Marketing Ready"
            value={form.name}
            onChange={e => set('name', e.target.value)} />

          <div className="bg-gray-50 rounded-xl p-5 mt-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">📋 Automation Summary</h3>

            <SummaryRow label="🎯 Trigger">
              <strong>{form.trigger_type.replace(/_/g, ' ')}</strong>
              {' on '}
              <strong>{boards.find(b => b.id === form.trigger_board_id)?.name || 'Board'}</strong>
            </SummaryRow>

            {form.trigger_type === 'status_change' && (
              <SummaryRow label="📌 When">
                Column <strong>{triggerColumns.find(c => c.id === form.trigger_config?.column_id)?.title}</strong>
                {' changes to "'}
                <strong>{form.trigger_config?.value}</strong>
                {'"'}
              </SummaryRow>
            )}

            {form.trigger_type === 'item_moved' && (
              <SummaryRow label="📦 Group">
                Item moves to{' '}
                <strong>{triggerGroups.find(g => g.id === form.trigger_config?.group_id)?.title}</strong>
              </SummaryRow>
            )}

            {form.trigger_type === 'date_reached' && (
              <SummaryRow label="📅 Column">
                Date column{' '}
                <strong>{triggerColumns.find(c => c.id === form.trigger_config?.column_id)?.title}</strong>
                {' reaches today'}
              </SummaryRow>
            )}

            {form.use_condition && (
              <SummaryRow label="🔍 Condition">
                Only if <strong>{triggerColumns.find(c => c.id === form.condition_config?.column_id)?.title}</strong>
                {' = "'}
                <strong>{form.condition_config?.value}</strong>
                {'"'}
              </SummaryRow>
            )}

            <SummaryRow label="⚡ Action">
              <strong>{form.action_type.replace(/_/g, ' ')}</strong>
              {form.action_board_id && (
                <> on <strong>{boards.find(b => b.id === form.action_board_id)?.name}</strong></>
              )}
            </SummaryRow>

            {form.action_type === 'change_column' && (
              <SummaryRow label="✏️ Set">
                Column <strong>{actionColumns.find(c => c.id === form.action_config?.column_id)?.title}</strong>
                {' to "'}
                <strong>{form.action_config?.value}</strong>
                {'"'}
              </SummaryRow>
            )}

            {form.action_type === 'assign_person' && (
              <SummaryRow label="👤 Assign">
                <strong>{users.find(u => u.id === form.action_config?.user_id)?.name}</strong>
              </SummaryRow>
            )}

            {form.action_type === 'send_notification' && (
              <>
                <SummaryRow label="👥 Notify">
                  {(form.action_config?.user_ids || [])
                    .map((uid: string) => users.find(u => u.id === uid)?.name || uid)
                    .join(', ') || 'No users selected'}
                </SummaryRow>
                <SummaryRow label="💬 Message">
                  "{form.action_config?.message}"
                </SummaryRow>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-2">
        {step > 0 && (
          <button
            className="bg-white border border-gray-300 rounded-lg px-5 py-2.5 cursor-pointer text-sm text-slate-600"
            onClick={() => setStep(st => st - 1)}
          >
            ← Back
          </button>
        )}
        <button
          className={`bg-gradient-to-br from-[#6C47FF] to-[#4A90E2] text-white font-semibold px-7 py-2.5 rounded-lg border-0 text-sm transition-opacity ${
            step === 0 ? 'ml-auto' : ''
          } ${canNext() ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
          disabled={!canNext() || saving}
          onClick={step < 3 ? () => setStep(st => st + 1) : handleSave}
        >
          {step < 3
            ? 'Next →'
            : saving
              ? '⏳ Saving...'
              : isEdit
                ? '✅ Update Automation'
                : '✅ Save Automation'}
        </button>
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 mb-2.5 text-sm items-start">
    <span className="font-semibold text-[#6C47FF] min-w-[120px] shrink-0">{label}</span>
    <span className="text-slate-800 leading-relaxed">{children}</span>
  </div>
);

export default AutomationBuilder;
