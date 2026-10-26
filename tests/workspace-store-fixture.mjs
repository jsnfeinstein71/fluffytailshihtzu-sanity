import {parse,evaluate} from 'groq-js'
import {randomUUID} from 'node:crypto'

// A revision-aware local Sanity substitute, used only by offline tests/browser QA.
export function workspaceStoreFixture(initial=[],persist=async()=>{}) {
  const documents = new Map(initial.map(d=>[d._id,structuredClone(d)]))
  let nextFailure=null
  let beforePatch=null
  const conflict=()=>Object.assign(new Error('Revision conflict'),{statusCode:409})
  const save=async()=>persist([...documents.values()])
  return {
    documents,
    failNext(error){nextFailure=error},
    beforeNextPatch(fn){beforePatch=fn},
    async fetch(query,params){return (await evaluate(parse(query),{dataset:[...documents.values()],params})).get()},
    async getDocument(id){return structuredClone(documents.get(id))},
    transaction(){
      const pending=[]
      const tx={createIfNotExists(doc){pending.push(doc);return tx},async commit(){
        for(const d of pending)if(!documents.has(d._id))documents.set(d._id,{...structuredClone(d),_rev:`fixture-${randomUUID()}`})
        await save()
      }}
      return tx
    },
    patch(id){
      let expected
      const sets={};const appends={}
      const patch={
        ifRevisionId(rev){expected=rev;return patch},
        set(values){Object.assign(sets,structuredClone(values));return patch},
        append(field,values){appends[field]=structuredClone(values);return patch},
        async commit(){
          if(beforePatch){const fn=beforePatch;beforePatch=null;await fn(documents,id)}
          if(nextFailure){const error=nextFailure;nextFailure=null;throw error}
          const existing=documents.get(id)
          if(!existing||existing._rev!==expected)throw conflict()
          const updated=structuredClone(existing)
          for(const [key,value]of Object.entries(sets)){
            const segments=key.split('.');let cursor=updated
            for(const part of segments.slice(0,-1))cursor=cursor[part]
            cursor[segments.at(-1)]=value
          }
          for(const [key,values]of Object.entries(appends))updated[key]=[...updated[key],...values]
          updated._rev=`fixture-${randomUUID()}`;documents.set(id,updated)
          await save()
          return structuredClone(updated)
        },
      }
      return patch
    },
  }
}
