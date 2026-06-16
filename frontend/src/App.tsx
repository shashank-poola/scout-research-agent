import { useState, useCallback, useEffect, useRef } from 'react';
import type { Session, CreateSessionPayload } from './lib/types';
import { listSessions, createSession } from './routes/sessions';
import { runWorkflow } from './routes/workflow';
import Sidebar from './components/sidebar/Sidebar';
import Dashboard from './components/dashboard/Dashboard';
import ResearchChat from './components/chat-interface/ResearchChat';
import CommandPalette from './components/sidebar/CommandPalette';
import NewResearchModal from './components/research-agent/NewResearchModal';
import './App.css';

type View = 'home' | 'chat';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');
  const paletteOpenRef = useRef(false);

  useEffect(() => { paletteOpenRef.current = commandPaletteOpen; }, [commandPaletteOpen]);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => {});
  }, [refreshKey]);

  // Opens the 3-field modal pre-filled with whatever the user typed
  const handleStartResearch = useCallback((query: string) => {
    setPendingQuery(query);
    setModalOpen(true);
  }, []);

  // Called when user submits the modal form
  const handleModalSubmit = useCallback(async (payload: CreateSessionPayload) => {
    setModalOpen(false);
    try {
      const session = await createSession(payload);
      await runWorkflow(session.id);
      setActiveQuery(payload.company_name);
      setActiveSession({ ...session, status: 'running' });
      setSidebarCollapsed(false);
      setView('chat');
    } catch {
      // createSession or runWorkflow failed — re-open modal so user can retry
      setModalOpen(true);
    }
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isInput || paletteOpenRef.current) return;
      if (e.key === 'n') { e.preventDefault(); setSidebarCollapsed(false); setView('home'); }
      if (e.key === '/') { e.preventDefault(); setCommandPaletteOpen(true); }
      if (e.key === 'r' || e.key === 'h') { e.preventDefault(); handleBack(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleBack]);

  return (
    <div className="layout">
      <Sidebar
        activeView={view === 'home' ? 'home' : ''}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        onNavigate={(dest) => { if (dest === 'home') handleBack(); }}
        onNewResearch={() => { setSidebarCollapsed(false); setView('home'); }}
        onOpenSession={handleOpenSession}
        onSearchOpen={() => setCommandPaletteOpen(true)}
        sessions={sessions}
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

      {modalOpen && (
        <NewResearchModal
          initialQuery={pendingQuery}
          onSubmit={handleModalSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {commandPaletteOpen && (
        <CommandPalette
          sessions={sessions}
          onClose={() => setCommandPaletteOpen(false)}
          onNewResearch={() => {
            setSidebarCollapsed(false);
            setView('home');
            setCommandPaletteOpen(false);
          }}
          onNavigate={(dest) => {
            if (dest === 'home') handleBack();
            setCommandPaletteOpen(false);
          }}
          onOpenSession={(s) => {
            handleOpenSession(s);
            setCommandPaletteOpen(false);
          }}
        />
      )}
    </div>
  );
}
