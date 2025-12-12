
let uniqueIdCounter = 0;

export const generateId = () => {
    const prefix = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substr(2);
    uniqueIdCounter++;
    return `${prefix}-${uniqueIdCounter}`;
};
