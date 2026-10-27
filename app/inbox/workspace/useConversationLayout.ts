'use client'

import {useCallback,useLayoutEffect,useRef,useState} from 'react'

type ReadingPosition={top:number;follow:boolean;anchor:string;offset:number;ids:Set<string>;unseen:number}
export function useConversationLayout(active:boolean,familyId:string,eventIdsJson:string,signature:string,panel:string){
  const shell=useRef<HTMLDivElement>(null)
  const timeline=useRef<HTMLDivElement>(null)
  const positions=useRef(new Map<string,ReadingPosition>())
  const [unseen,setUnseen]=useState(0)
  const interactionUntil=useRef(0)
  const capture=useCallback((force=false)=>{
    if(!force&&Date.now()>interactionUntil.current)return
    const node=timeline.current,position=positions.current.get(familyId)
    if(!node||!position||!node.clientHeight)return
    const top=node.getBoundingClientRect().top
    const anchor=Array.from(node.querySelectorAll<HTMLElement>('[data-message-id]')).find(message=>message.getBoundingClientRect().bottom>top)
    position.top=node.scrollTop
    position.follow=node.scrollHeight-node.scrollTop-node.clientHeight<=32
    position.anchor=anchor?.dataset.messageId||''
    position.offset=anchor?anchor.getBoundingClientRect().top-top:0
    if(position.follow&&position.unseen){position.unseen=0;setUnseen(0)}
  },[familyId])
  useLayoutEffect(()=>{
    if(!active)return
    const root=shell.current
    if(!root)return
    const bodyOverflow=document.body.style.overflow,htmlOverflow=document.documentElement.style.overflow
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden'
    const viewport=()=>{
      interactionUntil.current=0
      const height=window.visualViewport?.height||window.innerHeight
      root.classList.toggle('ops-compact-viewport',height<540)
      root.style.setProperty('--ops-input-limit',`${height<540?72:Math.min(180,height*.22)}px`)
      root.style.setProperty('--ops-viewport-height',`${height}px`)
      root.style.setProperty('--ops-viewport-top',`${window.visualViewport?.offsetTop||0}px`)
    }
    viewport()
    window.addEventListener('resize',viewport)
    window.visualViewport?.addEventListener('resize',viewport)
    window.visualViewport?.addEventListener('scroll',viewport)
    return()=>{
      document.body.style.overflow=bodyOverflow;document.documentElement.style.overflow=htmlOverflow
      window.removeEventListener('resize',viewport);window.visualViewport?.removeEventListener('resize',viewport);window.visualViewport?.removeEventListener('scroll',viewport)
      root.classList.remove('ops-compact-viewport');root.style.removeProperty('--ops-input-limit');root.style.removeProperty('--ops-viewport-height');root.style.removeProperty('--ops-viewport-top')
    }
  },[active])
  useLayoutEffect(()=>{
    const node=timeline.current
    if(!active||!node)return
    const eventIds=JSON.parse(eventIdsJson) as string[]
    let position=positions.current.get(familyId)
    if(!position){position={top:0,follow:true,anchor:'',offset:0,ids:new Set(eventIds),unseen:0};positions.current.set(familyId,position)}
    const added=eventIds.filter(id=>!position.ids.has(id)).length
    position.ids=new Set(eventIds)
    if(!position.follow)position.unseen+=added
    setUnseen(position.unseen)
    const restore=()=>{
      if(!node.clientHeight)return
      if(position.follow){node.scrollTop=node.scrollHeight;position.unseen=0;setUnseen(0)}
      else{
        const anchor=Array.from(node.querySelectorAll<HTMLElement>('[data-message-id]')).find(message=>message.dataset.messageId===position.anchor)
        node.scrollTop=anchor?node.scrollTop+anchor.getBoundingClientRect().top-node.getBoundingClientRect().top-position.offset:position.top
      }
      capture(true)
    }
    restore()
    const observer=new ResizeObserver(restore)
    observer.observe(node)
    if(node.firstElementChild)observer.observe(node.firstElementChild)
    return()=>observer.disconnect()
  },[active,familyId,eventIdsJson,signature,panel,capture])
  const latest=()=>{
    const node=timeline.current,position=positions.current.get(familyId)
    if(!node||!position)return
    position.follow=true;position.unseen=0;node.scrollTop=node.scrollHeight;setUnseen(0);capture(true)
  }
  return {shell,timeline,capture:()=>capture(false),interact:()=>{interactionUntil.current=Date.now()+1500},endInteraction:()=>{interactionUntil.current=0},unseen,latest}
}
