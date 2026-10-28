export const adminOrigin = 'https://admin.fluffytailshihtzu.com'
export const ownerNames = {jeanne:'Jeanne',jason:'Jason / DjinX'} as const
export type OwnerKey = keyof typeof ownerNames
export function ownerKey(value:unknown):value is OwnerKey {return value==='jeanne'||value==='jason'}
export function safeStaffReturn(value:unknown){return value==='/inbox'||value==='/inbox/security'?value:'/inbox/workspace'}
