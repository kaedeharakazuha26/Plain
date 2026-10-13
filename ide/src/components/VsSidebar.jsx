import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FilePlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  X,
  Trash2
} from 'lucide-react';

export default function VsSidebar({
  files,
  openFileIds,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onCreateFile,
  onDeleteFile,
  width
}) {
  const [examplesOpen, setExamplesOpen] = useState(true);
  const [openEditorsOpen, setOpenEditorsOpen] = useState(true);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (newFileName.trim()) {
      let finalName = newFileName.trim();
      if (!finalName.endsWith('.plain')) {
        finalName += '.plain';
      }
      onCreateFile(finalName);
      setNewFileName('');
      setIsCreatingFile(false);
    }
  };

  const openFiles = files.filter(f => openFileIds.includes(f.id));
  const exampleFiles = files.filter(f => f.category === 'examples');
  const userFiles = files.filter(f => f.category !== 'examples');

  return (
    <aside className="vs-sidebar" style={width ? { width: `${width}px` } : undefined}>
      <div className="sidebar-header">
        <span>Explorer: Plain-Lang</span>
        <div className="sidebar-actions">
          <button
            className="sidebar-action-btn"
            onClick={() => setIsCreatingFile(true)}
            title="New .plain File"
          >
            <FilePlus size={14} />
          </button>
          <button
            className="sidebar-action-btn"
            onClick={() => {}}
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* OPEN EDITORS SECTION */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          onClick={() => setOpenEditorsOpen(!openEditorsOpen)}
        >
          {openEditorsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>OPEN EDITORS</span>
        </div>

        {openEditorsOpen && (
          <div className="file-tree-list">
            {openFiles.map(file => (
              <div
                key={file.id}
                className={`file-tree-item ${file.id === activeFileId ? 'active' : ''}`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="file-item-left">
                  <FileCode size={14} color="#38bdf8" />
                  <span>{file.name}</span>
                </div>
                <button
                  className="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file.id);
                  }}
                  title="Close file"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WORKSPACE FILES SECTION */}
      <div className="sidebar-section" style={{ marginTop: '8px' }}>
        <div
          className="sidebar-section-title"
          onClick={() => setExamplesOpen(!examplesOpen)}
        >
          {examplesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>PLAIN-LANG WORKSPACE</span>
        </div>

        {/* Examples folder */}
        {examplesOpen && (
          <div className="file-tree-list">
            <div
              className="file-tree-item"
              style={{ paddingLeft: '14px', color: '#e2e8f0', fontWeight: 500 }}
            >
              <div className="file-item-left">
                <FolderOpen size={14} color="#f59e0b" />
                <span>examples</span>
              </div>
              <span className="file-item-badge">{exampleFiles.length} files</span>
            </div>

            {exampleFiles.map(file => (
              <div
                key={file.id}
                className={`file-tree-item ${file.id === activeFileId ? 'active' : ''}`}
                style={{ paddingLeft: '28px' }}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="file-item-left">
                  <FileCode size={13} color="#38bdf8" />
                  <span>{file.name}</span>
                </div>
              </div>
            ))}

            {/* User created files */}
            {userFiles.map(file => (
              <div
                key={file.id}
                className={`file-tree-item ${file.id === activeFileId ? 'active' : ''}`}
                style={{ paddingLeft: '14px' }}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="file-item-left">
                  <FileCode size={14} color="#34d399" />
                  <span>{file.name}</span>
                </div>
                {onDeleteFile && (
                  <button
                    className="tab-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    title="Delete file"
                  >
                    <Trash2 size={11} color="var(--accent-rose)" />
                  </button>
                )}
              </div>
            ))}

            {/* Inline New File Input */}
            {isCreatingFile && (
              <form onSubmit={handleCreateSubmit} style={{ padding: '4px 14px' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="filename.plain"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => {
                    if (!newFileName.trim()) setIsCreatingFile(false);
                  }}
                  style={{
                    width: '100%',
                    background: '#181818',
                    border: '1px solid var(--vscode-accent)',
                    borderRadius: '2px',
                    padding: '3px 6px',
                    fontSize: '12px',
                    color: '#ffffff',
                    outline: 'none',
                    fontFamily: 'var(--font-code)'
                  }}
                />
              </form>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
