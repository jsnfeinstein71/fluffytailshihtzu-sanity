'use client'

import {useLayoutEffect,useRef,type TextareaHTMLAttributes} from 'react'

export default function AutoGrowMessage(props:TextareaHTMLAttributes<HTMLTextAreaElement>){
  const input=useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(()=>{
    const node=input.current
    if(!node)return
    const grow=()=>{
      const style=getComputedStyle(node)
      const limit=parseFloat(style.maxHeight)||180
      node.style.height='auto'
      node.style.height=`${Math.min(limit,Math.max(parseFloat(style.minHeight)||48,node.scrollHeight+2))}px`
    }
    grow()
    let width=node.clientWidth
    const observer=new ResizeObserver(()=>{if(node.clientWidth!==width){width=node.clientWidth;grow()}})
    observer.observe(node)
    window.addEventListener('resize',grow)
    window.visualViewport?.addEventListener('resize',grow)
    return()=>{observer.disconnect();window.removeEventListener('resize',grow);window.visualViewport?.removeEventListener('resize',grow)}
  },[props.value])
  return <textarea {...props} ref={input} className={`ops-message-input ${props.className||''}`}/>
}
