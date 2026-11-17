export type PaymentRefreshState = {state:string;confirmation?:string}|null
export function paymentRefreshFinished(receipt:PaymentRefreshState){
 return !!receipt&&(['expired','failed','unavailable'].includes(receipt.state)||receipt.state==='confirmed'&&receipt.confirmation!=='pending')
}

type RefreshEnvironment={now:()=>number;visible:()=>boolean;setTimer:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;clearTimer:(timer:ReturnType<typeof setTimeout>)=>void;listen:(fn:()=>void)=>()=>void}
// The receipt remains server-verified. This only limits read traffic from an open page.
export function startPaymentRefresh(task:()=>Promise<boolean>,options:{immediate?:boolean;environment?:RefreshEnvironment}={}){
 const env=options.environment||{now:Date.now,visible:()=>document.visibilityState==='visible',setTimer:(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimer:timer=>globalThis.clearTimeout(timer),listen:(fn)=>{document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn)}} satisfies RefreshEnvironment
 const deadline=env.now()+300000
 let stopped=false,busy=false,timer:ReturnType<typeof setTimeout>|undefined
 function schedule(ms=5000){if(!stopped&&env.now()<deadline)timer=env.setTimer(()=>void tick(),ms)}
 async function tick(){
  timer=undefined
  if(stopped||busy||env.now()>=deadline)return
  if(!env.visible()){schedule();return}
  busy=true
  try{if(!await task())stopped=true}finally{busy=false;schedule()}
 }
 const unlisten=env.listen(()=>{if(!env.visible()||stopped||busy||env.now()>=deadline)return;if(timer!==undefined)env.clearTimer(timer);schedule(0)})
 schedule(options.immediate?0:3000)
 return()=>{stopped=true;if(timer!==undefined)env.clearTimer(timer);unlisten()}
}
