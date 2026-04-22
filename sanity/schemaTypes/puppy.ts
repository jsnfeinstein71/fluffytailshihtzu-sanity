import {defineField, defineType} from 'sanity'

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
        list: [
          {title: 'Available', value: 'available'},
          {title: 'Reserved', value: 'reserved'},
          {title: 'Sold', value: 'sold'},
          {title: 'Holdback', value: 'holdback'},
        ],
      },
      initialValue: 'available',
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
      title: 'Notes',
      type: 'text',
      rows: 4,
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
