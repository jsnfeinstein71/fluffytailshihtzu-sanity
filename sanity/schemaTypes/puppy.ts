import {defineField, defineType} from 'sanity'
import {puppyStatusOptions} from '../../lib/inventory'

export const puppyType = defineType({
  name: 'puppy',
  title: 'Puppy',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Puppy Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'litter',
      title: 'Litter',
      type: 'reference',
      to: [{type: 'litter'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first in public puppy listings.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: puppyStatusOptions,
      },
      initialValue: 'available',
      description: 'All statuses stay in the original litter. Only Available puppies in active litters accept new inquiries.',
    }),
    defineField({
      name: 'isVisible',
      title: 'Show on Website',
      type: 'boolean',
      initialValue: true,
      description: 'Published puppies remain visible unless disabled. The parent litter must also be published and visible.',
    }),
    defineField({
      name: 'sex',
      title: 'Sex',
      type: 'string',
      options: {
        list: [
          {title: 'Male', value: 'male'},
          {title: 'Female', value: 'female'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'notes',
      title: 'Public Notes',
      type: 'text',
      rows: 4,
      description: 'Displayed on the puppy page. Falls back to Summary when empty.',
    }),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [{type: 'image'}],
    }),
    defineField({
      name: 'overridePrice',
      title: 'Override Price',
      type: 'number',
      description: 'Optional. If set, this price overrides the litter price for this puppy.',
      validation: (Rule) => Rule.positive().precision(2),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'status',
      media: 'mainImage',
    },
  },
})
