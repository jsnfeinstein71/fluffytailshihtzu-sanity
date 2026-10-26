import {defineField, defineType} from 'sanity'

export const dogType = defineType({
  name: 'dog',
  title: 'Parent Dog',
  type: 'document',
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'sex', title: 'Sex', type: 'string',
      options: {list: [{title: 'Male (sire)', value: 'male'}, {title: 'Female (dam)', value: 'female'}]},
    }),
    defineField({name: 'mainImage', title: 'Photo', type: 'image', options: {hotspot: true}}),
  ],
  preview: {select: {title: 'name', subtitle: 'sex', media: 'mainImage'}},
})
