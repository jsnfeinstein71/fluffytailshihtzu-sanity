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
      name: 'sire',
      title: 'Sire',
      type: 'reference',
      to: [{type: 'dog'}],
      options: {
        filter: 'sex == $sex',
        filterParams: {sex: 'male'},
      },
    }),
    defineField({
      name: 'dam',
      title: 'Dam',
      type: 'reference',
      to: [{type: 'dog'}],
      options: {
        filter: 'sex == $sex',
        filterParams: {sex: 'female'},
      },
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
          {title: 'Active', value: 'active'},
          {title: 'Upcoming', value: 'upcoming'},
          {title: 'Past', value: 'past'},
        ],
        layout: 'dropdown',
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
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first. Leave blank to fall back to birth date order.',
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

