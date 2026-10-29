import {syntheticWorkspaceEnabled} from './workspace-mode'
export const pickLabels=['1st pick','2nd pick','3rd pick','4th pick'] as const
export const litterDepositTerms='Deposits are non-refundable, transferable to a future litter when a suitable puppy is unavailable, and credited toward the selected puppy’s price.'
// The first release is explicitly isolated. A later production release must
// review configuration and real offers rather than remove test guards globally.
export function litterReservationsEnabled(){return process.env.FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED==='1'&&syntheticWorkspaceEnabled()}
export type LitterReservation={_id:string;_rev:string;_type:'litterReservation';workspace:'review-v1';familyId:string;litterId:string;litterTitle:string;position:number;state:'pending'|'reserved'|'released'|'reconciliation';preferences:string;requestId:string;paymentRequestId:string;depositCents:number;totalCents:number;ledgerId?:string;puppyId?:string;history:{_key:string;action:string;at:string;fromLitter?:string;fromPosition?:number;toLitter?:string;toPosition?:number;puppyId?:string;note?:string}[]}
export type LitterBoard={_id:string;_rev:string;_type:'litterPlaces';workspace:'review-v1';litterId:string;places:{_key:string;position:number;reservationId:string;state:'pending'|'reserved'}[]}
