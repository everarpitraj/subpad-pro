
import { generateId } from './idUtils';

export const parseSRT = (data) => {
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

export const formatNotepadContent = (subs) => {
    return subs.map((sub, index) => {
        const num = String(index + 1).padStart(3, '0');
        return `${num} ${sub.text}`;
    }).join('\n\n');
};

export const baseNameFrom = (filename) => filename.replace(/\.(srt|vtt|txt|lrc)$/i, '').trim();
