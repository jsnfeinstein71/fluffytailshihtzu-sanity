// Only test/review callers opt in. Live polling keeps its existing behavior.
export type PollEnvironment={now:()=>number;visible:()=>boolean;setTimer:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;clearTimer:(timer:ReturnType<typeof setTimeout>)=>void;listen:(event:'visibilitychange'|'pointerdown'|'keydown',fn:()=>void)=>()=>void}
export function startPreviewPolling(task:()=>Promise<boolean|void>,options:{intervalMs?:number;initialDelayMs?:number;maxDurationMs?:number;idleMs?:number;environment?:PollEnvironment}={}){
 const env=options.environment||{now:Date.now,visible:()=>document.visibilityState==='visible',setTimer:setTimeout,clearTimer:clearTimeout,listen:(event,fn)=>{const target=event==='visibilitychange'?document:window;target.addEventListener(event,fn);return()=>target.removeEventListener(event,fn)}} satisfies PollEnvironment
 const started=env.now(),interval=options.intervalMs??60000,idle=options.idleMs??300000
 let stopped=false,busy=false,lastActivity=started,timer:ReturnType<typeof setTimeout>|undefined
 const expired=()=>options.maxDurationMs!==undefined&&env.now()-started>=options.maxDurationMs
 function schedule(ms=interval){if(!stopped&&!expired())timer=env.setTimer(()=>void tick(),ms)}
 async function tick(){if(stopped||busy||expired())return;if(!env.visible()||env.now()-lastActivity>=idle){schedule();return}busy=true;try{if(await task()===false)stopped=true}catch{/* Keep the caller's error feedback; retries remain bounded. */}finally{busy=false;schedule()}}
 function activity(){lastActivity=env.now();if(!busy&&!stopped&&!expired()&&env.visible()){if(timer!==undefined)env.clearTimer(timer);schedule()}}
 function visibility(){if(!env.visible())return;lastActivity=env.now();if(!busy&&!stopped&&!expired()){if(timer!==undefined)env.clearTimer(timer);schedule(0)}}
 const cleanups=[env.listen('pointerdown',activity),env.listen('keydown',activity),env.listen('visibilitychange',visibility)]
 schedule(options.initialDelayMs??0)
 return()=>{stopped=true;if(timer!==undefined)env.clearTimer(timer);cleanups.forEach(cleanup=>cleanup())}
}
export function testPaymentSettled(receipt:{state:string;confirmation?:string}|null){return !!receipt&&(['expired','failed','unavailable'].includes(receipt.state)||receipt.state==='confirmed'&&!['pending'].includes(receipt.confirmation||''))}
