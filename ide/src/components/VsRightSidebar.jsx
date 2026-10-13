import React, { useState } from 'react';
import { Sparkles, BookOpen, X, Code2 } from 'lucide-react';
import SentenceBar from './SentenceBar';
import GrammarDocs from './GrammarDocs';

export default function VsRightSidebar({
  onInsertSnippet,
  onClose,
  width
}) {
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' | 'reference'

  return (
    <aside className="vs-right-sidebar" style={width ? { width: `${width}px` } : undefined}>
      {/* Top Header */}
      <div className="right-sidebar-header">
        <div className="sidebar-tab-switch">
          <button
            className={`sidebar-tab-switch-btn ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('builder')}
            title="Sentence Builder with instructions"
          >
            <Sparkles size={12} color="var(--accent-cyan)" />
            <span>Sentence Builder</span>
          </button>

          <button
            className={`sidebar-tab-switch-btn ${activeTab === 'reference' ? 'active' : ''}`}
            onClick={() => setActiveTab('reference')}
            title="Plain Language Reference Documentation"
          >
            <BookOpen size={12} color="var(--accent-emerald)" />
            <span>Language Reference</span>
          </button>
        </div>

        <button
          className="dock-action-btn"
          onClick={onClose}
          title="Close Sidebar"
        >
          <X size={13} />
        </button>
      </div>

      {/* Content Area */}
      <div className="right-sidebar-content">
        {activeTab === 'builder' ? (
          <SentenceBar onInsert={onInsertSnippet} />
        ) : (
          <GrammarDocs onInsert={onInsertSnippet} />
        )}
      </div>
    </aside>
  );
}
