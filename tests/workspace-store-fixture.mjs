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
    async create(doc){if(documents.has(doc._id))throw conflict();documents.set(doc._id,{...structuredClone(doc),_rev:`fixture-${randomUUID()}`});await save();return structuredClone(documents.get(doc._id))},
    async createIfNotExists(doc){if(!documents.has(doc._id)){documents.set(doc._id,{...structuredClone(doc),_rev:`fixture-${randomUUID()}`});await save()}return structuredClone(documents.get(doc._id))},
    transaction(){
      const pending=[],patches=[],creates=[]
      const tx={create(doc){creates.push(doc);return tx},createIfNotExists(doc){pending.push(doc);return tx},patch(id,input){
        let expected;const sets={}
        const builder={ifRevisionId(value){expected=value;return builder},set(values){Object.assign(sets,structuredClone(values));return builder}}
        if(typeof input==='function')input(builder);else builder.set(input.set||{})
        patches.push({id,expected,sets});return tx
      },async commit(){
        if(beforePatch&&patches.length){const fn=beforePatch;beforePatch=null;await fn(documents,patches[0].id)}
        if(nextFailure){const error=nextFailure;nextFailure=null;throw error}
        const next=new Map([...documents].map(([key,value])=>[key,structuredClone(value)]))
        for(const d of creates){if(next.has(d._id))throw conflict();next.set(d._id,{...structuredClone(d),_rev:`fixture-${randomUUID()}`})}
        for(const d of pending)if(!next.has(d._id))next.set(d._id,{...structuredClone(d),_rev:`fixture-${randomUUID()}`})
        for(const {id,expected,sets} of patches){
          const record=next.get(id);if(!record||expected!==undefined&&record._rev!==expected)throw conflict()
          for(const [key,value]of Object.entries(sets)){const segments=key.split('.');let cursor=record;for(const segment of segments.slice(0,-1))cursor=cursor[segment];cursor[segments.at(-1)]=structuredClone(value)}
          record._rev=`fixture-${randomUUID()}`
        }
        for(const doc of pending)if(!documents.has(doc._id))documents.set(doc._id,next.get(doc._id))
        for(const doc of creates)documents.set(doc._id,next.get(doc._id))
        for(const {id}of patches)documents.set(id,next.get(id))
        await save()
      }}
      return tx
    },
    patch(id){
      let expected
      const sets={};const appends={};const unsets=[]
      const patch={
        ifRevisionId(rev){expected=rev;return patch},
        unset(fields){unsets.push(...fields);return patch},
        set(values){Object.assign(sets,structuredClone(values));return patch},
        append(field,values){appends[field]=structuredClone(values);return patch},
        async commit(){
          if(beforePatch){const fn=beforePatch;beforePatch=null;await fn(documents,id)}
          if(nextFailure){const error=nextFailure;nextFailure=null;throw error}
          const existing=documents.get(id)
          if(!existing||(expected!==undefined&&existing._rev!==expected))throw conflict()
          const updated=structuredClone(existing)
          for(const [key,value]of Object.entries(sets)){
            const segments=key.split('.');let cursor=updated
            for(const part of segments.slice(0,-1))cursor=cursor[part]
            cursor[segments.at(-1)]=value
          }
          for(const [key,values]of Object.entries(appends))updated[key]=[...updated[key],...values]
          for(const field of unsets)delete updated[field]
          updated._rev=`fixture-${randomUUID()}`;documents.set(id,updated)
          await save()
          return structuredClone(updated)
        },
      }
      return patch
    },
  }
}
