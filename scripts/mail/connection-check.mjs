// Local diagnostic only. Never imported by the website or its synthetic Preview.
export const account='jeanne@fluffytailshihtzu.com'
export const servers=Object.freeze({smtp:'smtp.pairpromail.com',smtpPort:465,imap:'imap.pairpromail.com',imapPort:993})

export function requireLocalMailboxAccess(env=process.env,platform=process.platform){
  if(platform!=='win32'||env.VERCEL||env.VERCEL_ENV||env.FLUFFYTAIL_WORKSPACE_FIXTURE_SERVER)throw new Error('Live mailbox checks are local Windows tools, separate from all website/Preview environments.')
}
export function validateProfile(profile){
  if(!profile||profile.version!==1||profile.account!==account||profile.provider!=='PairProMail'||profile.purpose!=='connection-check'||typeof profile.protectedPassword!=='string'||profile.protectedPassword.length<20)throw new Error('The saved mailbox connection is missing or invalid. Use the secure local setup window.')
  return profile
}
function failure(code){
  if(code==='EAUTH'||code==='AUTHENTICATIONFAILED')return 'Mailbox sign-in was rejected. Check the saved mailbox password before another attempt.'
  if(['ETIMEDOUT','ETIMEOUT','ECONNECTION','ECONNREFUSED','EDNS','ENOTFOUND'].includes(code))return 'The secure mail server could not be reached. No message was sent; check the connection before retrying.'
  return 'The secure connection check failed. No message was sent. Review the connection settings before retrying.'
}

export async function checkConnection(password,{smtpFactory,imapFactory}){
  if(typeof password!=='string'||!password)throw new Error('A mailbox password is required through the secure local setup window.')
  const report={account,checkedAt:new Date().toISOString(),smtp:{status:'not checked'},imap:{status:'not checked'},messagesSent:0,messageBodiesRead:0,mailboxChanges:0,emailDelivery:'not tested'}
  let smtp,imap
  try{
    smtp=smtpFactory({host:servers.smtp,port:servers.smtpPort,secure:true,requireTLS:true,ignoreTLS:false,opportunisticTLS:false,auth:{user:account,pass:password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true,servername:servers.smtp},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:5000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,name:'fluffytailshihtzu.com'})
    await smtp.verify()
    report.smtp={status:'secure sign-in verified'}
  }catch(error){
    report.smtp={status:'failed',detail:failure(error?.code)}
    report.imap={status:'not attempted after SMTP failure'}
    return report
  }finally{try{smtp?.close()}catch{/* Do not expose raw provider errors. */}}
  try{
    imap=imapFactory({host:servers.imap,port:servers.imapPort,secure:true,auth:{user:account,pass:password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true,servername:servers.imap},logger:false,logRaw:false,disableAutoIdle:true,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000})
    imap.on('error',()=>{})
    await imap.connect()
    const inbox=await imap.mailboxOpen('INBOX',{readOnly:true})
    if(inbox.readOnly!==true)throw new Error('Read-only mode was not confirmed.')
    report.imap={status:'secure sign-in and read-only Inbox verified'}
    await imap.logout()
  }catch(error){report.imap={status:'failed',detail:failure(error?.code)}}
  finally{try{imap?.close()}catch{/* Closing a diagnostic socket must not expose provider data. */}}
  return report
}
