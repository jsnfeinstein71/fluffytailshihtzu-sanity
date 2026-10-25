import {defineField, defineType} from 'sanity'
import {litterStatusOptions} from '../../lib/inventory'

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
      title: 'Actual Birth Date',
      type: 'date',
      description: 'Enter after the puppies are born. Upcoming litters use Expected Birth Date.',
    }),
    defineField({
      name: 'expectedBirthDate',
      title: 'Expected Birth Date',
      type: 'date',
    }),
    defineField({
      name: 'expectedAvailability',
      title: 'Expected Puppy Availability',
      type: 'text',
      rows: 2,
      description: 'Optional timing or availability notes for families planning ahead.',
    }),
    defineField({
      name: 'sire',
      title: 'Sire',
      type: 'reference',
      to: [{type: 'dog'}],
      options: {filter: 'sex == "male"'},
    }),
    defineField({
      name: 'dam',
      title: 'Dam',
      type: 'reference',
      to: [{type: 'dog'}],
      options: {filter: 'sex == "female"'},
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Optional override: numbered litters appear first, lowest number first. Otherwise oldest date first.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: litterStatusOptions,
        layout: 'radio',
      },
      initialValue: 'current',
      description: 'Upcoming before birth, Active once born, Past when no longer active. Legacy values remain supported.',
    }),
    defineField({
      name: 'isVisible',
      title: 'Show on Website',
      type: 'boolean',
      initialValue: true,
      description: 'Published records are visible unless disabled. Hides this litter and its puppies from public browsing.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'Legacy copy, shown when Summary is empty. Existing content is preserved.',
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
      validation: (Rule) => Rule.positive().precision(2),
    }),
    defineField({
      name: 'deposit',
      title: 'Deposit',
      type: 'number',
      description: 'Set for each litter. Applied toward the total price, not added on top.',
      validation: (Rule) => Rule.positive().precision(2),
    }),
    defineField({
      name: 'heroImage',
      title: 'Litter / Expected Litter Image',
      type: 'image',
      options: {hotspot: true},
      description: 'Used when no Group Photo is set, including for expected litters.',
    }),
    defineField({
      name: 'groupPhoto',
      title: 'Group Photo',
      type: 'image',
      options: {hotspot: true},
      description: 'Preferred public litter image. Falls back to the litter image, then parent photos.',
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
        upcoming: 'upcoming',
        current: 'active',
        active: 'active',
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
