import React from 'react';
import { FileCode, X, Plus, ChevronRight } from 'lucide-react';

export default function VsEditorTabs({
  files,
  openFileIds,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onNewFile
}) {
  const openFiles = files.filter(f => openFileIds.includes(f.id));
  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <>
      <div className="editor-tabs-bar">
        {openFiles.map(file => {
          const isActive = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`editor-tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFile(file.id)}
            >
              <FileCode size={13} color="#38bdf8" />
              <span>{file.name}</span>
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.id);
                }}
                title="Close"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          className="btn-new-tab"
          onClick={onNewFile}
          title="New plain file"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Breadcrumb line */}
      <div className="vs-breadcrumbs">
        <span>plain-lang</span>
        <ChevronRight size={12} />
        <span>{activeFile?.category || 'workspace'}</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
          {activeFile?.name || 'Untitled.plain'}
        </span>
      </div>
    </>
  );
}
