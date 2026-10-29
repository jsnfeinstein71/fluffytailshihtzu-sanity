import {NextResponse} from 'next/server'
import {requireOperator} from '@/lib/operator-auth'
import {readRequestText} from '@/lib/request-body'
import {operationalWriteFreeze} from '@/sanity/lib/write-freeze'
import {LitterError,loadLitterReservations,offerLitterPlace,reconcileLitterHold,moveLitterReservation,assignLitterPuppy,editLitterPreferences,prepareLitterCheckout,closeLitterRequest,markTestLitterBorn} from '@/sanity/lib/litter-reservations'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export const maxDuration=60
const headers={'Cache-Control':'private, no-store'}
function failure(e:unknown){return NextResponse.json({error:e instanceof LitterError?e.message:'This litter action could not be confirmed. Your deposit and place are kept; refresh before retrying.'},{status:e instanceof LitterError?e.status:503,headers})}
export async function GET(req:Request){const denied=await requireOperator(req);if(denied)return denied;try{return NextResponse.json(await loadLitterReservations(),{headers})}catch(e){return failure(e)}}
export async function POST(req:Request){
 const denied=await requireOperator(req);if(denied)return denied;const frozen=operationalWriteFreeze();if(frozen)return frozen
 try{
  if(req.headers.get('content-type')?.split(';')[0]!=='application/json')throw new LitterError('Use the reservation controls.',415)
  const data=JSON.parse(await readRequestText(req,6000));let paymentRequest
  if(!data||typeof data!=='object'||Array.isArray(data))throw new LitterError('Choose a reservation action.',400)
  if(['offer','transfer','assign'].includes(data.type)&&data.confirmed!==true)throw new LitterError('Confirm the displayed family and position first.',400)
  switch(data.type){
   case 'offer':paymentRequest=await offerLitterPlace(data);break
   case 'retry-checkout':paymentRequest=await prepareLitterCheckout(data.id);break
   case 'refresh':await reconcileLitterHold(data.id);break
   case 'close':await closeLitterRequest(data.id);break
   case 'transfer':await moveLitterReservation(data);break
   case 'assign':await assignLitterPuppy(data);break
   case 'preferences':await editLitterPreferences(data.id,data.preferences);break
   case 'test-born':await markTestLitterBorn(data.litterId);break
   default:throw new LitterError('Choose an available reservation action.',400)
  }
  return NextResponse.json({...await loadLitterReservations(),...(paymentRequest?{paymentRequest}:{})},{headers})
 }catch(e){return failure(e)}
}
