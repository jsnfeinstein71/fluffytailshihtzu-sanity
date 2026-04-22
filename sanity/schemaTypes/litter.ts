import {defineField, defineType} from 'sanity'

export const litterType = defineType({
  name: 'litter',
  title: 'Litter',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Litter Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'birthDate',
      title: 'Birth Date',
      type: 'date',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first in public litter listings.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Planned', value: 'planned'},
          {title: 'Active', value: 'current'},
          {title: 'Past', value: 'past'},
        ],
        layout: 'radio',
      },
      initialValue: 'current',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'girlsCount',
      title: 'Girls Count',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'boysCount',
      title: 'Boys Count',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'price',
      title: 'Litter Price',
      type: 'number',
      description: 'Default price for puppies in this litter unless a puppy has an override price.',
    }),
    defineField({
      name: 'deposit',
      title: 'Deposit',
      type: 'number',
      initialValue: 300,
      description: 'Deposit amount included in the price.',
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'groupPhoto',
      title: 'Group Photo',
      type: 'image',
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'status',
      media: 'heroImage',
    },
    prepare(selection) {
      const subtitleMap: Record<string, string> = {
        planned: 'planned',
        current: 'active',
        past: 'past',
      }

      return {
        title: selection.title,
        subtitle: subtitleMap[selection.subtitle as string] || selection.subtitle,
        media: selection.media,
      }
    },
  },
})
