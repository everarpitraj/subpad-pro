import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, Upload, Download, Plus, AlertCircle, Clock, RefreshCw, Sun, Moon, FileText, MonitorPlay, ChevronRight, GripVertical, Settings, Activity, Folder, File, ChevronDown, Check, X, Search, FileDown, CheckSquare, Square, Copy, ArrowRight, Loader2, ArrowUp, ArrowDown, Sparkles, Languages, Globe, Maximize2, Minimize2 } from 'lucide-react';

// --- Utility Functions & Converters ---

let uniqueIdCounter = 0;
const generateId = () => {
  const prefix = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Date.now().toString(36) + Math.random().toString(36).substr(2);
  uniqueIdCounter++;
  return `${prefix}-${uniqueIdCounter}`;
};

const timeToMs = (timeString) => {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  if (parts.length !== 3) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const secondsParts = parts[2].split(',');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1] || 0, 10);
  return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + ms;
};

const msToTime = (ms, separator = ',') => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(milliseconds).padStart(3, '0')}`;
};

const parseSRT = (data) => {
  const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
  const items = [];
  let m;
  while ((m = regex.exec(data)) !== null) {
    if (m.index === regex.lastIndex) regex.lastIndex++;
    items.push({
      id: generateId(),
      startTime: m[2],
      endTime: m[3],
      text: m[4].trim(),
    });
  }
  return items;
};

// --- ZIP & Download Utilities ---

const loadJSZip = () => {
  return new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error("Failed to load JSZip"));
    document.head.appendChild(script);
  });
};

const buildFileContent = (file, format) => {
  const { subtitles, notepadContent } = file;

  if (format === 'raw') {
    // Return the raw notepad content directly (includes line numbers, etc.)
    return notepadContent;
  }

  if (format === 'vtt') {
    let output = "WEBVTT\n\n";
    output += subtitles.map((sub) => {
      const start = sub.startTime.replace(',', '.');
      const end = sub.endTime.replace(',', '.');
      return `${start} --> ${end}\n${sub.text}\n`;
    }).join('\n');
    return output;
  }
  if (format === 'txt') {
    // Just the text lines, no timestamps or indices
    return subtitles.map(sub => sub.text).join('\n');
  }
  if (format === 'lrc') {
    return subtitles.map(sub => {
      const ms = timeToMs(sub.startTime);
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const hundredths = Math.floor((ms % 1000) / 10);
      const tag = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
      const cleanText = sub.text.replace(/\n/g, ' ');
      return `${tag}${cleanText}`;
    }).join('\n');
  }
  // Default SRT
  return subtitles.map((sub, index) => {
    return `${index + 1}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`;
  }).join('\n');
};

const downloadSingleFile = (file, format) => {
  const content = buildFileContent(file, format);
  // 'raw' format saves as .txt
  const extension = format === 'raw' ? 'txt' : format;
  const mimeTypes = { srt: 'text/plain', vtt: 'text/vtt', txt: 'text/plain', lrc: 'text/plain', raw: 'text/plain' };
  
  const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const baseName = file.name.replace(/\.(srt|vtt|txt|lrc)$/i, '');
  a.href = url;
  a.download = `${baseName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

const downloadZipBundle = async (filesToZip, format, onProgress) => {
  try {
    const JSZip = await loadJSZip();
    const zip = new JSZip();

    filesToZip.forEach(file => {
      const content = buildFileContent(file, format);
      const baseName = file.name.replace(/\.(srt|vtt|txt|lrc)$/i, '');
      const extension = format === 'raw' ? 'txt' : format;
      zip.file(`${baseName}.${extension}`, content);
    });

    // generate with onUpdate callback for progress
    const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
      if (onProgress) onProgress(metadata.percent);
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_export_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    return true;
  } catch (error) {
    console.error("ZIP Generation failed:", error);
    throw error;
  }
};

// --- Small Helpers ---

const formatNotepadContent = (subs) => {
  return subs.map((sub, index) => {
    const num = String(index + 1).padStart(3, '0');
    return `${num} ${sub.text}`;
  }).join('\n\n');
};

const baseNameFrom = (filename) => filename.replace(/\.(srt|vtt|txt|lrc)$/i, '').trim();

// --- Components (unchanged except where noted) ---

const ThemeToggle = ({ darkMode, setDarkMode }) => {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`relative w-14 h-7 rounded-full flex items-center transition-colors duration-500 ease-in-out focus:outline-none shadow-inner active:scale-95 border ${
        darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-200 border-zinc-300'
      }`}
      aria-label="Toggle Dark Mode"
    >
      <span className={`absolute left-2 text-amber-400 transition-all duration-500 ease-in-out ${darkMode ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
        <Sun size={14} fill="currentColor" />
      </span>
      <span className={`absolute right-2 text-indigo-300 transition-all duration-500 ease-in-out ${darkMode ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}>
        <Moon size={14} fill="currentColor" />
      </span>
      <span
        className={`absolute left-0.5 bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center ${
          darkMode 
            ? 'translate-x-7 rotate-[360deg] border border-zinc-700' 
            : 'translate-x-0 rotate-0 border border-zinc-100'
        }`}
      >
        {darkMode ? (
          <Moon size={12} className="text-zinc-900 transition-opacity duration-300" fill="currentColor" />
        ) : (
          <Sun size={12} className="text-amber-500 transition-opacity duration-300" fill="currentColor" />
        )}
      </span>
    </button>
  );
};

const TimestampInput = ({ value, onChange, onBlur, darkMode }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleChange = (e) => {
    let val = e.target.value;
    if (!/^[\d:,]*$/.test(val)) return;
    setLocalValue(val);
  };

  const handleBlur = () => {
    const regex = /^\d{2}:\d{2}:\d{2},\d{3}$/;
    if (!regex.test(localValue)) {
      setLocalValue(value);
    } else {
      onChange(localValue);
      if (onBlur) onBlur();
    }
  };

  const adjustTime = (amountMs) => {
    const ms = timeToMs(localValue);
    const newTime = Math.max(0, ms + amountMs);
    const newStr = msToTime(newTime);
    setLocalValue(newStr);
    onChange(newStr);
  };

  return (
    <div className={`flex items-center rounded-md p-0.5 transition-colors duration-500 ease-in-out border shadow-sm ${
      darkMode 
        ? 'bg-[#18181b] border-zinc-700 hover:border-zinc-600' 
        : 'bg-white border-zinc-200 hover:border-zinc-300'
    }`}>
      <button 
        onClick={() => adjustTime(-100)} 
        className={`w-5 h-full flex items-center justify-center rounded text-[10px] transition-colors duration-300 ${
          darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
        }`} 
        tabIndex={-1}
      >
        -
      </button>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-20 font-mono text-[11px] text-center outline-none bg-transparent font-medium tracking-tight transition-colors duration-500 ${
          darkMode 
            ? 'text-zinc-200 focus:text-indigo-400 selection:bg-indigo-500/30' 
            : 'text-zinc-700 focus:text-indigo-600 selection:bg-indigo-100'
        }`}
        maxLength={12} 
        placeholder="00:00:00,000"
      />
      <button 
        onClick={() => adjustTime(100)} 
        className={`w-5 h-full flex items-center justify-center rounded text-[10px] transition-colors duration-300 ${
          darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
        }`} 
        tabIndex={-1}
      >
        +
      </button>
    </div>
  );
};

const SubtitleRow = ({ item, index, onDelete, onUpdate, darkMode }) => {
  const startMs = timeToMs(item.startTime);
  const endMs = timeToMs(item.endTime);
  const durationSec = (endMs - startMs) / 1000;
  const charCount = item.text.replace(/\n/g, '').length;
  const cps = durationSec > 0 ? Math.round(charCount / durationSec) : 0;

  let badgeStyle = darkMode 
    ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
    : "bg-zinc-100 text-zinc-500 border-zinc-200";
    
  if (cps > 15 && cps <= 20) badgeStyle = darkMode 
    ? "bg-amber-900/30 text-amber-500 border-amber-900/40" 
    : "bg-amber-50 text-amber-700 border-amber-200";
    
  if (cps > 20) badgeStyle = darkMode 
    ? "bg-rose-900/30 text-rose-500 border-rose-900/40" 
    : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className={`group flex items-start gap-4 p-3 border-b transition-colors duration-500 ease-in-out relative ${
      darkMode 
        ? 'border-b-zinc-800 bg-[#1e1e20] hover:bg-[#252528]' 
        : 'border-b-zinc-100 bg-white hover:bg-zinc-50/50'
    }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

      {/* Meta Column */}
      <div className="flex flex-col gap-2 w-32 shrink-0">
        <div className="flex items-center justify-between px-0.5">
          <span className={`font-mono text-[10px] font-bold tracking-tight opacity-50 transition-colors duration-500 ${darkMode ? 'text-zinc-400' : 'text-zinc-400'}`}>
            {String(index + 1).padStart(3, '0')}
          </span>
          <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 transition-colors duration-500 ${badgeStyle}`}>
             {cps} <span className="opacity-70 text-[8px] tracking-wide">CPS</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <TimestampInput 
            value={item.startTime} 
            onChange={(val) => onUpdate(item.id, { ...item, startTime: val })} 
            darkMode={darkMode}
          />
          <TimestampInput 
            value={item.endTime} 
            onChange={(val) => onUpdate(item.id, { ...item, endTime: val })} 
            darkMode={darkMode}
          />
        </div>

        <div className={`flex justify-end items-center mt-0.5 pr-1 transition-opacity duration-200 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
           <div className="flex items-center gap-1 text-[10px] font-medium tracking-tight">
             <Clock size={10} />
             <span>{durationSec.toFixed(2)}s</span>
           </div>
        </div>
      </div>

      {/* Editable Lines Column */}
      <div className="flex-grow relative h-[92px]">
        <textarea
          value={item.text}
          onChange={(e) => onUpdate(item.id, { ...item, text: e.target.value })}
          className={`w-full h-full p-3 text-sm leading-relaxed resize-none outline-none rounded-lg border transition-all duration-500 ease-in-out shadow-sm ${
            darkMode 
              ? 'bg-[#121214] border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600' 
              : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100'
          }`}
          placeholder="Subtitle text..."
        />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">
           <button 
             onClick={() => onDelete(item.id)} 
             className={`p-1.5 rounded-md transition-colors ${
               darkMode ? 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
             }`}
             title="Delete line"
           >
             <Trash2 size={13} />
           </button>
        </div>
      </div>
    </div>
  );
};

// --- Highlighter Utility Component ---
const HighlightedBackdrop = ({ text, highlight, darkMode }) => {
  if (!highlight) return <div className="whitespace-pre-wrap word-break-break-word">{text}</div>;

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <div className="whitespace-pre-wrap word-break-break-word">
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className={`${darkMode ? 'bg-indigo-500/40 text-transparent' : 'bg-yellow-200 text-transparent'} rounded-[1px]`}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
};

// --- Main Application ---

export default function App() {
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
  const [showFileSwitcher, setShowFileSwitcher] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFilesForDownload, setSelectedFilesForDownload] = useState([]);
  
  // Advanced Download State
  const [exportFormat, setExportFormat] = useState('srt');

  // Notepad Tool States
  const [notepadSearchQuery, setNotepadSearchQuery] = useState("");
  const [notepadCopied, setNotepadCopied] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // AI & Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("Translate the following subtitle text to Spanish. Maintain line numbers and timestamps if present.");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Fullscreen state & ref (NEW: minimal premium fullscreen feature)
  const appRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Import/export progress
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const rawFileInputRef = useRef(null);       // NEW: single raw file
  const rawFolderInputRef = useRef(null);     // NEW: raw folder upload
  const importMenuRef = useRef(null);
  const fileSwitcherRef = useRef(null);
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
      if (fileSwitcherRef.current && !fileSwitcherRef.current.contains(event.target)) setShowFileSwitcher(false);
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

  // Fullscreen change listener (keeps UI state in sync)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Toggle fullscreen (only adds a minimal premium control, non-intrusive)
  const toggleFullScreen = async () => {
    try {
      const el = appRef.current || document.documentElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) el.msRequestFullscreen();
        setIsFullScreen(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        setIsFullScreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  // -- Improved file processing (robust & batched) ---

  // wrapper to read a file as text with promise
  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ file, text: reader.result });
    reader.onerror = () => reject({ file, error: reader.error });
    reader.readAsText(file);
  });

  // Process generic uploaded files (SRTs primarily). This reads files in parallel and batches updates.
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
        // Try parsing as SRT
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
          // If not SRT, but .txt, create raw file entry so user can inspect and sync
          if (file.name.toLowerCase().endsWith('.txt')) {
            const base = baseNameFrom(file.name);
            const newFile = {
              id: generateId(),
              name: `${base}.srt`,
              subtitles: [],
              notepadContent: text,
              isDirty: true
            };
            newFiles.push(newFile);
          } else {
            // fallback: attempt to create a file with raw content
            const base = baseNameFrom(file.name);
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
      // yield to event loop every few files so UI updates (helps with huge folders)
      if (processed % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Batch update state once
    setFiles(prev => {
      // try to merge by base name: if a newFile matches an existing file base, replace it
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
      alert(`Imported ${newFiles.length} files, ${errors.length} failed to read (see console).`);
    }
    setTimeout(() => setImportProgress(0), 800);
  };

  // Handler for file input (multiple SRTs or mixed)
  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = '';
  };

  // Handler for folder selection (same as file upload)
  const handleFolderUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = '';
  };

  // --- RAW import handlers (improved, batched) ---
  // Process a single RAW file and update current active file
  const handleRawFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);
    try {
      const { file } = await readFileAsText(e.target.files[0]);
      updateActiveFile({ notepadContent: file.text, isDirty: true }); // updateActiveFile defined below
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

  // Process a folder of RAW .txt files: match by base name to existing files; update notepadContent for matches,
  // create new file entries for unmatched raw files (so user can inspect and sync).
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

    // Apply updates in a single state update
    setFiles(prev => {
      const copy = prev.map(p => ({ ...p }));
      for (const u of updates) {
        copy[u.index] = { ...copy[u.index], notepadContent: u.content, isDirty: true };
      }
      return [...copy, ...creations];
    });

    setIsImporting(false);
    setImportProgress(100);
    setImportSummary({ total: total, updated: updates.length, created: creations.length, errors: errors.length });
    if (errors.length > 0) {
      console.warn("Some raw files failed:", errors);
    }
    setTimeout(() => setImportProgress(0), 800);
    e.target.value = '';
  };

  // -- Handlers for editing / syncing (unchanged semantics) --

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
      const lastEndMs = timeToMs(lastSub.endTime);
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
    // Sync logic for ALL files: iterate, parse notepadContent, update subtitles
    const updatedFiles = files.map(file => {
      if (!file.isDirty) return file; // Skip if no changes

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

      return {
        ...file,
        subtitles: updatedSubtitles,
        isDirty: false
      };
    });

    setFiles(updatedFiles);
  };

  // Helper to call AI API
  const callAiApi = async (text, instruction) => {
    const apiKey = ""; // Runtime provided
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Instruction: ${instruction}\n\nInput Text:\n${text}` }] }]
          })
        }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
      console.error("AI API Error:", error);
      return null;
    }
  };

  const handleAiTranslation = async () => {
    if (!activeFile.notepadContent || activeFile.notepadContent.trim() === '') return;
    setIsAiProcessing(true);
    const resultText = await callAiApi(activeFile.notepadContent, aiInstruction);
    if (resultText) {
      updateActiveFile({
         notepadContent: resultText,
         isDirty: true
      });
    } else {
      alert("AI Processing failed. Please check your connection and try again.");
    }
    setIsAiProcessing(false);
  };

  const handleAiTranslateAll = async () => {
    if (files.length === 0) return;
    setIsTranslatingAll(true);
    
    // Process sequentially to avoid rate limits
    const newFiles = [...files];
    for (let i = 0; i < newFiles.length; i++) {
        if (newFiles[i].notepadContent && newFiles[i].notepadContent.trim() !== '') {
            const translated = await callAiApi(newFiles[i].notepadContent, aiInstruction);
            if (translated) {
                newFiles[i] = {
                    ...newFiles[i],
                    notepadContent: translated,
                    isDirty: true
                };
                // Update state iteratively to show progress
                setFiles([...newFiles]);
            }
            // Small delay to be safe
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

  // --- Notepad Tools (unchanged) ---
  const handleNotepadSearch = (e) => {
    e.preventDefault();
    if (!notepadSearchQuery) return;
    
    const textarea = notepadTextAreaRef.current;
    if (!textarea) return;

    const content = activeFile.notepadContent;
    const lowerContent = content.toLowerCase();
    const query = notepadSearchQuery.toLowerCase();
    
    // Find next match index
    let nextIndex = lowerContent.indexOf(query, textarea.selectionEnd);
    if (nextIndex === -1) {
      // Loop back to start
      nextIndex = lowerContent.indexOf(query);
    }
    
    if (nextIndex !== -1) {
        textarea.focus();
        textarea.setSelectionRange(nextIndex, nextIndex + query.length);
        
        // Calculate scroll position to keep selection in view
        const lines = content.substring(0, nextIndex).split('\n').length;
        const lineHeight = 20; // approximate px
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

  // --- Download Handlers (improved zip progress) ---

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

  // Drag & Drop
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const handleDrop = (e) => { 
    e.preventDefault(); e.stopPropagation(); setDragActive(false); 
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // --- Theme Variables ---
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

  // --- Render (unchanged UI structure plus progress overlays) ---
  return (
    <div ref={appRef} className={`min-h-screen font-['Outfit',sans-serif] flex flex-col transition-colors duration-500 ease-in-out ${themeClasses}`} onDragEnter={handleDrag}>
      {/* Inject Outfit Font & Custom Scrollbar + Responsive CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        :root {
          --header-height: 76px; /* default for desktop */
          --side-gap: clamp(12px, 2vw, 32px);
          --app-max-width: 1200px;
          --font-size-base: clamp(13px, 1.2vw, 16px);
        }
        @media (max-width: 767px) {
          :root { --header-height: 88px; }
        }
        html, body, #root { height: 100%; }
        html { font-size: var(--font-size-base); }
        /* Dark mode scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: ${darkMode ? '#3f3f46' : '#cbd5e1'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background-color: ${darkMode ? '#52525b' : '#94a3b8'}; }

        /* Minimal premium fullscreen button styles */
        .fp-fullscreen-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 6px 18px rgba(2,6,23,0.45);
        }
        .fp-fullscreen-premium {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 14px;
          height: 14px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
        }

        .progress-overlay {
          position: fixed;
          right: clamp(12px, 3vw, 24px);
          bottom: clamp(96px, 12vh, 160px);
          z-index: 60;
          min-width: 220px;
        }

        /* Main area auto-fit height using safe viewport units */
        .app-main-height {
          height: calc(100svh - var(--header-height));
        }

        /* Floating action button responsive position */
        .fab {
          bottom: clamp(12px, 3vh, 24px);
          right: clamp(12px, 3vw, 24px);
        }

        /* Make textareas, cards and spacings more fluid */
        textarea, input, button { font-size: inherit; }
        .card-padding { padding: clamp(12px, 2.4vw, 20px); }
        .subtitle-textarea { padding: clamp(10px, 1.5vw, 18px); }

        /* Ensure side columns collapse gracefully on small screens */
        @media (max-width: 900px) {
          .md\\:w-1\/2 { width: 100% !important; }
        }
      `}</style>

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
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all ${darkMode ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
              <h3 className={`font-semibold text-lg ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>AI Settings</h3>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded-full hover:bg-opacity-10 transition-colors ${darkMode ? 'hover:bg-zinc-200 text-zinc-400' : 'hover:bg-slate-900 text-slate-400'}`}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                Custom Instruction
              </label>
              <textarea 
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                className={`w-full h-32 p-3 text-sm rounded-lg border resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
                  darkMode 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-300 placeholder-zinc-600' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400'
                }`}
                placeholder="e.g. Translate the following subtitles to French..."
              />
              <p className={`mt-2 text-xs opacity-60 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                This instruction will be sent to the AI along with your subtitle text when you press the activity button.
              </p>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-slate-50/50'}`}>
              <button 
                onClick={() => setShowSettings(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             {/* CUSTOM LOGO */}
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transform transition-transform hover:scale-105 bg-white">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-6 h-6" role="img" aria-label="SubPad logo">
                 <defs><style>{'.cls-1{fill:#0072ff}'}</style></defs>
                 <g id="Layer_2" data-name="Layer 2">
                   <path className="cls-1" d="m13.1 9.58 5.27 9.54a1.7 1.7 0 0 0 1.49.88h5.93a.73.73 0 0 0 .64-1.09L20.67 8.49a.85.85 0 0 0-.76-.49h-4a11.76 11.76 0 0 0-2.14.2.94.94 0 0 0-.67 1.38zM44.88 20H51a.89.89 0 0 0 .78-1.32L46.17 8.49a.9.9 0 0 0-.79-.49h-6.15a.89.89 0 0 0-.78 1.32l5.65 10.22a.89.89 0 0 0 .78.46zM4 19.6a.39.39 0 0 0 .38.4h8.34a.92.92 0 0 0 .8-1.36l-4.08-7.41A.92.92 0 0 0 8 11a12.11 12.11 0 0 0-4 8.6zM53.72 8h-1.47a1 1 0 0 0-.92 1.56l5.47 9.9a1 1 0 0 0 .92.54H59a1 1 0 0 0 1-1v-4.72A6.3 6.3 0 0 0 53.72 8zM25.56 9.06l5.84 10.57a.72.72 0 0 0 .6.37h6.54a.72.72 0 0 0 .63-1.06L33.42 8.49V8.4a.7.7 0 0 0-.68-.4h-6.55a.72.72 0 0 0-.63 1.06zM58.8 24H4v20.12A11.92 11.92 0 0 0 15.88 56h32.24A11.92 11.92 0 0 0 60 44.12V25.2a1.2 1.2 0 0 0-1.2-1.2z"/>
                 </g>
               </svg>
             </div>
             
             {/* FILE SWITCHER */}
             <div className="flex flex-col relative" ref={fileSwitcherRef}>
               <h1 className={`font-bold text-xl leading-none tracking-tight flex items-center gap-2 cursor-pointer select-none transition-colors duration-500 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`} onClick={() => setShowFileSwitcher(!showFileSwitcher)}>
                 SubPad
                 <ChevronRight size={16} className={`text-zinc-500 transition-transform ${showFileSwitcher ? 'rotate-90' : ''}`} />
               </h1>
               
               <button 
                 onClick={() => setShowFileSwitcher(!showFileSwitcher)}
                 className={`text-[10px] font-medium uppercase tracking-widest text-left mt-0.5 hover:text-indigo-500 transition-colors duration-300 max-w-[200px] truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}
               >
                 {activeFile.name}
               </button>

               {showFileSwitcher && (
                 <div className={`absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 ${
                   darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
                 }`}>
                   <div className={`px-3 py-2 border-b flex items-center gap-2 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                     <Search size={14} className={darkMode ? 'text-zinc-500' : 'text-zinc-400'} />
                     <input 
                        type="text" 
                        placeholder="Search files..."
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        className={`w-full bg-transparent text-xs outline-none ${darkMode ? 'text-zinc-300 placeholder-zinc-600' : 'text-zinc-700 placeholder-zinc-400'}`}
                     />
                   </div>
                   <div className="max-h-64 overflow-y-auto custom-scrollbar">
                     {files.filter(f => f.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).map(file => (
                       <div
                         key={file.id}
                         onClick={() => { setActiveFileId(file.id); setShowFileSwitcher(false); }}
                         className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 cursor-pointer transition-colors duration-200 group ${
                           activeFileId === file.id
                             ? (darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
                             : (darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700')
                         }`}
                       >
                         <FileText size={14} className={activeFileId === file.id ? 'text-indigo-500' : 'opacity-50'} />
                         <span className="truncate flex-grow">{file.name}</span>
                         <button 
                            onClick={(e) => closeFile(e, file.id)}
                            className={`p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-500 transition-all`}
                         >
                            <X size={12} />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
           
           <div className={`h-6 w-px mx-1 transition-colors duration-500 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>

           {/* Fullscreen Minimal Premium Button (NEW) */}
           <div className="relative">
             <button
               onClick={toggleFullScreen}
               title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
               className={`fp-fullscreen-btn transition-all ${darkMode ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-100 text-slate-700'}`}
               aria-pressed={isFullScreen}
             >
               {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
               {/* Premium tiny badge */}
               <span className={`fp-fullscreen-premium ${darkMode ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white border border-indigo-600' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white border border-indigo-200'}`}>
                 ★
               </span>
             </button>
           </div>

           {/* MIDDLE BUTTON - TRANSLATE ALL */}
           <button 
             onClick={handleAiTranslateAll}
             disabled={isTranslatingAll}
             className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-md border transition-all duration-300 relative group overflow-hidden ${
                isTranslatingAll ? 'cursor-not-allowed border-indigo-500/50' : 
                (darkMode ? 'border-zinc-700 bg-zinc-800 hover:border-indigo-500 hover:shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md')
             }`}
             title="Translate All Files (AI)"
           >
             {isTranslatingAll ? (
               <Loader2 size={16} className="animate-spin text-indigo-500" />
             ) : (
               <Globe size={16} className={`${darkMode ? 'text-zinc-300 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'} transition-colors`} />
             )}
             
             {/* Tooltip */}
             {!isTranslatingAll && (
                <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${darkMode ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>
                   Translate All Files
                </div>
             )}
           </button>

           {/* SETTINGS BUTTON */}
           <button 
             onClick={() => setShowSettings(true)}
             className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-md border transition-colors duration-300 ${buttonSecondary}`}
             title="Settings"
           >
             <Settings size={16} />
           </button>
        </div>
      </header>

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

                 {/* Upload Raw (current file) - NEW small button */}
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

                 {/* Sync Current (NEW button) */}
                 <button 
                   onClick={handleUpdateLinesFromText}
                   className={`p-1.5 rounded-md transition-all duration-200 ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}
                   title="Sync Current File (apply RAW -> subtitles)"
                 >
                   <RefreshCw size={16} />
                 </button>

                 {/* Sync All (existing global sync) */}
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
                   className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 transition-all duration-300 ${
                     notepadCopied 
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
                className={`absolute inset-0 p-6 whitespace-pre-wrap font-mono text-sm leading-[1.8] pointer-events-none overflow-hidden text-transparent ${
                    darkMode ? 'text-transparent' : 'text-transparent'
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
              className={`w-full h-full p-6 bg-transparent border-none focus:ring-0 resize-none text-sm font-mono leading-[1.8] outline-none transition-colors duration-500 relative z-10 ${
                darkMode 
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
             <div className={`absolute bottom-full right-0 mb-3 w-56 rounded-xl shadow-xl border overflow-hidden origin-bottom-right transition-all animate-in fade-in zoom-in-95 ${
               darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
             }`}>
                <button onClick={() => { fileInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                  <FileText size={16} className="text-indigo-500" /> Upload Files
                </button>
                <button onClick={() => { folderInputRef.current?.click(); setShowImportMenu(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors border-t ${darkMode ? 'text-zinc-300 hover:bg-zinc-800 border-zinc-800' : 'text-zinc-700 hover:bg-zinc-50 border-zinc-100'}`}>
                  <Folder size={16} className="text-amber-500" /> Upload Folder
                </button>

                {/* RAW import options (NEW) */}
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
                <div className={`absolute bottom-full right-0 mb-3 w-72 rounded-xl shadow-2xl border overflow-hidden origin-bottom-right transition-all animate-in fade-in zoom-in-95 ${
                    darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
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
