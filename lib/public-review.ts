export const reviewScenarios=['live','available','upcoming','full','unannounced','unknown'] as const
export type ReviewScenario=typeof reviewScenarios[number]
export const reviewCookie='fluffytail-public-review'
export function publicReviewEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.FLUFFYTAIL_PUBLIC_REVIEW==='1'}
