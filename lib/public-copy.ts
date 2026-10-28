// Owner-supplied manuscript: docs/source/FluffyTail-Website-Copy.md.
// Values in records remain authoritative; these helpers supply presentation only.
export const homepageHeadline = 'From our home to yours.'
export const homepageIntro = 'We’re Jeanne and Jason, and FluffyTail is part of our everyday life at home. Our Shih Tzus live with us as family pets, and raising their puppies means helping them get ready for a family of their own.\n\nTake a look at the little ones below. When a puppy catches your eye, send Jeanne a message. You can ask about that puppy, talk through timing, and get to know the person you’ll be working with.'
export const pageDescriptions = {
  home: 'Meet FluffyTail’s home-raised Shih Tzu puppies in the Mobile, Alabama area. Browse current litters and talk directly with Jeanne.',
  about: 'Get to know Jeanne and the home behind FluffyTail Shih Tzu. Meet our puppies and learn what comes with them when they join your family.',
  available: 'See FluffyTail’s current Shih Tzu puppies, photos, prices, and availability. Ask Jeanne about the puppy who catches your eye.',
  upcoming: 'Follow upcoming FluffyTail Shih Tzu litters and talk with Jeanne about your timing and a future puppy.',
  pricing: 'See current puppy pricing, deposits, what’s included, and how to arrange pickup with Jeanne at FluffyTail Shih Tzu.',
  contact: 'Ask Jeanne about a FluffyTail puppy or upcoming litter. Choose an email or text reply and start a conversation.',
  breed: 'Learn about companionship, grooming, and everyday life with a Shih Tzu before choosing your puppy.',
  resources: 'Prepare for your FluffyTail puppy’s trip home, starter kit, first days, and veterinary follow-up.',
}
export function unavailablePuppyNotice(name:string,status?:string|null){return status==='reserved'?`${name} is reserved. You’re welcome to ask Jeanne about another puppy or an upcoming litter.`:`${name} isn’t available for a new reservation. See our current puppies or ask Jeanne what’s coming up.`}
export const inquiryFailure='We couldn’t confirm that your message was submitted. Your details are still here. Please try again in a moment.'
export const formLoadingFailure='The form couldn’t load. Please refresh the page and try again.'
export const savedInquiryMessage=(preference:string)=>`Your inquiry is ready for Jeanne to review. You selected ${preference} for her reply.`
export const paymentCopy={
  request:'A payment request from Jeanne',
  deposit:(name:string,deposit:string,total:string)=>`Here are the deposit details for ${name}. Your ${deposit} deposit is non-refundable and counts toward the ${total} puppy price.`,
  balance:(name:string,total:string,remainingAfter:string)=>`Here is the remaining balance for ${name}. Once payment is confirmed, the total paid will be ${total}, with ${remainingAfter} left to pay.`,
  unpaid:'A payment request does not reserve a puppy. Jeanne will confirm the reservation after the deposit is verified.',
  verifiedDeposit:(amount:string,name:string,remaining:string)=>`Thank you — your ${amount} deposit for ${name} is confirmed. Your remaining balance is ${remaining}.`,
  paidInFull:(name:string)=>`Thank you — ${name} is paid in full. Arrange the pickup time and meeting place directly with Jeanne.`,
  processing:'Your payment is still being confirmed. Please don’t pay again. You can refresh this page or contact Jeanne for help.',
  unavailable:'This payment link is no longer available. Ask Jeanne for a current link before paying.',
  unconfirmed:'We couldn’t confirm a completed payment. If you just paid, contact Jeanne before trying again.',
  emailAccepted:'Your confirmation email has been sent to the mail provider. Check your inbox and spam folder.',
  emailNotSent:'Your payment is confirmed, but the confirmation email hasn’t been sent. Contact Jeanne if you need a copy.',
  help:'Questions? Reply to Jeanne’s email or text.',
}
