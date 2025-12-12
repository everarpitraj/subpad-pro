
import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, Download, Plus, Clock, RefreshCw, FileText, MonitorPlay, ChevronDown, Search, FileDown, CheckSquare, Square, Copy, Check, Loader2, Sparkles, Folder } from 'lucide-react';
import { generateId, timeToMs, msToTime } from './utils/idUtils'; // Note: Adjust imports as needed if in same file or different modules
import { timeToMs as convTimeToMs } from './utils/timeUtils'; // Renaming to avoid conflict if any, actually timeUtils has both
import { parseSRT, formatNotepadContent, baseNameFrom } from './utils/parserUtils';
import { readFileAsText } from './utils/fileUtils';
import { downloadSingleFile, downloadZipBundle } from './utils/downloadUtils';
import { callAiApi } from './utils/aiUtils';

import Header from './components/Header';
import SubtitleRow from './components/SubtitleRow';
import SettingsModal from './components/SettingsModal';
import HighlightedBackdrop from './components/HighlightedBackdrop';

const App = () => {
    const [darkMode, setDarkMode] = useState(true);
    const [isZipping, setIsZipping] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    // -- State: Multiple Files Management --
    const initialSubs = [
        { id: generateId(), startTime: '00:01:39,520', endTime: '00:01:41,940', text: "I've had so many dreams." },
        { id: generateId(), startTime: '00:01:42,900', endTime: '00:01:45,840', text: "Like I was living\nin different parallel universes." },
        { id: generateId(), startTime: '00:01:45,880', endTime: '00:01:47,980', text: "Each universe had its version of you." }
    ];

    const [files, setFiles] = useState([
        {
            id: 'default-1',
            name: 'Generation.S01E20.en.srt',
            subtitles: initialSubs,
            notepadContent: formatNotepadContent(initialSubs),
            isDirty: false
        }
    ]);
    const [activeFileId, setActiveFileId] = useState('default-1');

    // UI states
    const [showImportMenu, setShowImportMenu] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFilesForDownload, setSelectedFilesForDownload] = useState([]);

    // Advanced Download State
    const [exportFormat, setExportFormat] = useState('srt');

    // Notepad Tool States
    const [notepadSearchQuery, setNotepadSearchQuery] = useState("");
    const [notepadCopied, setNotepadCopied] = useState(false);
    const [matchCount, setMatchCount] = useState(0);

    // AI & Settings States
    const [showSettings, setShowSettings] = useState(false);
    const [aiInstruction, setAiInstruction] = useState("Translate the following subtitle text to Spanish. Maintain line numbers and timestamps if present.");
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [isTranslatingAll, setIsTranslatingAll] = useState(false);

    // Import/export progress
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importSummary, setImportSummary] = useState(null);

    // Refs
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const rawFileInputRef = useRef(null);
    const rawFolderInputRef = useRef(null);
    const importMenuRef = useRef(null);
    const exportMenuRef = useRef(null);
    const notepadTextAreaRef = useRef(null);
    const backdropRef = useRef(null);

    // Derived
    const activeFile = files.find(f => f.id === activeFileId) || files[0];

    // Load Settings from LocalStorage
    useEffect(() => {
        const savedInstruction = localStorage.getItem('subpad_ai_instruction');
        if (savedInstruction) {
            setAiInstruction(savedInstruction);
        }
    }, []);

    const saveSettings = () => {
        localStorage.setItem('subpad_ai_instruction', aiInstruction);
        setShowSettings(false);
    };

    // Click Outside Handlers
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (importMenuRef.current && !importMenuRef.current.contains(event.target)) setShowImportMenu(false);
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setShowExportMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync scroll between textarea and backdrop
    const handleScroll = (e) => {
        if (backdropRef.current) {
            backdropRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Calculate Match Count
    useEffect(() => {
        if (!notepadSearchQuery) {
            setMatchCount(0);
            return;
        }
        try {
            const matches = activeFile.notepadContent.match(new RegExp(notepadSearchQuery, 'gi'));
            setMatchCount(matches ? matches.length : 0);
        } catch (err) {
            setMatchCount(0);
        }
    }, [notepadSearchQuery, activeFile.notepadContent]);

    // -- Improved file processing (robust & batched) ---

    const processFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;
        setIsImporting(true);
        setImportProgress(0);
        setImportSummary(null);

        const filesArr = Array.from(fileList);
        const total = filesArr.length;
        let processed = 0;
        const readPromises = filesArr.map(f =>
            readFileAsText(f)
                .then(res => ({ status: 'fulfilled', ...res }))
                .catch(err => ({ status: 'rejected', ...err }))
        );

        const settled = await Promise.all(readPromises);
        const newFiles = [];
        const errors = [];

        for (const item of settled) {
            processed++;
            setImportProgress(Math.round((processed / total) * 100));

            if (item.status === 'fulfilled') {
                const { file, text } = item;
                const parsed = parseSRT(text);
                if (parsed.length > 0) {
                    newFiles.push({
                        id: generateId(),
                        name: file.name,
                        subtitles: parsed,
                        notepadContent: formatNotepadContent(parsed),
                        isDirty: false
                    });
                } else {
                    if (file.name.toLowerCase().endsWith('.txt')) {
                        const base = baseNameFrom(file.name);
                        newFiles.push({
                            id: generateId(),
                            name: `${base}.srt`,
                            subtitles: [],
                            notepadContent: text,
                            isDirty: true
                        });
                    } else {
                        newFiles.push({
                            id: generateId(),
                            name: file.name,
                            subtitles: [],
                            notepadContent: text,
                            isDirty: true
                        });
                    }
                }
            } else {
                errors.push({ name: item.file.name, error: item.error });
            }
            if (processed % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        setFiles(prev => {
            const existingByBase = new Map(prev.map(p => [baseNameFrom(p.name).toLowerCase(), p]));
            const merged = [...prev];

            for (const nf of newFiles) {
                const base = baseNameFrom(nf.name).toLowerCase();
                const match = merged.findIndex(m => baseNameFrom(m.name).toLowerCase() === base);
                if (match !== -1) {
                    merged[match] = { ...merged[match], ...nf };
                } else {
                    merged.push(nf);
                }
            }
            return merged;
        });

        setIsImporting(false);
        setImportProgress(100);
        setImportSummary({ total: total, added: newFiles.length, errors: errors.length });

        if (errors.length > 0) {
            console.warn("Some files failed to read:", errors);
            alert(`Imported ${newFiles.length} files, ${errors.length} failed to read.`);
        }
        setTimeout(() => setImportProgress(0), 800);
    };

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
        e.target.value = '';
    };

    const handleFolderUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
        e.target.value = '';
    };

    const handleRawFileUpload = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsImporting(true);
        setImportProgress(0);
        try {
            const { file } = await readFileAsText(e.target.files[0]);
            updateActiveFile({ notepadContent: file.text, isDirty: true });
            setImportProgress(100);
        } catch (err) {
            console.error("Raw file read failed:", err);
            alert("Failed to read raw file.");
        } finally {
            setIsImporting(false);
            e.target.value = '';
            setTimeout(() => setImportProgress(0), 600);
        }
    };

    const handleRawFolderUpload = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const filesArr = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.txt'));
        if (filesArr.length === 0) {
            alert("No .txt files found in the selected folder.");
            return;
        }
        setIsImporting(true);
        setImportProgress(0);
        const total = filesArr.length;
        let processed = 0;
        const readPromises = filesArr.map(f =>
            readFileAsText(f)
                .then(res => ({ status: 'fulfilled', ...res }))
                .catch(err => ({ status: 'rejected', ...err }))
        );

        const settled = await Promise.all(readPromises);
        const updates = [];
        const creations = [];
        const errors = [];

        for (const item of settled) {
            processed++;
            setImportProgress(Math.round((processed / total) * 100));
            if (item.status === 'fulfilled') {
                const { file, text } = item;
                const base = baseNameFrom(file.name).toLowerCase();
                const matchIndex = files.findIndex(f => baseNameFrom(f.name).toLowerCase() === base);
                if (matchIndex !== -1) {
                    updates.push({ index: matchIndex, content: text });
                } else {
                    creations.push({
                        id: generateId(),
                        name: `${base}.srt`,
                        subtitles: [],
                        notepadContent: text,
                        isDirty: true
                    });
                }
            } else {
                errors.push({ name: item.file.name, error: item.error });
            }
            if (processed % 10 === 0) await new Promise(r => setTimeout(r, 0));
        }

        setFiles(prev => {
            const copy = prev.map(p => ({ ...p }));
            for (const u of updates) {
                copy[u.index] = { ...copy[u.index], notepadContent: u.content, isDirty: true };
            }
            return [...copy, ...creations];
        });

        setIsImporting(false);
        setImportProgress(100);
        if (errors.length > 0) {
            console.warn("Some raw files failed:", errors);
        }
        setTimeout(() => setImportProgress(0), 800);
        e.target.value = '';
    };

    const updateActiveFile = (updates) => {
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, ...updates } : f));
    };

    const handleUpdateRow = (id, updatedData) => {
        const newSubs = activeFile.subtitles.map(item => item.id === id ? updatedData : item);
        const updates = { subtitles: newSubs };
        if (!activeFile.isDirty) {
            updates.notepadContent = formatNotepadContent(newSubs);
        }
        updateActiveFile(updates);
    };

    const handleDeleteRow = (id) => {
        const newSubs = activeFile.subtitles.filter(item => item.id !== id);
        const updates = { subtitles: newSubs };
        if (!activeFile.isDirty) {
            updates.notepadContent = formatNotepadContent(newSubs);
        }
        updateActiveFile(updates);
    };

    const handleAddRow = () => {
        const lastSub = activeFile.subtitles[activeFile.subtitles.length - 1];
        let newStart = '00:00:00,000';
        let newEnd = '00:00:02,000';
        if (lastSub) {
            const lastEndMs = convTimeToMs(lastSub.endTime);
            newStart = msToTime(lastEndMs + 100);
            newEnd = msToTime(lastEndMs + 2100);
        }
        const newSubs = [...activeFile.subtitles, {
            id: generateId(),
            startTime: newStart,
            endTime: newEnd,
            text: ''
        }];
        const updates = { subtitles: newSubs };
        if (!activeFile.isDirty) {
            updates.notepadContent = formatNotepadContent(newSubs);
        }
        updateActiveFile(updates);
    };

    const handleNotepadChange = (e) => {
        updateActiveFile({
            notepadContent: e.target.value,
            isDirty: true
        });
    };

    const handleUpdateLinesFromText = () => {
        const lines = activeFile.notepadContent.split(/\n\n+/);
        const updatedSubtitles = [...activeFile.subtitles];

        lines.forEach(block => {
            const match = block.match(/^(\d+)\s+([\s\S]*)/);
            if (match) {
                const index = parseInt(match[1], 10) - 1;
                const text = match[2].trim();
                if (updatedSubtitles[index]) {
                    updatedSubtitles[index] = { ...updatedSubtitles[index], text: text };
                }
            }
        });

        updateActiveFile({
            subtitles: updatedSubtitles,
            isDirty: false
        });
    };

    const handleSyncAll = () => {
        const updatedFiles = files.map(file => {
            if (!file.isDirty) return file;
            const lines = file.notepadContent.split(/\n\n+/);
            const updatedSubtitles = [...file.subtitles];
            lines.forEach(block => {
                const match = block.match(/^(\d+)\s+([\s\S]*)/);
                if (match) {
                    const index = parseInt(match[1], 10) - 1;
                    const text = match[2].trim();
                    if (updatedSubtitles[index]) {
                        updatedSubtitles[index] = { ...updatedSubtitles[index], text: text };
                    }
                }
            });
            return { ...file, subtitles: updatedSubtitles, isDirty: false };
        });
        setFiles(updatedFiles);
    };

    const handleAiTranslation = async () => {
        if (!activeFile.notepadContent || activeFile.notepadContent.trim() === '') return;
        setIsAiProcessing(true);
        const resultText = await callAiApi(activeFile.notepadContent, aiInstruction);
        if (resultText) {
            updateActiveFile({ notepadContent: resultText, isDirty: true });
        } else {
            alert("AI Processing failed. Please check your connection and try again.");
        }
        setIsAiProcessing(false);
    };

    const handleAiTranslateAll = async () => {
        if (files.length === 0) return;
        setIsTranslatingAll(true);
        const newFiles = [...files];
        for (let i = 0; i < newFiles.length; i++) {
            if (newFiles[i].notepadContent && newFiles[i].notepadContent.trim() !== '') {
                const translated = await callAiApi(newFiles[i].notepadContent, aiInstruction);
                if (translated) {
                    newFiles[i] = { ...newFiles[i], notepadContent: translated, isDirty: true };
                    setFiles([...newFiles]);
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }
        setFiles(newFiles);
        setIsTranslatingAll(false);
    };

    const closeFile = (e, fileId) => {
        e.stopPropagation();
        if (files.length === 1) {
            alert("Cannot close the last open file.");
            return;
        }
        const newFiles = files.filter(f => f.id !== fileId);
        setFiles(newFiles);
        if (activeFileId === fileId) {
            setActiveFileId(newFiles[0].id);
        }
    };

    const handleNotepadSearch = (e) => {
        e.preventDefault();
        if (!notepadSearchQuery) return;

        const textarea = notepadTextAreaRef.current;
        if (!textarea) return;

        const content = activeFile.notepadContent;
        const lowerContent = content.toLowerCase();
        const query = notepadSearchQuery.toLowerCase();

        let nextIndex = lowerContent.indexOf(query, textarea.selectionEnd);
        if (nextIndex === -1) {
            nextIndex = lowerContent.indexOf(query);
        }

        if (nextIndex !== -1) {
            textarea.focus();
            textarea.setSelectionRange(nextIndex, nextIndex + query.length);
            const lines = content.substring(0, nextIndex).split('\n').length;
            const lineHeight = 20;
            textarea.scrollTop = lines * lineHeight - 100;
        }
    };

    const handleNotepadCopy = () => {
        const textArea = document.createElement("textarea");
        textArea.value = activeFile.notepadContent;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            setNotepadCopied(true);
            setTimeout(() => setNotepadCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
        }
        document.body.removeChild(textArea);
    };

    const handleDownloadCurrent = () => {
        downloadSingleFile(activeFile, exportFormat);
        setShowExportMenu(false);
    };

    const handleDownloadAll = async () => {
        try {
            if (files.length === 1) {
                downloadSingleFile(files[0], exportFormat);
            } else {
                setIsZipping(true);
                setExportProgress(0);
                await downloadZipBundle(files, exportFormat, (pct) => setExportProgress(Math.round(pct)));
                setIsZipping(false);
            }
        } catch (err) {
            console.error(err);
            alert("Export failed. See console for details.");
            setIsZipping(false);
        } finally {
            setShowExportMenu(false);
            setTimeout(() => setExportProgress(0), 800);
        }
    };

    const handleDownloadSelected = async () => {
        const filesToDownload = files.filter(f => selectedFilesForDownload.includes(f.id));
        if (filesToDownload.length === 1) {
            downloadSingleFile(filesToDownload[0], exportFormat);
        } else if (filesToDownload.length > 1) {
            try {
                setIsZipping(true);
                setExportProgress(0);
                await downloadZipBundle(filesToDownload, exportFormat, (pct) => setExportProgress(Math.round(pct)));
                setIsZipping(false);
            } catch (err) {
                console.error(err);
                alert("Export failed.");
                setIsZipping(false);
            }
        }
        setSelectedFilesForDownload([]);
        setShowExportMenu(false);
        setTimeout(() => setExportProgress(0), 800);
    };

    const toggleFileSelection = (id) => {
        setSelectedFilesForDownload(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const themeClasses = darkMode
        ? 'bg-[#121214] text-zinc-300'
        : 'bg-zinc-50 text-zinc-800';

    const cardClasses = darkMode
        ? 'bg-[#18181b] border-zinc-800 text-zinc-200'
        : 'bg-white border-zinc-200 text-slate-900 shadow-sm';

    const buttonPrimary = "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-md hover:shadow-lg transition-all duration-200";
    const buttonSecondary = darkMode
        ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900";

    return (
        <div className={`min-h-screen font-['Outfit',sans-serif] flex flex-col transition-colors duration-500 ease-in-out ${themeClasses}`} onDragEnter={handleDrag}>
            {/* Import/Export Progress Overlay */}
            {(isImporting || isZipping) && (
                <div className="progress-overlay">
                    <div className={`p-3 rounded-xl shadow-xl border ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-slate-200 text-slate-800'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                <div className="text-sm font-medium">{isImporting ? 'Importing files' : 'Preparing ZIP'}</div>
                            </div>
                            <div className="text-xs opacity-70">{isImporting ? `${importProgress}%` : `${exportProgress}%`}</div>
                        </div>
                        <div className="w-full h-2 bg-zinc-800/30 rounded-full overflow-hidden">
                            <div style={{ width: `${isImporting ? importProgress : exportProgress}%` }} className="h-full rounded-full bg-indigo-500 transition-all"></div>
                        </div>
                        <div className="mt-2 text-xs opacity-60">{isImporting ? `Processed ${importProgress}%` : `Compression ${exportProgress}%`}</div>
                    </div>
                </div>
            )}

            {/* SETTINGS MODAL */}
            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                darkMode={darkMode}
                aiInstruction={aiInstruction}
                setAiInstruction={setAiInstruction}
                onSave={saveSettings}
            />

            {/* Header */}
            <Header
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                activeFile={activeFile}
                files={files}
                setActiveFileId={setActiveFileId}
                isTranslatingAll={isTranslatingAll}
                handleAiTranslateAll={handleAiTranslateAll}
                setShowSettings={setShowSettings}
                closeFile={closeFile}
            />

            {/* Main Layout */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 pb-6 flex flex-col md:flex-row gap-6 overflow-hidden app-main-height">

                {/* LEFT CARD: TIMELINE */}
                <div className={`w-full md:w-1/2 flex flex-col rounded-xl border overflow-hidden transition-colors duration-500 ease-in-out ${cardClasses}`}>
                    <div className={`p-4 border-b flex justify-between items-center shrink-0 transition-colors duration-500 ${darkMode ? 'border-zinc-800 bg-[#1e1e20]' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex flex-col space-y-0.5">
                            <h3 className="font-semibold tracking-tight text-base">Timeline Editor</h3>
                            <p className="text-xs opacity-60">Manage synchronization & clips</p>
                        </div>
                        <button
                            onClick={handleAddRow}
                            className={`inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${buttonSecondary} border-dashed`}
                        >
                            <Plus size={14} className="mr-1.5" /> Add Line
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-0 relative">
                        {activeFile.subtitles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-60 gap-3">
                                <div className={`p-3 rounded-full transition-colors duration-500 ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                    <MonitorPlay size={24} className="opacity-50" />
                                </div>
                                <span className="text-sm">Timeline is empty</span>
                            </div>
                        ) : (
                            activeFile.subtitles.map((item, index) => (
                                <SubtitleRow
                                    key={item.id}
                                    index={index}
                                    item={item}
                                    onDelete={handleDeleteRow}
                                    onUpdate={handleUpdateRow}
                                    darkMode={darkMode}
                                />
                            ))
                        )}
                        <div className="h-12"></div>
                    </div>
                </div>

                {/* RIGHT CARD: NOTEPAD */}
                <div className={`w-full md:w-1/2 flex flex-col rounded-xl border overflow-hidden transition-colors duration-500 ease-in-out ${cardClasses}`}>
                    <div className={`p-4 border-b flex flex-col gap-3 shrink-0 transition-colors duration-500 ${darkMode ? 'border-zinc-800 bg-[#1e1e20]' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col space-y-0.5">
                                <h3 className="font-semibold tracking-tight text-base">Raw Text Source</h3>
                                <p className="text-xs opacity-60">Batch edit & search content</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Unsaved Indicator */}
                                {activeFile.isDirty && (
                                    <span className="text-[10px] font-medium text-amber-500 animate-pulse">Unsaved</span>
                                )}

                                {/* Download Raw (.txt) */}
                                <button
                                    onClick={() => downloadSingleFile(activeFile, 'raw')}
                                    className={`p-1.5 rounded-md transition-colors duration-200 ${darkMode ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                    title="Download Raw Text (.txt)"
                                    disabled={isImporting || isZipping}
                                >
                                    <Download size={16} />
                                </button>

                                {/* Upload Raw (current file) */}
                                <input
                                    ref={rawFileInputRef}
                                    type="file"
                                    accept=".txt"
                                    className="hidden"
                                    onChange={handleRawFileUpload}
                                />
                                <button
                                    onClick={() => rawFileInputRef.current?.click()}
                                    className={`p-1.5 rounded-md transition-colors duration-200 ${darkMode ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                    title="Import Raw Text (current file)"
                                    disabled={isImporting || isZipping}
                                >
                                    <Upload size={16} />
                                </button>

                                {/* AI Translate Button (Current File) */}
                                <button
                                    onClick={handleAiTranslation}
                                    disabled={isAiProcessing}
                                    className={`p-1.5 rounded-md transition-all duration-200 group relative ${isAiProcessing ? 'opacity-50 cursor-not-allowed' : (darkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50')}`}
                                    title="AI Translate (Current File)"
                                >
                                    {isAiProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                </button>

                                {/* Sync Current */}
                                <button
                                    onClick={handleUpdateLinesFromText}
                                    className={`p-1.5 rounded-md transition-all duration-200 ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}
                                    title="Sync Current File (apply RAW -> subtitles)"
                                >
                                    <RefreshCw size={16} />
                                </button>

                                {/* Sync All */}
                                <button
                                    onClick={handleSyncAll}
                                    className={`inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-bold tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 shadow-lg hover:shadow-indigo-500/25 active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white`}
                                    title="Sync changes to timeline for ALL open files"
                                    disabled={isImporting || isZipping}
                                >
                                    <RefreshCw size={14} className={`mr-1.5 ${files.some(f => f.isDirty) ? "animate-spin-slow" : ""}`} /> Sync All
                                </button>
                            </div>
                        </div>

                        {/* Premium Notepad Toolbar */}
                        <div className={`flex items-center p-1 rounded-lg border transition-colors ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                            <form onSubmit={handleNotepadSearch} className="flex-grow flex items-center gap-2 px-2 relative">
                                <Search size={14} className={darkMode ? 'text-zinc-500' : 'text-zinc-400'} />
                                <input
                                    type="text"
                                    placeholder="Search in text..."
                                    value={notepadSearchQuery}
                                    onChange={(e) => setNotepadSearchQuery(e.target.value)}
                                    className={`bg-transparent outline-none text-xs w-full h-8 ${darkMode ? 'text-zinc-200 placeholder-zinc-600' : 'text-zinc-800 placeholder-zinc-400'}`}
                                />
                                {notepadSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setNotepadSearchQuery("")}
                                        className="absolute right-2 p-0.5 rounded-full hover:bg-zinc-700/50 text-zinc-500"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </form>

                            <div className="flex items-center gap-1 pr-1">
                                {matchCount > 0 && (
                                    <span className={`text-[10px] px-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {matchCount} matches
                                    </span>
                                )}

                                <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-300'}`}></div>

                                <button
                                    onClick={handleNotepadCopy}
                                    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 transition-all duration-300 ${notepadCopied
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : (darkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-200 text-zinc-600')
                                        }`}
                                    title="Copy all content"
                                >
                                    {notepadCopied ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow relative group">
                        {/* Auto-Highlight Backdrop Layer */}
                        <div
                            ref={backdropRef}
                            className={`absolute inset-0 p-6 whitespace-pre-wrap font-mono text-sm leading-[1.8] pointer-events-none overflow-hidden text-transparent ${darkMode ? 'text-transparent' : 'text-transparent'
                                }`}
                            aria-hidden="true"
                        >
                            <HighlightedBackdrop text={activeFile.notepadContent} highlight={notepadSearchQuery} darkMode={darkMode} />
                        </div>

                        <textarea
                            ref={notepadTextAreaRef}
                            value={activeFile.notepadContent}
                            onChange={handleNotepadChange}
                            onScroll={handleScroll}
                            spellCheck="false"
                            className={`w-full h-full p-6 bg-transparent border-none focus:ring-0 resize-none text-sm font-mono leading-[1.8] outline-none transition-colors duration-500 relative z-10 ${darkMode
                                    ? 'text-zinc-300 placeholder:text-zinc-600 selection:bg-indigo-500/30'
                                    : 'text-slate-600 placeholder:text-slate-300 selection:bg-indigo-100'
                                }`}
                            placeholder="001 Subtitle text..."
                        />
                    </div>
                </div>

            </main>

            {/* Floating Action Buttons */}
            <div className="fixed fab flex flex-col gap-3 z-40 items-end">
                {/* Hidden Inputs */}
                <input type="file" accept=".srt,.txt,.vtt,.lrc" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <input type="file" webkitdirectory="" directory="" ref={folderInputRef} className="hidden" onChange={handleFolderUpload} />

                {/* NEW hidden inputs for RAW */}
                <input type="file" accept=".txt" ref={rawFileInputRef} className="hidden" onChange={handleRawFileUpload} />
                <input type="file" webkitdirectory="" directory="" ref={rawFolderInputRef} className="hidden" onChange={handleRawFolderUpload} />

                {/* IMPORT */}
                <div className="relative" ref={importMenuRef}>
                    {showImportMenu && (
                        <div className={`absolute bottom-full right-0 mb-3 w-56 rounded-xl shadow-xl border overflow-hidden origin-bottom-right transition-all animate-in fade-in zoom-in-95 ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                            }`}>
                            <button onClick={() => { fileInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                                <FileText size={16} className="text-indigo-500" /> Upload Files
                            </button>
                            <button onClick={() => { folderInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-t ${darkMode ? 'text-zinc-300 hover:bg-zinc-800 border-zinc-800' : 'text-zinc-700 hover:bg-zinc-50 border-zinc-100'}`}>
                                <Folder size={16} className="text-amber-500" /> Upload Folder
                            </button>

                            {/* RAW import options */}
                            <div className="border-t">
                                <button onClick={() => { rawFileInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                                    <FileText size={16} className="text-indigo-500" /> Upload RAW File (.txt) — current
                                </button>
                                <button onClick={() => { rawFolderInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-t ${darkMode ? 'text-zinc-300 hover:bg-zinc-800 border-zinc-800' : 'text-zinc-700 hover:bg-zinc-50 border-zinc-100'}`}>
                                    <Folder size={16} className="text-emerald-400" /> Upload RAW Folder — batch
                                </button>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setShowImportMenu(!showImportMenu)} className={`h-12 px-6 rounded-full shadow-lg flex items-center gap-2 font-medium transition-all duration-300 active:scale-95 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-100'}`} disabled={isImporting || isZipping}>
                        <Upload size={18} /> <span className="hidden sm:inline">Import</span> <ChevronDown size={14} className={`ml-1 transition-transform ${showImportMenu ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* EXPORT */}
                <div className="relative" ref={exportMenuRef}>
                    {showExportMenu && (
                        <div className={`absolute bottom-full right-0 mb-3 w-72 rounded-xl shadow-2xl border overflow-hidden origin-bottom-right transition-all animate-in fade-in zoom-in-95 ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                            }`}>
                            <div className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b ${darkMode ? 'text-zinc-500 border-zinc-800' : 'text-zinc-400 border-zinc-100'}`}>Export Settings</div>
                            <div className={`p-2 flex gap-1 border-b ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                                {['srt', 'vtt', 'txt', 'lrc', 'raw'].map(fmt => (
                                    <button key={fmt} onClick={() => setExportFormat(fmt)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${exportFormat === fmt ? 'bg-indigo-600 text-white' : (darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100')}`}>{fmt === 'raw' ? 'RAW' : fmt}</button>
                                ))}
                            </div>
                            <button onClick={handleDownloadCurrent} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                                <FileDown size={16} className="text-emerald-500" /> <span>Download Current <span className="opacity-50 text-xs uppercase">.{exportFormat === 'raw' ? 'txt' : exportFormat}</span></span>
                            </button>
                            <button onClick={handleDownloadAll} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-b ${darkMode ? 'text-zinc-300 hover:bg-zinc-800 border-zinc-800' : 'text-zinc-700 hover:bg-zinc-50 border-zinc-100'}`} disabled={isImporting || isZipping}>
                                {isZipping ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <Folder size={16} className="text-blue-500" />} Download All ({files.length})
                            </button>
                            <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                <span>Select Episodes</span>
                                {selectedFilesForDownload.length > 0 && <button onClick={() => setSelectedFilesForDownload([])} className="hover:text-red-500">Clear</button>}
                            </div>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                {files.map(file => (
                                    <div key={file.id} onClick={() => toggleFileSelection(file.id)} className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:opacity-80 transition-opacity`}>
                                        {selectedFilesForDownload.includes(file.id) ? <CheckSquare size={14} className="text-indigo-500" /> : <Square size={14} className={darkMode ? 'text-zinc-600' : 'text-zinc-300'} />}
                                        <span className={`text-xs truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{file.name}</span>
                                    </div>
                                ))}
                            </div>
                            {selectedFilesForDownload.length > 0 && (
                                <div className={`p-2 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                                    <button onClick={handleDownloadSelected} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-500/20" disabled={isImporting || isZipping}>
                                        {isZipping ? "Compressing..." : `Download Selected (${selectedFilesForDownload.length})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={() => setShowExportMenu(!showExportMenu)} className={`h-12 px-6 rounded-full shadow-xl shadow-indigo-500/20 flex items-center gap-2 font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${buttonPrimary}`} disabled={isImporting}>
                        <Download size={18} /> <span>Download</span> <ChevronDown size={14} className={`ml-1 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {dragActive && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-opacity duration-300">
                    <div className={`p-8 rounded-xl shadow-2xl border-2 border-dashed flex flex-col items-center animate-bounce ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-slate-300'}`}>
                        <Upload size={48} className="text-indigo-500 mb-4" />
                        <h3 className="text-xl font-bold tracking-tight">Drop Files or Folders</h3>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
