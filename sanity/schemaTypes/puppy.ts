import {defineField, defineType} from 'sanity'

export const puppyType = defineType({
  name: 'puppy',
  title: 'Puppies',
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
      options: {
        source: 'name',
        maxLength: 96,
      },
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
      name: 'sex',
      title: 'Sex',
      type: 'string',
      options: {
        list: [
          {title: 'Female', value: 'female'},
          {title: 'Male', value: 'male'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Available', value: 'available'},
          {title: 'Hold', value: 'hold'},
          {title: 'Reserved', value: 'reserved'},
          {title: 'Gone Home', value: 'gone-home'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Main Photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'status',
      media: 'photo',
    },
  },
})
