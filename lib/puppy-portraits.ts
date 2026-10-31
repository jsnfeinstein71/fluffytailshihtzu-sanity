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
  // Penny's approved transparent exports are also the CMS main images.
  // Keep the exact-source guard so later photographs use their own presentation.
  '98cce32b-4bbc-4d7a-a934-f8a74128b167': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/c27a1020b482919d99c0041e1003d346f8262868-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/c27a1020b482919d99c0041e1003d346f8262868-1254x1254.png',
  },
  'b6f038ba-f581-4373-9451-0e3b7f41d46e': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/573e48baf9d144e2b39fb43ccec95396d9cab604-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/573e48baf9d144e2b39fb43ccec95396d9cab604-1254x1254.png',
  },
  '293b3662-1b69-4f9c-bf0c-26131fe942ad': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/ea309af20e7d513689e95e6e7ea4bf511f8c60f6-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/ea309af20e7d513689e95e6e7ea4bf511f8c60f6-1254x1254.png',
  },
  'd77aee5f-0007-459a-b265-14a7de70a0e4': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/7b91b77629b3355b3d2faf0073e0f4cb31b8bdb2-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/7b91b77629b3355b3d2faf0073e0f4cb31b8bdb2-1254x1254.png',
  },
  '34407f50-212d-476c-b667-8ab11b4c3b5d': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/0997327a9071e688f59c2b526302e61c38afd008-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/0997327a9071e688f59c2b526302e61c38afd008-1254x1254.png',
  },
  '21e0b642-9e85-4197-937c-5cd9ef373dde': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/6616ac669198d2c4947e2591532f9552214d1910-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/6616ac669198d2c4947e2591532f9552214d1910-1254x1254.png',
  },
  'e7397ed4-e064-480e-926c-6d159e40acbd': {
    sourcePhotoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/ee911f5d9151ec8fadcb1dffde1545b8c2dc0cf1-1254x1254.png',
    src: 'https://cdn.sanity.io/images/3glz6dkx/production/ee911f5d9151ec8fadcb1dffde1545b8c2dc0cf1-1254x1254.png',
  },
}

export function getPuppyProfilePortrait(puppy: Pick<Puppy, '_id' | 'photoUrl'>) {
  const portrait = portraits[puppy._id]
  return portrait && portrait.sourcePhotoUrl === puppy.photoUrl ? portrait.src : null
}
