'use client';

import React, { useCallback, useState, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Handle,
    Position,
    MarkerType,
    type Node,
    type Edge,
    type Connection,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { z } from 'zod';

// Schema for the component props - handles null/undefined from AI
const safeString = (defaultVal: string) => z.string().nullish().transform(val => val ?? defaultVal);

export const interactiveFlowchartSchema = z.object({
    title: safeString('Process Flow').describe('Title of the flowchart'),
    nodes: z.array(
        z.object({
            id: safeString(`node-${Date.now()}`).describe('Unique node ID'),
            label: safeString('Step').describe('Display label for the node'),
            type: safeString('process').describe('Node type: start, process, decision, end, or custom'),
            description: z.string().nullish().describe('Detailed description shown on click'),
            status: safeString('pending').describe('Node status: pending, active, completed, error'),
        })
    ).nullish().transform(val => val ?? []).describe('List of nodes in the flowchart'),
    edges: z.array(
        z.object({
            source: safeString('').describe('Source node ID'),
            target: safeString('').describe('Target node ID'),
            label: z.string().nullish().describe('Edge label (e.g., Yes/No for decisions)'),
        })
    ).nullish().transform(val => val ?? []).describe('Connections between nodes'),
});

export type InteractiveFlowchartProps = z.infer<typeof interactiveFlowchartSchema>;

// Custom node component with glassmorphism styling
const CustomNode = ({ data, selected }: NodeProps) => {
    const nodeData = data as {
        label: string;
        type: string;
        description?: string;
        status: string;
        onNodeClick: (id: string) => void;
        id: string;
    };

    const getNodeStyle = () => {
        const baseStyle = `
      relative px-4 py-3 rounded-xl border-2 min-w-[140px] text-center
      backdrop-blur-xl shadow-lg transition-all duration-300 cursor-pointer
      hover:scale-105 hover:shadow-2xl
    `;

        const statusColors: Record<string, string> = {
            pending: 'bg-gray-800/60 border-gray-600 text-gray-300',
            active: 'bg-blue-900/60 border-blue-500 text-blue-200 ring-2 ring-blue-500/50 animate-pulse',
            completed: 'bg-green-900/60 border-green-500 text-green-200',
            error: 'bg-red-900/60 border-red-500 text-red-200',
        };

        const typeIcons: Record<string, string> = {
            start: '🚀',
            process: '⚙️',
            decision: '🔀',
            end: '🏁',
        };

        return {
            className: `${baseStyle} ${statusColors[nodeData.status] || statusColors.pending} ${selected ? 'ring-4 ring-purple-500/50' : ''}`,
            icon: typeIcons[nodeData.type] || '⚙️',
        };
    };

    const style = getNodeStyle();

    return (
        <div
            className={style.className}
            onClick={() => nodeData.onNodeClick(nodeData.id)}
        >
            {/* Input handle */}
            {nodeData.type !== 'start' && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!bg-purple-500 !w-3 !h-3 !border-2 !border-purple-300"
                />
            )}

            {/* Node content */}
            <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">{style.icon}</span>
                <span className="font-medium text-sm">{nodeData.label}</span>
            </div>

            {/* Status indicator */}
            <div className={`
        absolute -top-1 -right-1 w-3 h-3 rounded-full
        ${nodeData.status === 'active' ? 'bg-blue-400 animate-ping' : ''}
        ${nodeData.status === 'completed' ? 'bg-green-400' : ''}
        ${nodeData.status === 'error' ? 'bg-red-400' : ''}
        ${nodeData.status === 'pending' ? 'bg-gray-500' : ''}
      `} />

            {/* Output handle */}
            {nodeData.type !== 'end' && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!bg-purple-500 !w-3 !h-3 !border-2 !border-purple-300"
                />
            )}
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

export function InteractiveFlowchart({ title, nodes: inputNodes, edges: inputEdges }: InteractiveFlowchartProps) {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // Convert input nodes to ReactFlow format
    const initialNodes: Node[] = useMemo(() => {
        const columns: Record<string, number> = { start: 0, process: 1, decision: 2, end: 3 };
        const typeCount: Record<string, number> = { start: 0, process: 0, decision: 0, end: 0 };

        return inputNodes.map((node) => {
            const col = columns[node.type] ?? 1;
            const row = typeCount[node.type]++;

            return {
                id: node.id,
                type: 'custom',
                position: { x: 100 + col * 200, y: 80 + row * 120 },
                data: {
                    ...node,
                    onNodeClick: (id: string) => setSelectedNode(id === selectedNode ? null : id),
                },
            };
        });
    }, [inputNodes, selectedNode]);

    // Convert input edges to ReactFlow format
    const initialEdges: Edge[] = useMemo(() => {
        return inputEdges.map((edge, idx) => ({
            id: `e${idx}-${edge.source}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            labelStyle: { fill: '#fff', fontWeight: 600, fontSize: 12 },
            labelBgStyle: { fill: '#333', fillOpacity: 0.8 },
            labelBgPadding: [8, 4] as [number, number],
            labelBgBorderRadius: 4,
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            animated: true,
        }));
    }, [inputEdges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({
            ...params,
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            animated: true,
        }, eds)),
        [setEdges]
    );

    // Get selected node details
    const selectedNodeData = inputNodes.find(n => n.id === selectedNode);

    return (
        <div className="w-full rounded-2xl overflow-hidden border border-gray-700/50 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-700/50 bg-gray-800/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{title}</h3>
                            <p className="text-xs text-gray-400">{inputNodes.length} nodes • {inputEdges.length} connections</p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" /> Pending</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Active</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Done</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Error</span>
                    </div>
                </div>
            </div>

            {/* Flowchart */}
            <div className="h-[400px] relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    className="bg-gray-900/50"
                >
                    <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-700 [&>button]:!border-gray-600 [&>button]:!text-white [&>button:hover]:!bg-gray-600" />
                    <Background color="#374151" gap={20} />
                </ReactFlow>
            </div>

            {/* Selected node details panel */}
            {selectedNodeData && (
                <div className="px-5 py-4 border-t border-gray-700/50 bg-gray-800/30 animate-in slide-in-from-bottom-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">
                                    {selectedNodeData.type === 'start' && '🚀'}
                                    {selectedNodeData.type === 'process' && '⚙️'}
                                    {selectedNodeData.type === 'decision' && '🔀'}
                                    {selectedNodeData.type === 'end' && '🏁'}
                                </span>
                                <h4 className="font-semibold text-white">{selectedNodeData.label}</h4>
                                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${selectedNodeData.status === 'pending' ? 'bg-gray-700 text-gray-300' : ''}
                  ${selectedNodeData.status === 'active' ? 'bg-blue-500/20 text-blue-300' : ''}
                  ${selectedNodeData.status === 'completed' ? 'bg-green-500/20 text-green-300' : ''}
                  ${selectedNodeData.status === 'error' ? 'bg-red-500/20 text-red-300' : ''}
                `}>
                                    {selectedNodeData.status}
                                </span>
                            </div>
                            {selectedNodeData.description && (
                                <p className="mt-2 text-sm text-gray-400">{selectedNodeData.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InteractiveFlowchart;
