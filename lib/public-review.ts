export const reviewScenarios=['live','available','upcoming','full','unannounced','unknown'] as const
export type ReviewScenario=typeof reviewScenarios[number]
export const reviewLabels:Record<ReviewScenario,string>={live:'Current published records',available:'Puppy available',upcoming:'All reserved · upcoming places available',full:'Upcoming positions occupied',unannounced:'No litter announced',unknown:'Availability data unavailable'}
export function isReviewScenario(value:unknown):value is ReviewScenario{return reviewScenarios.some(s=>s===value)}
export const reviewCookie='fluffytail-public-review'
export function publicReviewEnabled(){return process.env.VERCEL_ENV==='preview'&&process.env.FLUFFYTAIL_PUBLIC_REVIEW==='1'}
