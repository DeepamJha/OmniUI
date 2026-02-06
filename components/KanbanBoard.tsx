'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Schema for Kanban Board
export const kanbanBoardSchema = z.object({
    title: z.string().catch('Task Board').describe('Board title'),
    columns: z.array(
        z.object({
            id: z.string().catch('').describe('Column ID'),
            title: z.string().catch('To Do').describe('Column title'),
            color: z.string().catch('#6366f1').describe('Column accent color'),
            tasks: z.array(
                z.object({
                    id: z.string().catch('').describe('Task ID'),
                    title: z.string().catch('').describe('Task title'),
                    description: z.string().optional().catch(undefined).describe('Task description'),
                    priority: z.enum(['low', 'medium', 'high', 'critical']).catch('medium').describe('Task priority'),
                    assignee: z.string().optional().catch(undefined).describe('Assigned to'),
                    dueDate: z.string().optional().catch(undefined).describe('Due date'),
                    tags: z.array(z.string()).catch([]).describe('Task tags'),
                })
            ).catch([]).describe('Tasks in this column'),
        })
    ).catch([]).describe('Board columns'),
});

export type KanbanBoardProps = z.infer<typeof kanbanBoardSchema>;

// Extract types from schema
type Task = z.infer<typeof kanbanBoardSchema>['columns'][number]['tasks'][number];
type Column = z.infer<typeof kanbanBoardSchema>['columns'][number];

// Sortable Task Card Component
function TaskCard({ task, columnColor }: { task: Task; columnColor: string }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priorityColors = {
        low: 'bg-gray-500/20 text-gray-400',
        medium: 'bg-blue-500/20 text-blue-400',
        high: 'bg-orange-500/20 text-orange-400',
        critical: 'bg-red-500/20 text-red-400',
    };

    const priorityIcons = {
        low: '⬇',
        medium: '➡',
        high: '⬆',
        critical: '🔥',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`
                group relative bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 
                border border-white/10 hover:border-white/20
                cursor-grab active:cursor-grabbing
                transition-[transform,box-shadow,border-color,opacity] duration-150
                ${isDragging ? 'opacity-70 ring-1 ring-teal-400/40' : 'hover:shadow-md hover:shadow-black/10 hover:-translate-y-0.5'}
            `}
        >
            {/* Priority indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                    {priorityIcons[task.priority]} {task.priority}
                </span>
            </div>

            {/* Task title */}
            <h4 className="text-white font-medium pr-20 mb-2 leading-snug">
                {task.title}
            </h4>

            {/* Task description */}
            {task.description && (
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {task.description}
                </p>
            )}

            {/* Task metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Assignee */}
                {task.assignee && (
                    <div className="flex items-center gap-1 text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {task.assignee}
                    </div>
                )}

                {/* Due date */}
                {task.dueDate && (
                    <div className="flex items-center gap-1 text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {task.dueDate}
                    </div>
                )}

                {/* Tags */}
                {task.tags?.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                        {task.tags.slice(0, 2).map((tag: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                #{tag}
                            </span>
                        ))}
                        {task.tags.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                +{task.tags.length - 2}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Accent bar */}
            <div
                className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl opacity-50"
                style={{ backgroundColor: columnColor }}
            />
        </div>
    );
}

// Sortable Column Component
function KanbanColumn({ column, tasks }: { column: any; tasks: any[] }) {
    return (
        <div className="flex-shrink-0 w-80">
            {/* Column header */}
            <div
                className="sticky top-0 z-10 backdrop-blur-xl bg-gray-900/80 rounded-t-xl p-4 border border-white/10 border-b-0"
                style={{ borderTopColor: column.color + '40' }}
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                        />
                        {column.title}
                    </h3>
                    <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </div>
            </div>

            {/* Column content */}
            <div className="bg-gray-900/40 backdrop-blur-sm rounded-b-xl border border-white/10 border-t-0 p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm">No tasks yet</p>
                            </div>
                        ) : (
                            tasks.map(task => (
                                <TaskCard key={task.id} task={task} columnColor={column.color} />
                            ))
                        )}
                    </div>
                </SortableContext>

                {/* Add task button */}
                <button className="w-full mt-3 py-2 rounded-lg border border-dashed border-white/20 text-gray-500 hover:text-white hover:border-white/40 transition-colors text-sm">
                    + Add task
                </button>
            </div>
        </div>
    );
}

// Main Kanban Board Component
export function KanbanBoard({ title, columns }: KanbanBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [columnsState, setColumnsState] = useState(columns);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        // Find which columns the task is moving between
        const activeColumnIndex = columnsState.findIndex(col =>
            col.tasks.some((task: any) => task.id === active.id)
        );

        const overColumnIndex = columnsState.findIndex(col =>
            col.tasks.some((task: any) => task.id === over.id) || col.id === over.id
        );

        if (activeColumnIndex === -1) {
            setActiveId(null);
            return;
        }

        const newColumns = [...columnsState];

        // Moving within same column
        if (activeColumnIndex === overColumnIndex) {
            const column = newColumns[activeColumnIndex];
            const oldIndex = column.tasks.findIndex((task: any) => task.id === active.id);
            const newIndex = column.tasks.findIndex((task: any) => task.id === over.id);

            if (oldIndex !== newIndex) {
                column.tasks = arrayMove(column.tasks, oldIndex, newIndex);
            }
        }
        // Moving to different column
        else if (overColumnIndex !== -1) {
            const sourceColumn = newColumns[activeColumnIndex];
            const destColumn = newColumns[overColumnIndex];

            const taskIndex = sourceColumn.tasks.findIndex((task: any) => task.id === active.id);
            const [movedTask] = sourceColumn.tasks.splice(taskIndex, 1);

            // Add to beginning of destination column
            destColumn.tasks.unshift(movedTask);
        }

        setColumnsState(newColumns);
        setActiveId(null);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // Find active task for drag overlay
    const activeTask = activeId
        ? columnsState.flatMap((col: any) => col.tasks).find((task: any) => task.id === activeId)
        : null;

    const activeColumn = activeId
        ? columnsState.find((col: any) => col.tasks.some((task: any) => task.id === activeId))
        : null;

    return (
        <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl animate-artifact-pop">
            {/* Board header */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-teal-900/20 to-amber-900/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">{title}</h3>
                            <p className="text-xs text-gray-400">
                                {columnsState.length} columns • {columnsState.reduce((acc: number, col: any) => acc + col.tasks.length, 0)} tasks
                            </p>
                        </div>
                    </div>

                    {/* Board actions */}
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-400 hover:text-white transition-colors">
                            Filter
                        </button>
                        <button className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-sm text-teal-200 transition-colors">
                            + Add column
                        </button>
                    </div>
                </div>
            </div>

            {/* Board columns */}
            <div className="p-6 overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="flex gap-4">
                        {columnsState.map((column: any) => (
                            <KanbanColumn key={column.id} column={column} tasks={column.tasks} />
                        ))}

                        {/* Add column placeholder */}
                        <div className="flex-shrink-0 w-80">
                            <button className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 text-gray-500 hover:text-white transition-all flex flex-col items-center justify-center gap-2 hover:bg-white/5">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add column
                            </button>
                        </div>
                    </div>

                    {/* Drag overlay */}
                    <DragOverlay>
                        {activeTask && activeColumn ? (
                            <div className="scale-[1.02] shadow-xl">
                                <TaskCard task={activeTask} columnColor={activeColumn.color} />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}

export default KanbanBoard;
