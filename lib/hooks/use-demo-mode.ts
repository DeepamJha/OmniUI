import { useEffect } from 'react';
import { useArtifactStore } from '@/lib/artifacts/store';
import { useSearchParams } from 'next/navigation';
import { WORKSPACE_TEMPLATES } from '@/lib/artifacts/templates';

export function useDemoMode() {
    const searchParams = useSearchParams();
    const addArtifact = useArtifactStore((state) => state.addArtifact);
    const getArtifacts = useArtifactStore((state) => state.getAllArtifacts);
    const { ARTIFACT_SCHEMAS } = require('@/lib/artifacts/store');

    useEffect(() => {
        // Check if demo mode is enabled via URL param
        const isDemoMode = searchParams.get('demo') === 'true';
        if (!isDemoMode) return;

        // Get current artifacts
        const currentArtifacts = getArtifacts();

        // Only load demo if workspace is empty
        if (currentArtifacts.length > 0) {
            console.log('Demo mode: Workspace already has artifacts, skipping auto-load');
            return;
        }

        console.log('🎬 Demo mode activated - loading sample workspace...');

        // Load the deployment template as demo
        const template = WORKSPACE_TEMPLATES.find((t) => t.id === 'deployment');
        if (!template) return;

        // Load all artifacts from the template
        template.artifacts.forEach((serializedArtifact) => {
            const schema = ARTIFACT_SCHEMAS[serializedArtifact.type];
            if (!schema) return;

            const artifact = {
                id: serializedArtifact.id,
                type: serializedArtifact.type,
                state: serializedArtifact.state,
                schema,
                title: serializedArtifact.title,
                description: serializedArtifact.description,
                tags: serializedArtifact.tags,
                version: serializedArtifact.version,
                createdAt: serializedArtifact.createdAt,
                updatedAt: serializedArtifact.updatedAt,
                parentId: serializedArtifact.parentId,
                relatedIds: serializedArtifact.relatedIds,
            };

            addArtifact(artifact);
        });

        console.log('✅ Demo workspace loaded');
    }, [searchParams, addArtifact, getArtifacts]);
}
