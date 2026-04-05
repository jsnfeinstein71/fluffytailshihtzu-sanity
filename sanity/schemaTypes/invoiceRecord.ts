import {defineField, defineType} from 'sanity'

export const invoiceRecordType = defineType({
  name: 'invoiceRecord',
  title: 'Invoice Record',
  type: 'document',
  fields: [
    defineField({name: 'createdAt', title: 'Created At', type: 'datetime'}),
    defineField({name: 'stripeInvoiceId', title: 'Stripe Invoice ID', type: 'string'}),
    defineField({name: 'stripeCustomerId', title: 'Stripe Customer ID', type: 'string'}),
    defineField({name: 'hostedInvoiceUrl', title: 'Hosted Invoice URL', type: 'url'}),
    defineField({name: 'status', title: 'Status', type: 'string'}),
    defineField({name: 'puppySlug', title: 'Puppy Slug', type: 'string'}),
    defineField({name: 'puppyName', title: 'Puppy Name', type: 'string'}),
    defineField({name: 'customerName', title: 'Customer Name', type: 'string'}),
    defineField({name: 'customerEmail', title: 'Customer Email', type: 'string'}),
    defineField({name: 'customerPhone', title: 'Customer Phone', type: 'string'}),
    defineField({name: 'amountDue', title: 'Amount Due', type: 'number'}),
    defineField({name: 'amountPaid', title: 'Amount Paid', type: 'number'}),
    defineField({name: 'amountRemaining', title: 'Amount Remaining', type: 'number'}),
  ],
})
