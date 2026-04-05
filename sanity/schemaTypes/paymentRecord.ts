import {defineField, defineType} from 'sanity'

export const paymentRecordType = defineType({
  name: 'paymentRecord',
  title: 'Payment Record',
  type: 'document',
  fields: [
    defineField({name: 'createdAt', title: 'Created At', type: 'datetime'}),
    defineField({name: 'stripeCheckoutSessionId', title: 'Stripe Checkout Session ID', type: 'string'}),
    defineField({name: 'stripePaymentIntentId', title: 'Stripe Payment Intent ID', type: 'string'}),
    defineField({name: 'paymentType', title: 'Payment Type', type: 'string'}),
    defineField({name: 'amountPaid', title: 'Amount Paid', type: 'number'}),
    defineField({name: 'paymentStatus', title: 'Payment Status', type: 'string'}),
    defineField({name: 'puppySlug', title: 'Puppy Slug', type: 'string'}),
    defineField({name: 'puppyName', title: 'Puppy Name', type: 'string'}),
    defineField({name: 'litterTitle', title: 'Litter Title', type: 'string'}),
    defineField({name: 'customerName', title: 'Customer Name', type: 'string'}),
    defineField({name: 'customerEmail', title: 'Customer Email', type: 'string'}),
    defineField({name: 'customerPhone', title: 'Customer Phone', type: 'string'}),
  ],
})
