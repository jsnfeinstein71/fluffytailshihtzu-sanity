import {defineField, defineType} from 'sanity'

export const litterType = defineType({
  name: 'litter',
  title: 'Litters',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Litter Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'birthDate',
      title: 'Birth Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Current', value: 'current'},
          {title: 'Upcoming', value: 'upcoming'},
          {title: 'Past', value: 'past'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'girlsCount',
      title: 'Girls Count',
      type: 'number',
    }),
    defineField({
      name: 'boysCount',
      title: 'Boys Count',
      type: 'number',
    }),
    defineField({
      name: 'groupPhoto',
      title: 'Group Photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'featured',
      title: 'Featured on Homepage',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'groupPhoto',
      subtitle: 'birthDate',
    },
  },
})
