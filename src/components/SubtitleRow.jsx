
import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import TimestampInput from './TimestampInput';
import { timeToMs } from '../utils/timeUtils';

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
        <div className={`group flex items-start gap-4 p-3 border-b transition-colors duration-500 ease-in-out relative ${darkMode
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
                    className={`w-full h-full p-3 text-sm leading-relaxed resize-none outline-none rounded-lg border transition-all duration-500 ease-in-out shadow-sm ${darkMode
                            ? 'bg-[#121214] border-zinc-700 text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600'
                            : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100'
                        }`}
                    placeholder="Subtitle text..."
                />

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">
                    <button
                        onClick={() => onDelete(item.id)}
                        className={`p-1.5 rounded-md transition-colors ${darkMode ? 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
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

export default SubtitleRow;
