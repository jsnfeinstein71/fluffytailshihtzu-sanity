import {defineField, defineType} from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Site Title',
      type: 'string',
    }),
    defineField({
      name: 'homepageHeadline',
      title: 'Homepage Headline',
      type: 'string',
    }),
    defineField({
      name: 'homepageIntro',
      title: 'Homepage Intro',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'goodDogUrl',
      title: 'GoodDog URL',
      type: 'url',
    }),
    defineField({
      name: 'waitlistUrl',
      title: 'Waitlist URL',
      type: 'url',
    }),
    defineField({
      name: 'serviceArea',
      title: 'Service Area Text',
      type: 'string',
    }),
  ],
})
