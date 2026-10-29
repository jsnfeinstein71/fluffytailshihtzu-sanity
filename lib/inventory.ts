export const litterStatusOptions = [
  {title: 'Upcoming (expected)', value: 'planned'},
  {title: 'Active (born)', value: 'current'},
  {title: 'Past', value: 'past'},
  {title: 'Active (legacy)', value: 'active'},
  {title: 'Upcoming (legacy)', value: 'upcoming'},
]

export const puppyStatusOptions = [
  {title: 'Available', value: 'available'},
  {title: 'Hold', value: 'hold'},
  {title: 'Reserved', value: 'reserved'},
  {title: 'Sold', value: 'sold'},
  {title: 'Holdback', value: 'holdback'},
  {title: 'Gone Home', value: 'gone-home'},
]

export type Parent = {name?: string | null; photoUrl?: string | null}

export type Litter = {
  _id: string
  title?: string | null
  status?: string | null
  birthDate?: string | null
  expectedBirthDate?: string | null
  expectedAvailability?: string | null
  girlsCount?: number | null
  boysCount?: number | null
  summary?: string | null
  price?: number | null
  deposit?: number | null
  pricingStatus?: 'established' | 'estimated' | 'unset' | null
  groupPhotoUrl?: string | null
  sortOrder?: number | null
  sire?: Parent | null
  dam?: Parent | null
}

export type Puppy = {
  _id: string
  name?: string | null
  slug?: string | null
  status?: string | null
  sex?: string | null
  color?: string | null
  notes?: string | null
  sortOrder?: number | null
  litterId?: string | null
  litterTitle?: string | null
  litterStatus?: string | null
  birthDate?: string | null
  photoUrl?: string | null
  overridePrice?: number | null
  litterPrice?: number | null
  litterDeposit?: number | null
  litterPricingStatus?: 'established' | 'estimated' | 'unset' | null
}

export function normalizeLitterStatus(status?: string | null) {
  if (status === 'active' || status === 'current') return 'current'
  if (status === 'upcoming' || status === 'planned') return 'planned'
  if (status === 'past') return 'past'
  return 'unknown'
}

export function formatLitterStatus(status?: string | null) {
  const normalized = normalizeLitterStatus(status)
  if (normalized === 'current') return 'Current'
  if (normalized === 'planned') return 'Upcoming'
  if (normalized === 'past') return 'Past'
  return 'Litter'
}

export function formatPuppyStatus(status?: string | null) {
  return puppyStatusOptions.find((option) => option.value === status)?.title || 'Status pending'
}

export function puppyStatusClass(status?: string | null) {
  return puppyStatusOptions.some((option) => option.value === status) ? `status-${status}` : 'status-unknown'
}

export function canInquireAboutPuppy(puppy: Puppy) {
  return puppy.status === 'available' && normalizeLitterStatus(puppy.litterStatus) === 'current'
}

function validDate(value?: string | null) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string | null, short = false) {
  const date = validDate(value)
  return date ? date.toLocaleDateString('en-US', {month: short ? 'short' : 'long', day: 'numeric', ...(short ? {} : {year: 'numeric'}), timeZone: 'UTC'}) : ''
}

export function getAgeInWeeks(birthDate?: string | null, now = new Date()) {
  const born = validDate(birthDate)
  if (!born || born > now) return null
  return Math.floor((now.getTime() - born.getTime()) / (86400000 * 7))
}

export function getReadyDate(birthDate?: string | null) {
  const born = validDate(birthDate)
  if (!born) return ''
  born.setUTCDate(born.getUTCDate() + 56)
  return formatDate(born.toISOString(), true)
}

export function formatCurrency(value: number, cents = false) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0}).format(value)
}

export function getLitterDate(litter: Litter) {
  // Older expected litters stored their due date in birthDate.
  return normalizeLitterStatus(litter.status) === 'planned'
    ? litter.expectedBirthDate || litter.birthDate
    : litter.birthDate
}

export function sortLitters(litters: Litter[]) {
  return [...litters].sort((a, b) => {
    const manual = (a.sortOrder ?? Number.POSITIVE_INFINITY) - (b.sortOrder ?? Number.POSITIVE_INFINITY)
    if (manual) return manual
    return (getLitterDate(a) || '9999').localeCompare(getLitterDate(b) || '9999') || a._id.localeCompare(b._id)
  })
}

export function getLittersByStatus(litters: Litter[], status: 'current' | 'planned' | 'past') {
  return sortLitters(litters.filter((litter) => normalizeLitterStatus(litter.status) === status))
}

export function getPuppiesForLitter(puppies: Puppy[], litterId: string) {
  return puppies.filter((puppy) => puppy.litterId === litterId).sort((a, b) => {
    const manual = (a.sortOrder ?? Number.POSITIVE_INFINITY) - (b.sortOrder ?? Number.POSITIVE_INFINITY)
    return manual || (a.name || '').localeCompare(b.name || '') || a._id.localeCompare(b._id)
  })
}

export function shouldShowWaitlist(litters: Litter[], puppies: Puppy[]) {
  const activeIds = new Set(getLittersByStatus(litters, 'current').map((litter) => litter._id))
  const available = puppies.filter((puppy) => puppy.status === 'available' && activeIds.has(puppy.litterId || ''))
  return !(available.some((puppy) => puppy.sex === 'male') && available.some((puppy) => puppy.sex === 'female'))
}

export function puppyPath(slug: string) {
  return `/puppies/${encodeURIComponent(slug)}`
}

export function buildPuppyInquiryUrl(puppy: Puppy) {
  const puppyText = puppy.name || 'this puppy'
  const params = new URLSearchParams({
    puppySlug: puppy.slug || '',
    puppy: puppy.name || '',
    litter: puppy.litterTitle || '',
    puppyPageUrl: `https://www.fluffytailshihtzu.com${puppy.slug ? puppyPath(puppy.slug) : '/available-puppies'}`,
    message: `Hi Jeanne, I’d like to know more about ${puppyText}.`,
  })
  return `/puppy-inquiry?${params}`
}
