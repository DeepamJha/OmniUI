'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useArtifactStore } from './store';

/**
 * Inline editable text field
 * Double-click to edit, Enter to save, Escape to cancel
 */
export function EditableText({
    artifactId,
    path,
    value,
    placeholder = 'Click to edit',
    className = '',
}: {
    artifactId: string;
    path: string[];
    value: string;
    placeholder?: string;
    className?: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const updateArtifact = useArtifactStore(state => state.updateArtifact);
    const addMutation = useArtifactStore(state => state.addMutation);
    const getArtifact = useArtifactStore(state => state.getArtifact);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        const artifact = getArtifact(artifactId);
        if (!artifact) return;

        // Create mutation
        const mutation = {
            id: `mut_${Date.now()}`,
            artifactId,
            operation: 'update_property' as const,
            path,
            value: editValue,
            previousValue: value,
            timestamp: Date.now(),
            source: 'user' as const,
            reason: 'Inline edit',
        };

        // Apply to state
        const newState = { ...artifact.state };
        let current: any = newState;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = editValue;

        updateArtifact(artifactId, newState);
        addMutation(mutation);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className={`bg-white/10 border border-blue-500/50 rounded px-2 py-1 outline-none ${className}`}
            />
        );
    }

    return (
        <span
            onDoubleClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-colors ${className}`}
            title="Double-click to edit"
        >
            {value || <span className="text-gray-500 italic">{placeholder}</span>}
        </span>
    );
}

/**
 * Inline editable checkbox
 */
export function EditableCheckbox({
    artifactId,
    path,
    value,
    label,
}: {
    artifactId: string;
    path: string[];
    value: boolean;
    label?: string;
}) {
    const updateArtifact = useArtifactStore(state => state.updateArtifact);
    const addMutation = useArtifactStore(state => state.addMutation);
    const getArtifact = useArtifactStore(state => state.getArtifact);

    const handleToggle = () => {
        const artifact = getArtifact(artifactId);
        if (!artifact) return;

        const newValue = !value;

        // Create mutation
        const mutation = {
            id: `mut_${Date.now()}`,
            artifactId,
            operation: 'update_property' as const,
            path,
            value: newValue,
            previousValue: value,
            timestamp: Date.now(),
            source: 'user' as const,
            reason: `Toggled ${label || path.join('.')}`,
        };

        // Apply to state
        const newState = { ...artifact.state };
        let current: any = newState;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newValue;

        updateArtifact(artifactId, newState);
        addMutation(mutation);
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer group">
            <input
                type="checkbox"
                checked={value}
                onChange={handleToggle}
                className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-blue-500 cursor-pointer"
            />
            {label && (
                <span className="text-gray-300 group-hover:text-white transition-colors">
                    {label}
                </span>
            )}
        </label>
    );
}

/**
 * Inline editable select/dropdown with custom styling
 */
export function EditableSelect({
    artifactId,
    path,
    value,
    options,
    className = '',
}: {
    artifactId: string;
    path: string[];
    value: string;
    options: string[] | { label: string; value: string }[];
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const updateArtifact = useArtifactStore(state => state.updateArtifact);
    const addMutation = useArtifactStore(state => state.addMutation);
    const getArtifact = useArtifactStore(state => state.getArtifact);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleChange = (newValue: string) => {
        setIsOpen(false);
        if (newValue === value) return;

        const artifact = getArtifact(artifactId);
        if (!artifact) return;

        // Create mutation
        const mutation = {
            id: `mut_${Date.now()}`,
            artifactId,
            operation: 'update_property' as const,
            path,
            value: newValue,
            previousValue: value,
            timestamp: Date.now(),
            source: 'user' as const,
            reason: `Changed ${path[path.length - 1]} to ${newValue}`,
        };

        // Apply to state
        const newState = { ...artifact.state };
        let current: any = newState;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newValue;

        updateArtifact(artifactId, newState);
        addMutation(mutation);
    };

    const normalizedOptions = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
    );

    const currentOption = normalizedOptions.find(o => o.value === value) || normalizedOptions[0];

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className}`}>
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                    bg-gray-800/80 border border-gray-700/50 
                    hover:border-blue-500/50 hover:bg-gray-700/80
                    transition-all duration-200 cursor-pointer
                    backdrop-blur-sm"
            >
                <span className="text-gray-200">{currentOption?.label}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px]
                    bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg
                    shadow-xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {normalizedOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => handleChange(opt.value)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors
                                flex items-center gap-2
                                ${opt.value === value
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'}`}
                        >
                            {opt.value === value && (
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            <span className={opt.value !== value ? 'ml-6' : ''}>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Drag-to-reorder list
 */
export function ReorderableList({
    artifactId,
    path,
    items,
    renderItem,
}: {
    artifactId: string;
    path: string[];
    items: any[];
    renderItem: (item: any, index: number) => React.ReactNode;
}) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const updateArtifact = useArtifactStore(state => state.updateArtifact);
    const addMutation = useArtifactStore(state => state.addMutation);
    const getArtifact = useArtifactStore(state => state.getArtifact);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const artifact = getArtifact(artifactId);
        if (!artifact) return;

        // Reorder items
        const newItems = [...items];
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(dropIndex, 0, removed);

        // Create mutation
        const mutation = {
            id: `mut_${Date.now()}`,
            artifactId,
            operation: 'reorder_items' as const,
            path,
            value: newItems,
            previousValue: items,
            timestamp: Date.now(),
            source: 'user' as const,
            reason: `Moved item from position ${draggedIndex + 1} to ${dropIndex + 1}`,
        };

        // Apply to state
        const newState = { ...artifact.state };
        let current: any = newState;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newItems;

        updateArtifact(artifactId, newState);
        addMutation(mutation);
        setDraggedIndex(null);
    };

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
}

/**
 * Quick delete button
 */
export function InlineDeleteButton({
    artifactId,
    itemPath,
    itemIndex,
    onDelete,
}: {
    artifactId: string;
    itemPath: string[];
    itemIndex: number;
    onDelete?: () => void;
}) {
    const updateArtifact = useArtifactStore(state => state.updateArtifact);
    const addMutation = useArtifactStore(state => state.addMutation);
    const getArtifact = useArtifactStore(state => state.getArtifact);

    const handleDelete = () => {
        const artifact = getArtifact(artifactId);
        if (!artifact) return;

        // Get items array
        const newState = { ...artifact.state };
        let current: any = newState;
        for (const key of itemPath) {
            current = current[key];
        }

        if (!Array.isArray(current)) return;

        const deletedItem = current[itemIndex];
        current.splice(itemIndex, 1);

        // Create mutation
        const mutation = {
            id: `mut_${Date.now()}`,
            artifactId,
            operation: 'remove_item' as const,
            path: [...itemPath, String(itemIndex)],
            previousValue: deletedItem,
            timestamp: Date.now(),
            source: 'user' as const,
            reason: 'Inline delete',
        };

        updateArtifact(artifactId, newState);
        addMutation(mutation);
        onDelete?.();
    };

    return (
        <button
            onClick={handleDelete}
            className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete item"
        >
            🗑️
        </button>
    );
}
