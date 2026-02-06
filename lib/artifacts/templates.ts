import { SerializableArtifact } from './types';

export interface WorkspaceTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    artifacts: SerializableArtifact[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
    {
        id: 'saas-launch',
        name: 'SaaS Launch',
        description: 'Launch a SaaS product with timeline, task board, and live metrics',
        icon: '🚀',
        artifacts: [
            {
                id: 'saas-plan',
                type: 'ExecutionPlan',
                state: {
                    title: 'SaaS Launch Roadmap',
                    objective: 'Ship a market-ready SaaS product with clear milestones',
                    steps: [
                        {
                            action: 'Validate positioning',
                            description: 'Define ICP, messaging, and pricing',
                            estimated_time: '1 week',
                        },
                        {
                            action: 'Build MVP',
                            description: 'Ship core features with onboarding',
                            estimated_time: '3 weeks',
                        },
                        {
                            action: 'Beta program',
                            description: 'Onboard early teams and gather feedback',
                            estimated_time: '2 weeks',
                        },
                        {
                            action: 'Launch campaign',
                            description: 'Publish launch assets and community posts',
                            estimated_time: '1 week',
                        },
                        {
                            action: 'Scale and iterate',
                            description: 'Track KPIs and improve retention',
                            estimated_time: 'ongoing',
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'SaaS Launch Roadmap',
            },
            {
                id: 'saas-board',
                type: 'KanbanBoard',
                state: {
                    title: 'Launch Task Board',
                    columns: [
                        {
                            id: 'backlog',
                            title: 'Backlog',
                            color: '#0ea5a5',
                            tasks: [
                                { id: 'sb-1', title: 'Landing page copy', priority: 'high', tags: ['marketing'] },
                                { id: 'sb-2', title: 'Pricing page', priority: 'medium', tags: ['marketing'] },
                            ],
                        },
                        {
                            id: 'build',
                            title: 'Building',
                            color: '#f59e0b',
                            tasks: [
                                { id: 'sb-3', title: 'User onboarding flow', priority: 'high', tags: ['product'] },
                                { id: 'sb-4', title: 'Billing integration', priority: 'high', tags: ['engineering'] },
                            ],
                        },
                        {
                            id: 'ready',
                            title: 'Ready',
                            color: '#10b981',
                            tasks: [
                                { id: 'sb-5', title: 'Design system audit', priority: 'medium', tags: ['design'] },
                            ],
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Launch Task Board',
            },
            {
                id: 'saas-status',
                type: 'SystemStatusPanel',
                state: {
                    system_name: 'Launch KPIs',
                    overall_status: 'healthy',
                    components: [
                        { name: 'Acquisition', status: 'operational' },
                        { name: 'Activation', status: 'operational' },
                        { name: 'Retention', status: 'warning' },
                    ],
                    metrics: {
                        'Signups Today': '248',
                        'Activation Rate': '41%',
                        'Retention (7d)': '28%',
                        'MRR': '$12.4k',
                    },
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Launch KPIs',
            },
        ],
    },
    {
        id: 'deployment',
        name: 'Deployment Orchestration',
        description: 'Plan and track a production deployment with status monitoring',
        icon: '🚀',
        artifacts: [
            {
                id: 'plan-1',
                type: 'ExecutionPlan',
                state: {
                    title: 'Production Deployment Plan',
                    objective: 'Deploy new features to production with zero downtime',
                    steps: [
                        {
                            action: 'Pre-deployment security check',
                            description: 'Run security scans and dependency audits',
                            estimated_time: '30 min',
                        },
                        {
                            action: 'Database migrations',
                            description: 'Run all pending database migrations',
                            estimated_time: '15 min',
                        },
                        {
                            action: 'Blue-green deployment',
                            description: 'Deploy to green environment and run smoke tests',
                            estimated_time: '20 min',
                        },
                        {
                            action: 'Traffic cutover',
                            description: 'Switch traffic from blue to green at load balancer',
                            estimated_time: '5 min',
                        },
                        {
                            action: 'Rollback procedure ready',
                            description: 'Verify rollback procedures are documented and tested',
                            estimated_time: '10 min',
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Production Deployment Plan',
            },
            {
                id: 'status-1',
                type: 'SystemStatusPanel',
                state: {
                    system_name: 'Production Infrastructure',
                    overall_status: 'healthy',
                    components: [
                        { name: 'API Servers', status: 'operational' },
                        { name: 'Database', status: 'operational' },
                        { name: 'Cache Layer', status: 'operational' },
                        { name: 'Load Balancer', status: 'operational' },
                    ],
                    metrics: {
                        'CPU Usage': '34%',
                        'Memory Usage': '52%',
                        'Requests/sec': '1,234',
                        'Error Rate': '0.02%',
                    },
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Production Infrastructure',
            },
            {
                id: 'kanban-1',
                type: 'KanbanBoard',
                state: {
                    title: 'Deployment Tasks',
                    columns: [
                        {
                            id: 'todo',
                            title: 'To Do',
                            color: '#6366f1',
                            tasks: [
                                {
                                    id: 'task-1',
                                    title: 'Prepare release notes',
                                    description: 'Document all changes and breaking changes',
                                    priority: 'high',
                                    tags: ['documentation'],
                                },
                                {
                                    id: 'task-2',
                                    title: 'Update deployment guide',
                                    description: 'Step-by-step guide for operations team',
                                    priority: 'high',
                                    tags: ['documentation'],
                                },
                            ],
                        },
                        {
                            id: 'in-progress',
                            title: 'In Progress',
                            color: '#06b6d4',
                            tasks: [
                                {
                                    id: 'task-3',
                                    title: 'Run integration tests',
                                    description: 'Execute full test suite',
                                    priority: 'high',
                                    assignee: 'QA Team',
                                    tags: ['testing'],
                                },
                            ],
                        },
                        {
                            id: 'done',
                            title: 'Done',
                            color: '#10b981',
                            tasks: [
                                {
                                    id: 'task-4',
                                    title: 'Code review completed',
                                    description: 'All PRs reviewed and approved',
                                    priority: 'high',
                                    tags: ['review'],
                                },
                                {
                                    id: 'task-5',
                                    title: 'Build verified',
                                    description: 'Docker images built and pushed',
                                    priority: 'high',
                                    tags: ['ci/cd'],
                                },
                            ],
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Deployment Tasks',
            },
        ],
    },
    {
        id: 'product-launch',
        name: 'Product Launch',
        description: 'Coordinate a product launch with timeline and team assignments',
        icon: '🎉',
        artifacts: [
            {
                id: 'launch-plan',
                type: 'ExecutionPlan',
                state: {
                    title: 'Product Launch Timeline',
                    objective: 'Successfully launch new product to market on schedule',
                    steps: [
                        {
                            action: 'Marketing campaign goes live',
                            description: 'All ad channels, social media, and email campaigns active',
                            estimated_time: '1 day',
                        },
                        {
                            action: 'Press and influencer outreach',
                            description: 'Send product to press and launch with influencers',
                            estimated_time: '3 days',
                        },
                        {
                            action: 'Product availability',
                            description: 'Product available for purchase on all channels',
                            estimated_time: '1 day',
                        },
                        {
                            action: 'Customer support ready',
                            description: 'Support team trained and monitoring channels',
                            estimated_time: 'ongoing',
                        },
                        {
                            action: 'Monitor and iterate',
                            description: 'Track metrics and respond to feedback',
                            estimated_time: '2 weeks',
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Product Launch Timeline',
            },
            {
                id: 'launch-kanban',
                type: 'KanbanBoard',
                state: {
                    title: 'Launch Workstreams',
                    columns: [
                        {
                            id: 'planning',
                            title: 'Planning',
                            color: '#f59e0b',
                            tasks: [
                                {
                                    id: 'plan-1',
                                    title: 'Define launch messaging',
                                    priority: 'high',
                                    assignee: 'Marketing',
                                    tags: ['marketing'],
                                },
                            ],
                        },
                        {
                            id: 'execution',
                            title: 'Execution',
                            color: '#06b6d4',
                            tasks: [
                                {
                                    id: 'exec-1',
                                    title: 'Create marketing assets',
                                    priority: 'high',
                                    assignee: 'Design',
                                    tags: ['marketing'],
                                },
                                {
                                    id: 'exec-2',
                                    title: 'Prepare product pages',
                                    priority: 'high',
                                    assignee: 'Product',
                                    tags: ['product'],
                                },
                            ],
                        },
                        {
                            id: 'review',
                            title: 'Review & Approval',
                            color: '#8b5cf6',
                            tasks: [],
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Launch Workstreams',
            },
        ],
    },
    {
        id: 'incident-response',
        name: 'Incident Response',
        description: 'Respond to and manage production incidents',
        icon: '🚨',
        artifacts: [
            {
                id: 'incident-plan',
                type: 'ExecutionPlan',
                state: {
                    title: 'Incident Response Procedure',
                    objective: 'Respond to and resolve production incident quickly',
                    steps: [
                        {
                            action: 'Declare incident',
                            description: 'Alert on-call team and declare severity level',
                            estimated_time: '5 min',
                        },
                        {
                            action: 'Assemble war room',
                            description: 'Bring together engineering, ops, and management',
                            estimated_time: '10 min',
                        },
                        {
                            action: 'Assess impact',
                            description: 'Determine affected systems and customers',
                            estimated_time: '15 min',
                        },
                        {
                            action: 'Implement mitigation',
                            description: 'Apply temporary fix or workaround',
                            estimated_time: '30 min',
                        },
                        {
                            action: 'Investigate root cause',
                            description: 'Determine underlying issue',
                            estimated_time: '2 hours',
                        },
                        {
                            action: 'Deploy permanent fix',
                            description: 'Release permanent fix to production',
                            estimated_time: '1 hour',
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Incident Response Procedure',
            },
            {
                id: 'incident-status',
                type: 'SystemStatusPanel',
                state: {
                    system_name: 'Incident Status',
                    overall_status: 'critical',
                    components: [
                        { name: 'User Authentication', status: 'critical' },
                        { name: 'Payment Processing', status: 'operational' },
                        { name: 'Data API', status: 'operational' },
                    ],
                    metrics: {
                        'Time Since Incident': '15 min',
                        'Affected Users': '~5000',
                        'Current Status': 'Investigating',
                        'ETA to Resolution': '30 min',
                    },
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Incident Status',
            },
        ],
    },
    {
        id: 'sprint-planning',
        name: 'Sprint Planning',
        description: 'Organize sprint planning and track features',
        icon: '📋',
        artifacts: [
            {
                id: 'sprint-kanban',
                type: 'KanbanBoard',
                state: {
                    title: 'Sprint Board',
                    columns: [
                        {
                            id: 'backlog',
                            title: 'Backlog',
                            color: '#8b5cf6',
                            tasks: [
                                {
                                    id: 'feat-1',
                                    title: 'User authentication',
                                    description: 'Implement OAuth2 login',
                                    priority: 'high',
                                    tags: ['feature', 'backend'],
                                },
                                {
                                    id: 'feat-2',
                                    title: 'Dark mode support',
                                    description: 'Add dark theme to UI',
                                    priority: 'low',
                                    tags: ['feature', 'frontend'],
                                },
                            ],
                        },
                        {
                            id: 'selected',
                            title: 'Selected for Sprint',
                            color: '#06b6d4',
                            tasks: [
                                {
                                    id: 'task-1',
                                    title: 'Implement API endpoints',
                                    priority: 'high',
                                    assignee: 'Alice',
                                    tags: ['backend'],
                                },
                                {
                                    id: 'task-2',
                                    title: 'UI component library',
                                    priority: 'high',
                                    assignee: 'Bob',
                                    tags: ['frontend'],
                                },
                            ],
                        },
                        {
                            id: 'completed',
                            title: 'Completed',
                            color: '#10b981',
                            tasks: [
                                {
                                    id: 'done-1',
                                    title: 'Database schema',
                                    priority: 'high',
                                    tags: ['infrastructure'],
                                },
                            ],
                        },
                    ],
                },
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                title: 'Sprint Board',
            },
        ],
    },
];

export function loadTemplate(templateId: string) {
    const template = WORKSPACE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
        console.warn(`Template not found: ${templateId}`);
        return null;
    }
    return template;
}
