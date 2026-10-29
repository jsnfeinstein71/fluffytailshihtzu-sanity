import {liveWorkspaceEnabled,syntheticWorkspaceEnabled} from './workspace-mode'
export const pickLabels=['1st pick','2nd pick','3rd pick','4th pick'] as const
export const litterDepositTerms='Deposits are non-refundable, transferable to a future litter when a suitable puppy is unavailable, and credited toward the selected puppy’s price.'
// Separate release switches prevent a Preview flag from activating real offers.
export function litterReservationMode():'test'|'live'|null{
 if(process.env.FLUFFYTAIL_LITTER_RESERVATIONS_ENABLED==='1')return syntheticWorkspaceEnabled()?'test':null
 return process.env.FLUFFYTAIL_LITTER_RESERVATIONS_LIVE_ENABLED==='1'&&liveWorkspaceEnabled()?'live':null
}
export function litterReservationsEnabled(){return litterReservationMode()!==null}
export type LitterReservation={_id:string;_rev:string;_type:'litterReservation';workspace:'review-v1'|'live-v1';familyId:string;litterId:string;litterTitle:string;position:number;state:'pending'|'reserved'|'released'|'reconciliation';preferences:string;requestId:string;paymentRequestId:string;depositCents:number;totalCents:number;ledgerId?:string;puppyId?:string;history:{_key:string;action:string;at:string;fromLitter?:string;fromLitterTitle?:string;fromPosition?:number;toLitter?:string;toLitterTitle?:string;depositCreditCents?:number;toPosition?:number;puppyId?:string;note?:string}[]}
export type LitterBoard={_id:string;_rev:string;_type:'litterPlaces';workspace:'review-v1'|'live-v1';litterId:string;places:{_key:string;position:number;reservationId:string;state:'pending'|'reserved'}[]}
