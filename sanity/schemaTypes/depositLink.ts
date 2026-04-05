import {defineField, defineType} from 'sanity'

export const depositLinkType = defineType({
  name: 'depositLink',
  title: 'Deposit Link',
  type: 'document',
  fields: [
    defineField({name: 'createdAt', title: 'Created At', type: 'datetime'}),
    defineField({name: 'token', title: 'Token', type: 'string'}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
    defineField({name: 'puppySlug', title: 'Puppy Slug', type: 'string'}),
    defineField({name: 'puppyName', title: 'Puppy Name', type: 'string'}),
    defineField({name: 'customerName', title: 'Customer Name', type: 'string'}),
    defineField({name: 'customerEmail', title: 'Customer Email', type: 'string'}),
    defineField({name: 'customerPhone', title: 'Customer Phone', type: 'string'}),
    defineField({name: 'stripeCheckoutUrl', title: 'Stripe Checkout URL', type: 'url'}),
  ],
})
