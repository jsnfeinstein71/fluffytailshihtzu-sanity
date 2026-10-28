import 'server-only'

// A narrow, non-secret mirror of three explicitly approved, unpublished CMS
// drafts. Prepared from Sanity by the release script, never from browser input.
// Production always reads published CMS fields. No CMS credential or alternate
// inventory/payment source is introduced into this public copy-review Preview.
export const editorialIds={settings:'2cbf546c-550a-4cd0-8fb5-b7719f1c0c9c',puppy:'6e181ad7-3340-4b2f-ba61-91fbd9155ca0',litter:'4f2729d8-568c-4bb6-8db9-7679ca057183'}
type Draft={_id:string;_rev:string;homepageHeadline?:string;homepageIntro?:string;serviceArea?:string|null;name?:string;summary?:string}
export function editorialDrafts():Draft[]{
  if(process.env.VERCEL_ENV!=='preview'||process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!=='3glz6dkx'||process.env.NEXT_PUBLIC_SANITY_DATASET!=='production'||!process.env.FLUFFYTAIL_COPY_REVIEW_CONTENT)return []
  const entries:Draft[]=JSON.parse(process.env.FLUFFYTAIL_COPY_REVIEW_CONTENT)
  if(!Array.isArray(entries)||entries.length!==3||Object.values(editorialIds).some(id=>entries.filter(d=>d._id==='drafts.'+id&&typeof d._rev==='string').length!==1))throw new Error('The approved editorial draft snapshot is incomplete.')
  return entries
}
export function editorialSettings<T extends {homepageHeadline?:string;homepageIntro?:string;serviceArea?:string|null}>(published:T|null):T|null{
  const draft=editorialDrafts().find(d=>d._id==='drafts.'+editorialIds.settings)
  return draft?{...published,homepageHeadline:draft.homepageHeadline,homepageIntro:draft.homepageIntro,serviceArea:draft.serviceArea} as T:published
}
export function editorialPuppy<T extends {_id:string;name?:string|null}>(published:T):T{
  const draft=published._id===editorialIds.puppy?editorialDrafts().find(d=>d._id==='drafts.'+editorialIds.puppy):null
  return draft?{...published,name:draft.name}:published
}
export function editorialLitter<T extends {_id:string;summary?:string|null}>(published:T):T{
  const draft=published._id===editorialIds.litter?editorialDrafts().find(d=>d._id==='drafts.'+editorialIds.litter):null
  return draft?{...published,summary:draft.summary}:published
}
