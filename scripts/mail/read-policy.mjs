import {MailboxError} from './inbox-reader.mjs'

export function gateMailboxReads(reader,enabled=false){
  const run=(method,key)=>{
    if(enabled!==true)throw new MailboxError('Reading existing mailbox messages is paused. Continue with saved drafts and fictional reply tests until the owner approves mailbox access.',403)
    return reader[method](key)
  }
  return {list:()=>run('list'),message:key=>run('message',key),envelope:key=>run('envelope',key)}
}
