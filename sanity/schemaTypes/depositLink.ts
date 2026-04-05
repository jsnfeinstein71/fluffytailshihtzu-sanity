import {defineField, defineType} from 'sanity'

export const depositLinkType = defineType({
  name: 'depositLink',
  title: 'Deposit Link',
  type: 'document',
  fields: [
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
    }),
    defineField({
      name: 'token',
      title: 'Token',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'puppySlug',
      title: 'Puppy Slug',
      type: 'string',
    }),
    defineField({
      name: 'puppyName',
      title: 'Puppy Name',
      type: 'string',
    }),
    defineField({
      name: 'litterTitle',
      title: 'Litter Title',
      type: 'string',
    }),
    defineField({
      name: 'customerName',
      title: 'Customer Name',
      type: 'string',
    }),
    defineField({
      name: 'customerEmail',
      title: 'Customer Email',
      type: 'string',
    }),
    defineField({
      name: 'customerPhone',
      title: 'Customer Phone',
      type: 'string',
    }),
    defineField({
      name: 'stripeCheckoutUrl',
      title: 'Stripe Checkout URL',
      type: 'url',
    }),
    defineField({
      name: 'stripeCheckoutSessionId',
      title: 'Stripe Checkout Session ID',
      type: 'string',
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'puppyName',
      subtitle: 'customerName',
    },
    prepare({title, subtitle}) {
      return {
        title: title || 'Deposit Link',
        subtitle: subtitle || '',
      }
    },
  },
})
