import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {checkConnection,requireLocalMailboxAccess,validateProfile} from './mail/connection-check.mjs'
import {openProtectedPassword} from './mail/windows-credential.mjs'

requireLocalMailboxAccess()
if(!process.argv.includes('--connect'))throw new Error('Use --connect for an explicit, no-send connection check.')
if(!process.env.LOCALAPPDATA)throw new Error('A local Windows user profile is required.')
const directory=join(process.env.LOCALAPPDATA,'FluffyTail','MailConnection')
let profile
try{profile=validateProfile(JSON.parse(await readFile(join(directory,'connection.json'),'utf8')))}catch{throw new Error('Use the secure local mailbox setup window first. Do not paste a password into chat.')}

// Plaintext is confined to this process and its private child-process pipe.
// It is never written to a file, command argument, environment variable or log.
const passwordBytes=await openProtectedPassword(profile.protectedPassword)
let password=passwordBytes.toString('utf8')
try{
  const [{default:nodemailer},{ImapFlow}]=await Promise.all([import('nodemailer'),import('imapflow')])
  const report=await checkConnection(password,{smtpFactory:options=>nodemailer.createTransport(options),imapFactory:options=>new ImapFlow(options)})
  await writeFile(join(directory,'connection-receipt.json'),JSON.stringify(report,null,2),{mode:0o600})
  console.log(JSON.stringify(report))
  if(report.smtp.status!=='secure sign-in verified'||report.imap.status!=='secure sign-in and read-only Inbox verified')process.exitCode=2
}finally{password='';passwordBytes.fill(0);profile=undefined}
