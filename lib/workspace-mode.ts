export function liveWorkspaceEnabled(){return process.env.FLUFFYTAIL_STAFF_WORKSPACE_ENABLED==='1'&&process.env.VERCEL_ENV==='production'&&process.env.NEXT_PUBLIC_SANITY_PROJECT_ID==='3glz6dkx'&&process.env.NEXT_PUBLIC_SANITY_DATASET==='production'}
export function syntheticWorkspaceEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.NEXT_PUBLIC_SANITY_PROJECT_ID==='gu1xkpsg'&&process.env.NEXT_PUBLIC_SANITY_DATASET==='synthetic'}
export function workspaceNamespace():'live-v1'|'review-v1'{return liveWorkspaceEnabled()?'live-v1':'review-v1'}
