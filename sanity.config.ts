'use client'

/**
 * This configuration is used for the Sanity Studio mounted on the /app/studio/[[...tool]]/page.tsx route
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {apiVersion, dataset, projectId} from './sanity/env'
import {schemaTypes} from './sanity/schemaTypes'
import {structure} from './sanity/structure'

const operationalTypes = ['puppyInquiry', 'smsMessage', 'paymentRecord', 'depositLink', 'invoiceRecord', 'inquiryRate']

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    templates: templates => templates.filter(template => !operationalTypes.includes(template.schemaType)),
  },
  document: {
    actions: (actions, context) => operationalTypes.includes(context.schemaType)
      ? actions.filter(action => action.action !== 'duplicate' &&
        (action.action !== 'publish' || (context.documentId || '').replace(/^drafts\./, '').startsWith('private.')))
      : actions,
  },
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: apiVersion}),
  ],
})

