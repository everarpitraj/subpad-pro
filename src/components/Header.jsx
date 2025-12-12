
import React, { useRef, useState } from 'react';
import { Settings, Globe, Loader2, Maximize2, Minimize2, ChevronRight, Search, FileText, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Header = ({
    darkMode,
    setDarkMode,
    activeFile,
    files,
    setActiveFileId,
    isTranslatingAll,
    handleAiTranslateAll,
    setShowSettings,
    closeFile
}) => {
    const [showFileSwitcher, setShowFileSwitcher] = useState(false);
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const fileSwitcherRef = useRef(null);

    // Close file switcher on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (fileSwitcherRef.current && !fileSwitcherRef.current.contains(event.target)) setShowFileSwitcher(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Update fullscreen state
    React.useEffect(() => {
        const onFsChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const toggleFullScreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen toggle failed:", err);
        }
    };

    const buttonSecondary = darkMode
        ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300"
        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900";

    return (
        <header className={`w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {/* CUSTOM LOGO */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transform transition-transform hover:scale-105 bg-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-6 h-6" role="img" aria-label="SubPad logo">
                            <defs><style>{'.cls-1{fill:#0072ff}'}</style></defs>
                            <g id="Layer_2" data-name="Layer 2">
                                <path className="cls-1" d="m13.1 9.58 5.27 9.54a1.7 1.7 0 0 0 1.49.88h5.93a.73.73 0 0 0 .64-1.09L20.67 8.49a.85.85 0 0 0-.76-.49h-4a11.76 11.76 0 0 0-2.14.2.94.94 0 0 0-.67 1.38zM44.88 20H51a.89.89 0 0 0 .78-1.32L46.17 8.49a.9.9 0 0 0-.79-.49h-6.15a.89.89 0 0 0-.78 1.32l5.65 10.22a.89.89 0 0 0 .78.46zM4 19.6a.39.39 0 0 0 .38.4h8.34a.92.92 0 0 0 .8-1.36l-4.08-7.41A.92.92 0 0 0 8 11a12.11 12.11 0 0 0-4 8.6zM53.72 8h-1.47a1 1 0 0 0-.92 1.56l5.47 9.9a1 1 0 0 0 .92.54H59a1 1 0 0 0 1-1v-4.72A6.3 6.3 0 0 0 53.72 8zM25.56 9.06l5.84 10.57a.72.72 0 0 0 .6.37h6.54a.72.72 0 0 0 .63-1.06L33.42 8.49V8.4a.7.7 0 0 0-.68-.4h-6.55a.72.72 0 0 0-.63 1.06zM58.8 24H4v20.12A11.92 11.92 0 0 0 15.88 56h32.24A11.92 11.92 0 0 0 60 44.12V25.2a1.2 1.2 0 0 0-1.2-1.2z" />
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
                            <div className={`absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
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
                                            className={`w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 cursor-pointer transition-colors duration-200 group ${activeFile.id === file.id
                                                    ? (darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')
                                                    : (darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700')
                                                }`}
                                        >
                                            <FileText size={14} className={activeFile.id === file.id ? 'text-indigo-500' : 'opacity-50'} />
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

                {/* Fullscreen Minimal Premium Button */}
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
                    className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-md border transition-all duration-300 relative group overflow-hidden ${isTranslatingAll ? 'cursor-not-allowed border-indigo-500/50' :
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
    );
};

export default Header;
