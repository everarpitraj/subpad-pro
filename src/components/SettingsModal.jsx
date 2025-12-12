
import React from 'react';
import { X } from 'lucide-react';

const SettingsModal = ({ show, onClose, darkMode, aiInstruction, setAiInstruction, onSave }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all ${darkMode ? 'bg-zinc-900 border border-zinc-700' : 'bg-white border border-zinc-200'}`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                    <h3 className={`font-semibold text-lg ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>AI Settings</h3>
                    <button onClick={onClose} className={`p-1 rounded-full hover:bg-opacity-10 transition-colors ${darkMode ? 'hover:bg-zinc-200 text-zinc-400' : 'hover:bg-slate-900 text-slate-400'}`}>
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
                        className={`w-full h-32 p-3 text-sm rounded-lg border resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${darkMode
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
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
