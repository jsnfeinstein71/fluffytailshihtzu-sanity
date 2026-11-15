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
      const operations=[]
      const tx={create(doc){operations.push({kind:'create',doc});return tx},createIfNotExists(doc){operations.push({kind:'ensure',doc});return tx},delete(selection){operations.push({kind:'delete',selection});return tx},patch(id,input){
        let expected;const sets={}
        const builder={ifRevisionId(value){expected=value;return builder},set(values){Object.assign(sets,structuredClone(values));return builder}}
        if(typeof input==='function')input(builder);else builder.set(input.set||{})
        operations.push({kind:'patch',id,expected,sets});return tx
      },async commit(){
        const firstPatch=operations.find(o=>o.kind==='patch')
        if(beforePatch&&firstPatch){const fn=beforePatch;beforePatch=null;await fn(documents,firstPatch.id)}
        if(nextFailure){const error=nextFailure;nextFailure=null;throw error}
        const next=new Map([...documents].map(([key,value])=>[key,structuredClone(value)]))
        for(const op of operations){
          if(op.kind==='create'||op.kind==='ensure'){
            if(next.has(op.doc._id)){if(op.kind==='create')throw conflict();continue}
            const original=documents.get(op.doc._id)
            if(original&&original._type!==op.doc._type)throw Object.assign(new Error('Immutable document type'),{statusCode:400})
            next.set(op.doc._id,{...structuredClone(op.doc),_rev:`fixture-${randomUUID()}`})
          }else if(op.kind==='patch'){
            const record=next.get(op.id);if(!record||op.expected!==undefined&&record._rev!==op.expected)throw conflict()
            for(const [key,value]of Object.entries(op.sets)){const segments=key.split('.');let cursor=record;for(const segment of segments.slice(0,-1))cursor=cursor[segment];cursor[segments.at(-1)]=structuredClone(value)}
            record._rev=`fixture-${randomUUID()}`
          }else{
            const ids=typeof op.selection==='string'?[op.selection]:(await evaluate(parse(op.selection.query),{dataset:[...next.values()],params:op.selection.params})).get()
            for(const id of ids)next.delete(typeof id==='string'?id:id._id)
          }
        }
        for(const id of documents.keys())if(!next.has(id))documents.delete(id)
        for(const [id,doc]of next)if(JSON.stringify(doc)!==JSON.stringify(documents.get(id)))documents.set(id,doc)
        await save()
      }}
      return tx
    },
    patch(id){
      let expected
      const sets={};const appends={};const unsets=[];const increments={}
      const patch={
        ifRevisionId(rev){expected=rev;return patch},
        unset(fields){unsets.push(...fields);return patch},
        set(values){Object.assign(sets,structuredClone(values));return patch},
        inc(values){Object.assign(increments,values);return patch},
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
          for(const [key,value]of Object.entries(increments))updated[key]=(updated[key]||0)+value
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
