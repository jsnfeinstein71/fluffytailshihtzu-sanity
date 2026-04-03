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
      name: 'heroImage',
      title: 'Homepage Hero Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'heroThumb1',
      title: 'Homepage Hero Thumb 1',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'heroThumb2',
      title: 'Homepage Hero Thumb 2',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'heroThumb3',
      title: 'Homepage Hero Thumb 3',
      type: 'image',
      options: {hotspot: true},
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
      description: 'General future-interest waitlist form URL.',
    }),
    defineField({
      name: 'puppyInquiryUrl',
      title: 'Puppy Inquiry Form URL',
      type: 'url',
      description:
        'Dedicated puppy inquiry form URL. This should be a separate Tally form from the general waitlist.',
    }),
    defineField({
      name: 'serviceArea',
      title: 'Service Area Text',
      type: 'string',
    }),
  ],
})
