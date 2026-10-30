import {publicReviewEnabled} from '@/lib/public-review'
import {reviewScenario} from '@/sanity/lib/public-review'
import PublicReviewControls from './PublicReviewControls'
export default async function PublicReviewBar(){if(!publicReviewEnabled())return null;return <aside className="brand-container public-review-bar" aria-label="Preview review controls"><strong>REVIEW ONLY — submissions and transactions disabled</strong><PublicReviewControls appliedScenario={await reviewScenario()}/></aside>}
