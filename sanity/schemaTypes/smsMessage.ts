// sanity/schemaTypes/smsMessage.ts
import {defineField, defineType} from 'sanity'

export const smsMessageType = defineType({
  name: 'smsMessage',
  title: 'SMS Message',
  type: 'document',
  fields: [
    defineField({name: 'messageSid', title: 'Message SID', type: 'string'}),
    defineField({name: 'from', title: 'From', type: 'string'}),
    defineField({name: 'to', title: 'To', type: 'string'}),
    defineField({name: 'body', title: 'Body', type: 'text', rows: 4}),
    defineField({name: 'direction', title: 'Direction', type: 'string'}),
    defineField({name: 'source', title: 'Source', type: 'string'}),
    defineField({name: 'receivedAt', title: 'Received At', type: 'datetime'}),
  ],
})
