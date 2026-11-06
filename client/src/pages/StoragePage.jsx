import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  UploadCloud,
  FolderPlus,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Trash2,
  Download,
  Copy,
  Check,
  Eye,
  Lock,
  Globe,
  Edit2,
  ChevronRight,
  RefreshCw,
  PieChart
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StoragePage() {
  const { currentProject } = useProject();

  const [currentFolder, setCurrentFolder] = useState('/');
  const [folderData, setFolderData] = useState({ folder: '/', subfolders: [], files: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // File Preview / Inspection Drawer
  const [selectedFile, setSelectedFile] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Drag and Drop State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadFiles = async (folder = currentFolder) => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [filesRes, statsRes] = await Promise.all([
        api.listFiles(currentProject.id, folder),
        api.getStorageStats(currentProject.id)
      ]);
      setFolderData(filesRes);
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading storage files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles(currentFolder);
  }, [currentProject, currentFolder]);

  // Handle Drag Over / Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadSelectedFiles(e.dataTransfer.files);
    }
  };

  const uploadSelectedFiles = async (filesList) => {
    if (!filesList || filesList.length === 0 || !currentProject) return;
    try {
      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < filesList.length; i++) {
        formData.append('files', filesList[i]);
      }
      formData.append('folder', currentFolder);
      formData.append('isPublic', 'true');

      await api.uploadFiles(currentProject.id, formData);
      setUploadModalOpen(false);
      loadFiles(currentFolder);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentProject) return;
    try {
      const fullPath = currentFolder === '/' ? `/${newFolderName.trim()}` : `${currentFolder}/${newFolderName.trim()}`;
      await api.createFolder(currentProject.id, fullPath);
      setNewFolderName('');
      setNewFolderModalOpen(false);
      loadFiles(currentFolder);
    } catch (err) {
      alert(`Error creating folder: ${err.message}`);
    }
  };

  // Rename File
  const handleRenameFile = async (e) => {
    e.preventDefault();
    if (!selectedFile || !newFileName.trim()) return;
    try {
      await api.updateFile(currentProject.id, selectedFile.id, { name: newFileName.trim() });
      setRenameModalOpen(false);
      loadFiles(currentFolder);
      setSelectedFile(prev => ({ ...prev, name: newFileName.trim() }));
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Public / Private
  const handleTogglePrivacy = async (file) => {
    if (!currentProject) return;
    try {
      const updated = await api.updateFile(currentProject.id, file.id, { isPublic: !file.isPublic });
      setSelectedFile(updated.file);
      loadFiles(currentFolder);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete File
  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.deleteFile(currentProject.id, fileId);
      if (selectedFile?.id === fileId) setSelectedFile(null);
      loadFiles(currentFolder);
    } catch (err) {
      alert(err.message);
    }
  };

  const copyUrl = (url) => {
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
    return File;
  };

  // Breadcrumbs builder
  const folderParts = currentFolder === '/' ? [''] : currentFolder.split('/');

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cloud File Storage</h1>
            <p className="text-xs text-slate-400">
              Encrypted object storage bucket with folder hierarchy, CDN-ready URLs, and access policies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={FolderPlus}
            onClick={() => setNewFolderModalOpen(true)}
          >
            New Folder
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={UploadCloud}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Files
          </Button>
        </div>
      </div>

      {/* Storage Quota & Stats Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Total Space</div>
              <div className="text-sm font-bold text-white mt-0.5">{formatBytes(stats.totalBytes)}</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Total Objects</div>
              <div className="text-sm font-bold text-white mt-0.5">{stats.totalFiles} files</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-400/10 text-purple-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Images</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {stats.typeDistribution?.images?.count || 0} ({formatBytes(stats.typeDistribution?.images?.bytes)})
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Documents</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {stats.typeDistribution?.documents?.count || 0} ({formatBytes(stats.typeDistribution?.documents?.bytes)})
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main File Browser with Breadcrumb & Drag/Drop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Breadcrumb Path Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-stratum-900 border border-white/5 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCurrentFolder('/')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                  currentFolder === '/' ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>bucket_root</span>
              </button>

              {currentFolder !== '/' &&
                folderParts.filter(Boolean).map((part, index, arr) => {
                  const subpath = '/' + arr.slice(0, index + 1).join('/');
                  const isCurrent = subpath === currentFolder;
                  return (
                    <React.Fragment key={subpath}>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <button
                        onClick={() => setCurrentFolder(subpath)}
                        className={`px-2 py-1 rounded-lg ${
                          isCurrent ? 'text-cyan-400 font-bold bg-cyan-500/10' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {part}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => loadFiles(currentFolder)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              title="Refresh directory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-white/10 hover:border-white/20 bg-stratum-900/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => uploadSelectedFiles(e.target.files)}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {uploading ? 'Uploading payload...' : 'Drop files here or click to browse'}
              </div>
              <p className="text-[11px] text-slate-500">
                Supports PNG, JPG, WEBP, SVG, PDF, MP4, JSON and binary files up to 100 MB.
              </p>
            </div>
          </div>

          {/* Subfolders & Files Grid */}
          <div className="bg-stratum-900 border border-white/5 rounded-2xl p-4 space-y-4">
            {/* Subfolders row */}
            {folderData.subfolders?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Folders ({folderData.subfolders.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {folderData.subfolders.map((fPath) => {
                    const folderName = fPath.split('/').filter(Boolean).pop();
                    return (
                      <div
                        key={fPath}
                        onClick={() => setCurrentFolder(fPath)}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-stratum-950/70 border border-white/5 hover:border-cyan-400/30 cursor-pointer transition-all text-xs text-slate-200 hover:text-cyan-300"
                      >
                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="truncate font-medium">{folderName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files list */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>Files in Directory ({folderData.files?.length || 0})</span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  Loading files...
                </div>
              ) : folderData.files?.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 font-mono">
                  No files in this folder. Drop a file above to upload.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {folderData.files.map((file) => {
                    const Icon = getFileIcon(file.mimeType);
                    const isSelected = selectedFile?.id === file.id;
                    const isImg = file.mimeType?.startsWith('image/');

                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-200 shadow-sm'
                            : 'bg-stratum-950/60 border-white/5 text-slate-300 hover:border-white/15'
                        }`}
                      >
                        {/* Thumbnail / Icon */}
                        <div className="w-12 h-12 rounded-lg bg-stratum-900 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {isImg ? (
                            <img
                              src={`/storage/${currentProject.id}/preview/${file.id}`}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <Icon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        {/* File Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-slate-200">{file.name}</div>
                          <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-500">
                            <span>{formatBytes(file.size)}</span>
                            <span>•</span>
                            <span>{file.isPublic ? 'Public' : 'Private'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Inspector / Details Drawer (Right Column) */}
        <div className="bg-stratum-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          {selectedFile ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    FILE INSPECTION
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1 break-all">{selectedFile.name}</h3>
                </div>
                <Badge variant={selectedFile.isPublic ? 'emerald' : 'amber'}>
                  {selectedFile.isPublic ? 'PUBLIC' : 'PROTECTED'}
                </Badge>
              </div>

              {/* Preview Window */}
              <div className="w-full h-48 rounded-xl bg-stratum-950 border border-white/10 flex items-center justify-center overflow-hidden">
                {selectedFile.mimeType?.startsWith('image/') ? (
                  <img
                    src={`/storage/${currentProject.id}/preview/${selectedFile.id}`}
                    alt={selectedFile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <FileText className="w-12 h-12" />
                    <span className="text-xs font-mono">{selectedFile.mimeType}</span>
                  </div>
                )}
              </div>

              {/* File Metadata List */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">File ID:</span>
                  <span className="text-slate-300 select-all">{selectedFile.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Size:</span>
                  <span className="text-slate-300">{formatBytes(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">MIME Type:</span>
                  <span className="text-slate-300">{selectedFile.mimeType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Folder:</span>
                  <span className="text-slate-300">{selectedFile.folder}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Uploaded:</span>
                  <span className="text-slate-300">{new Date(selectedFile.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* URL Action Links */}
              <div className="space-y-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-center"
                  icon={copiedLink ? Check : Copy}
                  onClick={() => copyUrl(selectedFile.publicUrl || selectedFile.downloadUrl)}
                >
                  {copiedLink ? 'URL Copied!' : 'Copy Download / Embed URL'}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 justify-center"
                    icon={selectedFile.isPublic ? Lock : Globe}
                    onClick={() => handleTogglePrivacy(selectedFile)}
                  >
                    {selectedFile.isPublic ? 'Make Private' : 'Make Public'}
                  </Button>

                  <button
                    onClick={() => {
                      setNewFileName(selectedFile.name);
                      setRenameModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-stratum-800 border border-white/10 text-slate-300 hover:text-white"
                    title="Rename file"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteFile(selectedFile.id)}
                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <HardDrive className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-400">No File Selected</div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Click on any file to inspect metadata, generate embed URLs, toggle visibility or preview contents.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Folder */}
      <Modal isOpen={newFolderModalOpen} onClose={() => setNewFolderModalOpen(false)} title="Create Folder">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Folder Name</label>
            <input
              type="text"
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. avatars, invoices, assets"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setNewFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rename File */}
      <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Rename File">
        <form onSubmit={handleRenameFile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">New File Name</label>
            <input
              type="text"
              required
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Rename File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

