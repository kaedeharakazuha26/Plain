import React from 'react';
import {
  Files,
  BookOpen,
  Layers,
  Settings,
  Terminal,
  HelpCircle
} from 'lucide-react';

export default function VsActivityBar({
  activeView,
  setActiveView,
  toggleBottomDock
}) {
  return (
    <aside className="vs-activitybar">
      <div className="activitybar-top">
        <div
          className={`activitybar-icon ${activeView === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveView(activeView === 'explorer' ? null : 'explorer')}
          title="Explorer (Ctrl + Shift + E)"
        >
          <Files size={20} />
        </div>

        <div
          className={`activitybar-icon ${activeView === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveView(activeView === 'guide' ? null : 'guide')}
          title="English Language Guide & Cheat Sheet"
        >
          <BookOpen size={20} />
        </div>

        <div
          className={`activitybar-icon ${activeView === 'inspector' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('inspector');
            toggleBottomDock(true);
          }}
          title="AST & Tokens Inspector"
        >
          <Layers size={20} />
        </div>
      </div>

      <div className="activitybar-bottom">
        <div
          className="activitybar-icon"
          onClick={() => toggleBottomDock()}
          title="Toggle Terminal"
        >
          <Terminal size={19} />
        </div>
        <div
          className="activitybar-icon"
          title="Settings & Keybindings"
        >
          <Settings size={19} />
        </div>
      </div>
    </aside>
  );
}
