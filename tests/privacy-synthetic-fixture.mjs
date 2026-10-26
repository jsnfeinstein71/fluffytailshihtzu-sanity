export function syntheticPrivacyFixture() {
  const common = {_createdAt: '2026-04-01T00:00:00Z', _updatedAt: '2026-04-02T00:00:00Z', _rev: 'fixture-revision'}
  const documents = [
    {...common, _id: 'public-litter', _type: 'litter', title: 'Synthetic Litter', status: 'current', price: 1600, deposit: 400},
    {...common, _id: 'public-puppy', _type: 'puppy', name: 'Synthetic Puppy', slug: {current: 'synthetic-puppy'}, status: 'available', litter: {_type: 'reference', _ref: 'public-litter'}},
  ]
  const customer = {name: 'Synthetic Customer', email: 'synthetic@example.test', phone: '+15555550101'}
  for (let i = 0; i < 5; i++) documents.push({...common, _id: `inquiry-${i}`, _type: 'puppyInquiry', ...customer,
    puppy: 'Synthetic Puppy', litter: 'Synthetic Litter', puppyPageUrl: 'https://www.fluffytailshihtzu.com/puppies/synthetic-puppy',
    submittedAt: '2026-04-02T00:00:00Z', message: 'Synthetic inquiry only', smsConsent: true, preferredContactMethod: 'Text', source: 'fluffytail'})
  for (let i = 0; i < 26; i++) documents.push({...common, _id: `sms-${i}`, _type: 'smsMessage', messageSid: `SM_fixture_${i}`,
    from: customer.phone, to: '+15555550102', direction: 'inbound', body: 'Synthetic message', receivedAt: '2026-04-02T00:00:00Z', source: 'fluffytail', mediaUrls: []})
  for (let i = 0; i < 9; i++) documents.push({...common, _id: `deposit-${i}`, _type: 'depositLink', active: i < 3,
    token: `synthetic-token-${i}`, stripeCheckoutUrl: `https://checkout.stripe.com/c/pay/synthetic-${i}`, puppySlug: 'synthetic-puppy',
    customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone,
    createdAt: '2026-04-02T00:00:00Z', ...(i < 3 ? {_system: {base: {id: `deposit-${i}`, rev: 'old-system-revision'}}} : {})})
  for (let i = 0; i < 14; i++) documents.push({...common, _id: `invoice-${i}`, _type: 'invoiceRecord', stripeInvoiceId: `in_synthetic_${i}`,
    stripeCustomerId: 'cus_synthetic', puppySlug: 'synthetic-puppy', customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone,
    status: 'open', amountDue: 300, amountPaid: 0, amountRemaining: 300, hostedInvoiceUrl: `https://invoice.stripe.com/i/synthetic-${i}`, createdAt: '2026-04-02T00:00:00Z'})
  return documents
}
