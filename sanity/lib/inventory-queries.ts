// Only public inventory belongs in website queries. Operational records use their existing client.
const published = '!(_id in path("drafts.**")) && !(_id in path("versions.**")) && isVisible != false'
const puppyFilter = `_type == "puppy" && ${published} && litter->_type == "litter" && litter->isVisible != false && !(litter->_id in path("drafts.**")) && !(litter->_id in path("versions.**"))`

const litterFields = `
  _id, title, status, birthDate, expectedBirthDate, expectedAvailability,
  girlsCount, boysCount, price, deposit, pricingStatus, sortOrder,
  "summary": coalesce(summary, description),
  "groupPhotoUrl": coalesce(groupPhoto.asset->url, heroImage.asset->url, dam->mainImage.asset->url, sire->mainImage.asset->url),
  "sire": sire->{name, "photoUrl": mainImage.asset->url},
  "dam": dam->{name, "photoUrl": mainImage.asset->url}
`

const puppyFields = `
  _id, name, status, sex, color, sortOrder, overridePrice,
  "slug": slug.current,
  "notes": coalesce(notes, summary),
  "litterId": litter->_id,
  "litterTitle": litter->title,
  "litterStatus": litter->status,
  "birthDate": select(litter->status in ["current", "active", "past"] => litter->birthDate),
  "litterPrice": litter->price,
  "litterDeposit": litter->deposit,
  "litterPricingStatus": litter->pricingStatus,
  "photoUrl": mainImage.asset->url
`

export const littersQuery = `*[_type == "litter" && ${published}]{${litterFields}}`
export const puppiesQuery = `*[${puppyFilter}]{${puppyFields}}`
export const puppyQuery = `*[${puppyFilter} && slug.current == $slug][0]{${puppyFields}}`
export const puppySitemapQuery = `*[${puppyFilter} && defined(slug.current)]{"slug": slug.current, _updatedAt}`
