import type {Puppy} from './inventory'

// Owner-approved Photoshop exports. Match both the puppy and its original
// image so a future Sanity photo update automatically replaces an older portrait.
const portraits: Record<string, {sourcePhotoUrl: string; src: string}> = {
  '136dcb97-3aaf-41dd-9a5d-b5fe194d629e': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
    src: '/puppies/elsie-girl2-profile-v2.png',
  },
  '54a22bbc-7966-437e-8c0e-0fff6c4d1e8e': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/a8be0cbcda43f32ec769ad6682f067d7b8bb2c93-2048x1778.jpg',
    src: '/puppies/elsie-girl3-profile.png',
  },
  '6e181ad7-3340-4b2f-ba61-91fbd9155ca0': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3cf72827d25286b55a40fd5b570c07a9e4b7db72-2048x1955.jpg',
    src: '/puppies/elsie-girl1-profile.png',
  },
}

export function getPuppyProfilePortrait(puppy: Pick<Puppy, '_id' | 'photoUrl'>) {
  const portrait = portraits[puppy._id]
  return portrait && portrait.sourcePhotoUrl === puppy.photoUrl ? portrait.src : null
}
