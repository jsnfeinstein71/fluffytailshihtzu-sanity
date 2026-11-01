// Owner-supplied photographs with approved transparent backgrounds.
// Exact URLs limit the cutout treatment to these exports, so future litter
// photographs retain the normal presentation without a schema change.
export const parentPortraits = [
  {name: 'Penny', src: 'https://cdn.sanity.io/images/3glz6dkx/production/582ae350e741bb16e0fe4e7da0e4b9c5c2b8f7db-1254x1254.png'},
  {name: 'Elsie', src: 'https://cdn.sanity.io/images/3glz6dkx/production/cc3e99a4280465fd00c4a82550d88786196d7615-1254x1254.png'},
  {name: 'Rocco', src: 'https://cdn.sanity.io/images/3glz6dkx/production/c7bd39f1ee6d91acbddc963e5d3695f0f7093495-1254x1254.png'},
] as const

export function getParentPortrait(source?: string | null) {
  return parentPortraits.find(portrait => portrait.src === source)
}
