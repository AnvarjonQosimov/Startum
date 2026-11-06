import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  RefreshCw,
  FolderTree,
  FileText,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Check,
  X,
  Code2,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  ListFilter,
  Sparkles
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { realtime } from '../services/realtime';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { JsonViewer } from '../components/common/JsonViewer';

export function DatabasePage() {
  const { currentProject } = useProject();

  // State
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [totalDocs, setTotalDocs] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('_createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterField, setFilterField] = useState('');
  const [filterOp, setFilterOp] = useState('==');
  const [filterVal, setFilterVal] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  // Modals
  const [newCollectionModalOpen, setNewCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [customDocId, setCustomDocId] = useState('');
  const [docJsonInput, setDocJsonInput] = useState('{\n  "title": "Example Document",\n  "count": 10,\n  "isActive": true,\n  "tags": ["cloud", "database"]\n}');
  const [fieldEditorMode, setFieldEditorMode] = useState(false); // toggle between visual field editor and JSON editor
  const [editedDocData, setEditedDocData] = useState({});

  // Loading states
  const [loadingCols, setLoadingCols] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [liveChangePing, setLiveChangePing] = useState(false);

  // 1. Load collections on mount or project switch
  useEffect(() => {
    if (!currentProject) return;

    let isMounted = true;
    async function loadCollections() {
      try {
        setLoadingCols(true);
        const res = await api.getCollections(currentProject.id);
        if (isMounted) {
          setCollections(res.collections || []);
          if (res.collections && res.collections.length > 0) {
            setSelectedCollection(res.collections[0].name);
          } else {
            setSelectedCollection(null);
            setDocuments([]);
            setSelectedDoc(null);
          }
        }
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        if (isMounted) setLoadingCols(false);
      }
    }

    loadCollections();
    return () => { isMounted = false; };
  }, [currentProject]);

  // 2. Load documents when collection, filters, or sorting changes
  const fetchDocuments = async () => {
    if (!currentProject || !selectedCollection) return;
    try {
      setLoadingDocs(true);
      const params = {
        sortBy,
        sortOrder,
        search: searchQuery,
        limit: 100
      };
      if (activeFilters.length > 0) {
        params.filters = JSON.stringify(activeFilters);
      }

      const res = await api.queryDocuments(currentProject.id, selectedCollection, params);
      setDocuments(res.documents || []);
      setTotalDocs(res.total || 0);

      // Keep selection or pick first doc
      if (res.documents && res.documents.length > 0) {
        if (!selectedDoc || !res.documents.some(d => d._id === selectedDoc._id)) {
          setSelectedDoc(res.documents[0]);
          setEditedDocData(res.documents[0]);
        } else {
          const fresh = res.documents.find(d => d._id === selectedDoc._id);
          setSelectedDoc(fresh);
          setEditedDocData(fresh);
        }
      } else {
        setSelectedDoc(null);
        setEditedDocData({});
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentProject, selectedCollection, sortBy, sortOrder, activeFilters]);

  // 3. Real-time Subscription to selected collection
  useEffect(() => {
    if (!currentProject || !selectedCollection) return;

    const unsubscribe = realtime.subscribeDb(currentProject.id, selectedCollection, (event) => {
      // Flash live update indicator
      setLiveChangePing(true);
      setTimeout(() => setLiveChangePing(false), 1500);

      // Refresh documents smoothly
      fetchDocuments();
    });

    return () => {
      unsubscribe();
    };
  }, [currentProject, selectedCollection]);

  // Create Collection
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim() || !currentProject) return;
    try {
      await api.createCollection(currentProject.id, newCollectionName.trim());
      const res = await api.getCollections(currentProject.id);
      setCollections(res.collections);
      setSelectedCollection(newCollectionName.trim());
      setNewCollectionName('');
      setNewCollectionModalOpen(false);
    } catch (err) {
      alert(`Error creating collection: ${err.message}`);
    }
  };

  // Delete Collection
  const handleDeleteCollection = async (colName) => {
    if (confirm(`Are you sure you want to delete collection "${colName}" and all its documents?`)) {
      try {
        await api.deleteCollection(currentProject.id, colName);
        const res = await api.getCollections(currentProject.id);
        setCollections(res.collections);
        if (res.collections.length > 0) {
          setSelectedCollection(res.collections[0].name);
        } else {
          setSelectedCollection(null);
          setDocuments([]);
          setSelectedDoc(null);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Create Document
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!currentProject || !selectedCollection) return;
    try {
      let parsed;
      try {
        parsed = JSON.parse(docJsonInput);
      } catch (jsonErr) {
        alert(`Invalid JSON format: ${jsonErr.message}`);
        return;
      }

      if (customDocId.trim()) {
        parsed._id = customDocId.trim();
      }

      const res = await api.createDocument(currentProject.id, selectedCollection, parsed);
      setNewDocModalOpen(false);
      setCustomDocId('');
      fetchDocuments();
      setSelectedDoc(res.document);
      setEditedDocData(res.document);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!currentProject || !selectedCollection) return;
    if (confirm(`Delete document "${docId}"?`)) {
      try {
        await api.deleteDocument(currentProject.id, selectedCollection, docId);
        fetchDocuments();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Save Document updates (Field edit mode or JSON edit mode)
  const handleSaveDocUpdates = async () => {
    if (!currentProject || !selectedCollection || !selectedDoc) return;
    try {
      let dataToSave = editedDocData;
      if (typeof editedDocData === 'string') {
        dataToSave = JSON.parse(editedDocData);
      }

      const res = await api.updateDocument(
        currentProject.id,
        selectedCollection,
        selectedDoc._id,
        dataToSave,
        true
      );
      setSelectedDoc(res.document);
      setEditedDocData(res.document);
      fetchDocuments();
      alert('Document saved successfully!');
    } catch (err) {
      alert(`Error updating document: ${err.message}`);
    }
  };

  // Add field to current doc
  const handleAddField = () => {
    const fieldName = prompt('Enter new field name:');
    if (!fieldName) return;
    setEditedDocData(prev => ({
      ...prev,
      [fieldName]: 'new value'
    }));
  };

  // Filter management
  const handleAddFilter = () => {
    if (!filterField.trim()) return;
    let val = filterVal;
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);

    setActiveFilters([...activeFilters, { field: filterField.trim(), op: filterOp, value: val }]);
    setFilterField('');
    setFilterVal('');
  };

  const removeFilter = (idx) => {
    setActiveFilters(activeFilters.filter((_, i) => i !== idx));
  };

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Database Explorer</h1>
              {liveChangePing && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                  <Sparkles className="w-3 h-3" /> Realtime Sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Schemaless document-oriented engine with nested fields, indexing & live subscriptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={() => fetchDocuments()}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            disabled={!selectedCollection}
            onClick={() => setNewDocModalOpen(true)}
          >
            Add Document
          </Button>
        </div>
      </div>

      {/* 3-Column Tree Explorer: [1. Collections] -> [2. Documents] -> [3. Document Editor/Inspector] */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[640px]">
        {/* Column 1: Collections Tree (3 cols) */}
        <div className="md:col-span-3 bg-stratum-900 border border-white/5 rounded-2xl p-3 flex flex-col">
          <div className="flex items-center justify-between px-2 py-2 mb-2 border-b border-white/5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-cyan-400" /> Collections ({collections.length})
            </span>
            <button
              onClick={() => setNewCollectionModalOpen(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Create collection"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {collections.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No collections yet.<br />
                <button
                  onClick={() => setNewCollectionModalOpen(true)}
                  className="text-cyan-400 hover:underline mt-2 inline-block"
                >
                  Create your first collection
                </button>
              </div>
            ) : (
              collections.map((col) => {
                const isSelected = selectedCollection === col.name;
                return (
                  <div
                    key={col.name}
                    onClick={() => {
                      setSelectedCollection(col.name);
                      setSelectedDoc(null);
                    }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/25 shadow-sm'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate">{col.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-mono text-[10px] text-slate-500">
                        {col.documentCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(col.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Delete collection"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Documents List with Search & Filtering (4 cols) */}
        <div className="md:col-span-4 bg-stratum-900 border border-white/5 rounded-2xl p-3 flex flex-col">
          {/* Collection Header + Search Input */}
          <div className="px-2 py-1 mb-2 border-b border-white/5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Documents in <span className="text-cyan-400 font-semibold">{selectedCollection || '...'}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{totalDocs} total</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchDocuments(); }}
                className="w-full bg-stratum-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {/* Quick Filter Bar */}
            <div className="flex items-center gap-1.5 mt-2">
              <input
                type="text"
                placeholder="field"
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="w-1/3 bg-stratum-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
              />
              <select
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className="bg-stratum-950 border border-white/10 rounded-lg px-1.5 py-1 text-[11px] font-mono text-slate-300"
              >
                <option value="==">==</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="contains">contains</option>
              </select>
              <input
                type="text"
                placeholder="value"
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
                className="w-1/3 bg-stratum-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
              />
              <button
                onClick={handleAddFilter}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[11px] font-semibold hover:bg-cyan-500/30"
              >
                +
              </button>
            </div>

            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeFilters.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-cyanGlow/10 text-cyan-300 border border-cyanGlow/20 px-2 py-0.5 rounded-full"
                  >
                    {f.field} {f.op} {String(f.value)}
                    <button onClick={() => removeFilter(i)} className="hover:text-white">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {loadingDocs ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                Querying documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No documents found.
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = selectedDoc?._id === doc._id;
                // Pick a descriptive title field or default to ID
                const label = doc.title || doc.name || doc.email || doc.orderNumber || doc._id;
                return (
                  <div
                    key={doc._id}
                    onClick={() => {
                      setSelectedDoc(doc);
                      setEditedDocData(doc);
                    }}
                    className={`group p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-sm'
                        : 'bg-stratum-950/40 border-white/5 text-slate-300 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate max-w-[170px] text-slate-200">
                        {label}
                      </div>
                      <span className="font-mono text-[9px] text-slate-500">
                        {new Date(doc._createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate mt-1">
                      {doc._id}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Document Inspector / Editor (5 cols) */}
        <div className="md:col-span-5 bg-stratum-900 border border-white/5 rounded-2xl p-4 flex flex-col">
          {selectedDoc ? (
            <>
              {/* Document Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    DOCUMENT INSPECTOR
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-200 truncate mt-0.5">
                    {selectedDoc._id}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFieldEditorMode(!fieldEditorMode)}
                    className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                      fieldEditorMode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
                        : 'bg-stratum-800 text-slate-400 border-white/10 hover:text-white'
                    }`}
                    title="Toggle JSON / Field Editor"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{fieldEditorMode ? 'JSON Mode' : 'Fields Mode'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDocument(selectedDoc._id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Document Body Editor */}
              <div className="flex-1 overflow-y-auto mb-4">
                {fieldEditorMode ? (
                  /* Raw JSON Editor */
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400 font-mono">
                      Edit document JSON directly:
                    </div>
                    <textarea
                      rows={18}
                      value={typeof editedDocData === 'string' ? editedDocData : JSON.stringify(editedDocData, null, 2)}
                      onChange={(e) => setEditedDocData(e.target.value)}
                      className="w-full bg-stratum-950 border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
                    />
                  </div>
                ) : (
                  /* Interactive Typed Fields Inspector */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-semibold">Document Fields</span>
                      <Button size="xs" variant="outline" onClick={handleAddField}>
                        + Add Field
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {Object.keys(editedDocData).map((fieldKey) => {
                        const val = editedDocData[fieldKey];
                        const isSystemField = fieldKey.startsWith('_');
                        const valType = Array.isArray(val) ? 'array' : typeof val;

                        return (
                          <div
                            key={fieldKey}
                            className="p-2.5 rounded-xl bg-stratum-950/70 border border-white/5 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-cyan-300 font-semibold">{fieldKey}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-slate-500 uppercase px-1.5 py-0.2 rounded bg-white/5">
                                  {valType}
                                </span>
                                {!isSystemField && (
                                  <button
                                    onClick={() => {
                                      const copy = { ...editedDocData };
                                      delete copy[fieldKey];
                                      setEditedDocData(copy);
                                    }}
                                    className="text-slate-500 hover:text-rose-400"
                                    title="Delete field"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Field input based on type */}
                            {isSystemField ? (
                              <div className="font-mono text-xs text-slate-400 truncate">
                                {String(val)}
                              </div>
                            ) : valType === 'boolean' ? (
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bool_${fieldKey}`}
                                    checked={val === true}
                                    onChange={() => setEditedDocData({ ...editedDocData, [fieldKey]: true })}
                                  />
                                  true
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`bool_${fieldKey}`}
                                    checked={val === false}
                                    onChange={() => setEditedDocData({ ...editedDocData, [fieldKey]: false })}
                                  />
                                  false
                                </label>
                              </div>
                            ) : valType === 'object' || valType === 'array' ? (
                              <JsonViewer data={val} level={1} />
                            ) : (
                              <input
                                type={valType === 'number' ? 'number' : 'text'}
                                value={val === null ? '' : val}
                                onChange={(e) => {
                                  const newVal = valType === 'number' ? Number(e.target.value) : e.target.value;
                                  setEditedDocData({ ...editedDocData, [fieldKey]: newVal });
                                }}
                                className="w-full bg-stratum-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Footer */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Last updated: {new Date(selectedDoc._updatedAt || selectedDoc._createdAt).toLocaleTimeString()}
                </span>
                <Button size="sm" variant="primary" onClick={handleSaveDocUpdates}>
                  Save Changes
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <FileText className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-400">No Document Selected</div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select a document from the middle pane or create a new document to inspect and edit its fields.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Collection */}
      <Modal
        isOpen={newCollectionModalOpen}
        onClose={() => setNewCollectionModalOpen(false)}
        title="Create New Collection"
      >
        <form onSubmit={handleCreateCollection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Collection Name</label>
            <input
              type="text"
              required
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="e.g. products, customers, transactions"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setNewCollectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Collection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Document */}
      <Modal
        isOpen={newDocModalOpen}
        onClose={() => setNewDocModalOpen(false)}
        title={`Add Document to "${selectedCollection}"`}
        size="lg"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Document ID (Leave blank for automatic UUID)
            </label>
            <input
              type="text"
              value={customDocId}
              onChange={(e) => setCustomDocId(e.target.value)}
              placeholder="e.g. user_99341 or doc_alpha (Optional)"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Document Payload (JSON)
            </label>
            <textarea
              rows={10}
              required
              value={docJsonInput}
              onChange={(e) => setDocJsonInput(e.target.value)}
              className="w-full bg-stratum-950 border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setNewDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Insert Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

