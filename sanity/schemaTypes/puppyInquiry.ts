import {defineField, defineType} from 'sanity'

export const puppyInquiryType = defineType({
  name: 'puppyInquiry',
  title: 'Puppy Inquiry',
  type: 'document',
  fields: [
    defineField({name: 'submittedAt', title: 'Submitted At', type: 'datetime'}),
    defineField({name: 'name', title: 'Name', type: 'string'}),
    defineField({name: 'phone', title: 'Phone', type: 'string'}),
    defineField({name: 'email', title: 'Email', type: 'string'}),
    defineField({
      name: 'preferredContactMethod',
      title: 'Preferred Contact Method',
      type: 'string',
    }),
    defineField({name: 'message', title: 'Message', type: 'text', rows: 5}),
    defineField({name: 'puppy', title: 'Puppy', type: 'string'}),
    defineField({name: 'litter', title: 'Litter', type: 'string'}),
    defineField({name: 'puppyPageUrl', title: 'Puppy Page URL', type: 'url'}),
    defineField({name: 'smsConsent', title: 'SMS Consent', type: 'boolean'}),
    defineField({name: 'consentAt', title: 'SMS Consent At', type: 'datetime', readOnly: true}),
    defineField({name: 'consentVersion', title: 'Consent Version', type: 'string', readOnly: true}),
    defineField({name: 'interest', title: 'Interest', type: 'string', readOnly: true}),
    defineField({name: 'puppyId', title: 'Puppy ID', type: 'string', readOnly: true}),
    defineField({name: 'litterId', title: 'Litter ID', type: 'string', readOnly: true}),
    defineField({name: 'notificationStatus', title: 'Operator Notification Status', type: 'string', readOnly: true}),
    defineField({name: 'receipt', title: 'Submission Claim', type: 'string', readOnly: true, hidden: true}),
    defineField({name: 'source', title: 'Source', type: 'string'}),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'message',
    },
    prepare(selection) {
      return {
        title: selection.title || 'Puppy Inquiry',
        subtitle: selection.subtitle || '',
      }
    },
  },
})
