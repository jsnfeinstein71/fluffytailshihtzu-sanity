import type {Puppy} from './inventory'

// Owner-approved Photoshop export. Match both the puppy and its original
// image so a future Sanity photo update automatically replaces this pilot.
const portraits: Record<string, {sourcePhotoUrl: string; src: string}> = {
  '136dcb97-3aaf-41dd-9a5d-b5fe194d629e': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
    src: '/puppies/elsie-girl2-profile-v2.png',
  },
}

export function getPuppyProfilePortrait(puppy: Pick<Puppy, '_id' | 'photoUrl'>) {
  const portrait = portraits[puppy._id]
  return portrait && portrait.sourcePhotoUrl === puppy.photoUrl ? portrait.src : null
}
