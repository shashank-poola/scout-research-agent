import { useState, useCallback } from 'react';
import type { Session } from './lib/types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ResearchChat from './components/ResearchChat';
import './App.css';

type View = 'home' | 'chat';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStartResearch = useCallback((query: string) => {
    setActiveQuery(query);
    setActiveSession(null);
    setSidebarCollapsed(false);
    setView('chat');
  }, []);

  const handleOpenSession = useCallback((session: Session) => {
    setActiveQuery(session.company_name);
    setActiveSession(session);
    setSidebarCollapsed(session.status === 'done');
    setView('chat');
  }, []);

  const handleBack = useCallback(() => {
    setView('home');
    setSidebarCollapsed(false);
    setActiveSession(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  return (
    <div className="layout">
      <Sidebar
        activeView={view === 'home' ? 'home' : ''}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onNavigate={(dest) => { if (dest === 'home') handleBack(); }}
        onNewResearch={() => {
          setSidebarCollapsed(false);
          setView('home');
        }}
      />

      <main className="main">
        {view === 'home' && (
          <Dashboard
            onStartResearch={handleStartResearch}
            onOpenSession={handleOpenSession}
            refreshKey={refreshKey}
          />
        )}

        {view === 'chat' && (
          <ResearchChat
            key={`${activeQuery}-${activeSession?.id ?? 'new'}`}
            initialQuery={activeQuery}
            existingSession={activeSession ?? undefined}
            onBack={handleBack}
            onSidebarCollapse={handleSidebarCollapse}
          />
        )}
      </main>
    </div>
  );
}
