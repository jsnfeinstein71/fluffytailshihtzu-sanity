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
    defineField({name: 'message', title: 'Message', type: 'text', rows: 4}),
    defineField({name: 'puppy', title: 'Puppy', type: 'string'}),
    defineField({name: 'litter', title: 'Litter', type: 'string'}),
    defineField({name: 'puppyPageUrl', title: 'Puppy Page URL', type: 'url'}),
    defineField({name: 'source', title: 'Source', type: 'string'}),
  ],
})
