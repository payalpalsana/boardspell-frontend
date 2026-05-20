import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import mondaySdk from 'monday-sdk-js';
import Header from './components/Header';
import AutomationList from './pages/AutomationList';
import AutomationBuilder from './pages/AutomationBuilder';
import ExecutionLogs from './pages/ExecutionLogs';

// Change this to YOUR workspace ID for local development
const DEFAULT_WORKSPACE_ID = '34501501';
const monday = mondaySdk();

function App() {
  const [workspaceId, setWorkspaceId] = useState<string>(DEFAULT_WORKSPACE_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    monday.get('context')
      .then((res: any) => {
        const accountId = res?.data?.account?.id;
        if (accountId) {
          setWorkspaceId(String(accountId));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="text-6xl mb-4">⚡</div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading Boardspell...</h2>
      <p className="text-slate-500">Cross-Board Automation Builder</p>
    </div>
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <Routes>
          <Route path="/" element={<AutomationList workspaceId={workspaceId} />} />
          <Route path="/builder" element={<AutomationBuilder workspaceId={workspaceId} />} />
          <Route path="/builder/:id" element={<AutomationBuilder workspaceId={workspaceId} />} />
          <Route path="/logs/:automationId" element={<ExecutionLogs />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
