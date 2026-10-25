import {defineField, defineType} from 'sanity'

export const inquiryRateType = defineType({
  name: 'inquiryRate', title: 'Inquiry Rate Limit', type: 'document', readOnly: true,
  fields: [
    defineField({name: 'count', type: 'number'}),
    defineField({name: 'expiresAt', type: 'datetime'}),
  ],
})
