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
    defineField({name: 'status', title: 'Delivery Status', type: 'string', readOnly: true}),
    defineField({name: 'signatureVerified', title: 'Signature Verified', type: 'boolean', readOnly: true}),
    defineField({name: 'receipt', title: 'Event Claim', type: 'string', readOnly: true, hidden: true}),
    defineField({name: 'receivedAt', title: 'Received At', type: 'datetime'}),
    defineField({name: 'numMedia', title: 'Number of Media Items', type: 'number'}),
    defineField({
      name: 'mediaUrls',
      title: 'Media URLs',
      type: 'array',
      of: [{type: 'url'}],
    }),
  ],
  preview: {
    select: {
      title: 'from',
      subtitle: 'body',
    },
    prepare(selection) {
      return {
        title: selection.title || 'SMS Message',
        subtitle: selection.subtitle || '',
      }
    },
  },
})
