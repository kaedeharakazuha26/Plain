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
  Trash2,
  FolderPlus,
  Upload
} from 'lucide-react';

export default function VsSidebar({
  files,
  openFileIds,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onCreateFile,
  onDeleteFile,
  onOpenFile,
  onOpenFolder,
  folderName = 'workspace',
  width
}) {
  const [openEditorsOpen, setOpenEditorsOpen] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
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

  return (
    <aside className="vs-sidebar" style={width ? { width: `${width}px` } : undefined}>
      <div className="sidebar-header">
        <span>Explorer: {folderName}</span>
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
            onClick={onOpenFolder}
            title="Open Folder..."
          >
            <FolderPlus size={14} />
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

      {/* WORKSPACE FILES SECTION (Clean, no hardcoded examples) */}
      <div className="sidebar-section" style={{ marginTop: '8px' }}>
        <div
          className="sidebar-section-title"
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
        >
          {workspaceOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span style={{ textTransform: 'uppercase' }}>{folderName}</span>
          <span className="file-item-badge" style={{ marginLeft: 'auto', fontSize: '9.5px' }}>
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {workspaceOpen && (
          <div className="file-tree-list">
            {/* Inline New File Form */}
            {isCreatingFile && (
              <form onSubmit={handleCreateSubmit} style={{ padding: '6px 12px' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="script_name.plain"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsCreatingFile(false);
                  }}
                  onBlur={() => {
                    if (!newFileName.trim()) setIsCreatingFile(false);
                  }}
                  style={{
                    width: '100%',
                    background: '#121214',
                    border: '1px solid var(--vscode-accent)',
                    borderRadius: '3px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#ffffff',
                    outline: 'none',
                    fontFamily: 'var(--font-code)'
                  }}
                />
              </form>
            )}

            {files.length === 0 && !isCreatingFile && (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                <p>No files in this workspace.</p>
                <button
                  className="btn-secondary"
                  onClick={() => setIsCreatingFile(true)}
                  style={{ marginTop: '8px', padding: '4px 8px', fontSize: '11px' }}
                >
                  <FilePlus size={12} />
                  <span>Create .plain file</span>
                </button>
              </div>
            )}

            {/* User workspace files */}
            {files.map(file => (
              <div
                key={file.id}
                className={`file-tree-item ${file.id === activeFileId ? 'active' : ''}`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="file-item-left">
                  <FileCode size={14} color="#34d399" />
                  <span>{file.name}</span>
                </div>
                {onDeleteFile && files.length > 1 && (
                  <button
                    className="tab-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${file.name}?`)) {
                        onDeleteFile(file.id);
                      }
                    }}
                    title={`Delete ${file.name}`}
                  >
                    <Trash2 size={12} color="var(--accent-rose)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
