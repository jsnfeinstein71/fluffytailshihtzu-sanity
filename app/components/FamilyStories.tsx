import Link from 'next/link'
import {feedbackSourceDateLabel,type PublicStory} from '@/lib/feedback'
import '../our-families/families.css'

// Keep images on the revocable no-store photo route; an image optimizer cache
// must not retain a photograph after its story is unpublished.
/* eslint-disable @next/next/no-img-element */

export function FamilyStory({story, linkToCollection = false}: {story: PublicStory; linkToCollection?: boolean}) {
  const dateLabel = feedbackSourceDateLabel(story.originalDate)

  return <article className="family-story" id={`story-${story.id}`}>
    {story.photoUrl ? <div className="family-story-photo"><img src={story.photoUrl} alt={story.puppyName ? `${story.puppyName}, shared by their family` : 'A puppy photograph shared by their family'} loading="lazy" /></div> : null}
    <div className="family-story-content">
      <blockquote><p>{story.text}</p></blockquote>
      <footer>
        <p className="family-story-name">{story.displayName}</p>
        {story.puppyName ? <p className="family-story-puppy">With {story.puppyName}</p> : null}
        {dateLabel ? <time dateTime={story.originalDate!}>{dateLabel}</time> : null}
      </footer>
      {linkToCollection ? <Link className="text-link family-story-link" href={`/our-families#story-${encodeURIComponent(story.id)}`}>Read our families’ stories <span aria-hidden="true">&rarr;</span></Link> : null}
    </div>
  </article>
}

export default function FamilyStories({stories, home = false}: {stories: PublicStory[]; home?: boolean}) {
  if (!stories.length) return <div className="family-stories-empty">
    <p>There is more to a puppy’s story after going home. This is where our families can share a little of life together.</p>
    {!home ? <Link className="text-link" href="/contact">Get to know Jeanne <span aria-hidden="true">&rarr;</span></Link> : null}
  </div>

  return <div className={`family-story-grid${home ? ' family-story-grid-home' : ''}`}>
    {stories.map(story => <FamilyStory key={story.id} story={story} linkToCollection={home} />)}
  </div>
}
