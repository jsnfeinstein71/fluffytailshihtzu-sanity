import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {parse,evaluate} from 'groq-js'
const {priceDetails,directPurchaseBenefits}=await import('../lib/price-details.ts')
const {default:PriceDetails,PriceDetailsContent}=await import('../app/components/PriceDetails.tsx')
const {puppyQuery,littersQuery}=await import('../sanity/lib/inventory-queries.ts')
const pricing={litterPrice:1600,litterDeposit:400}
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props))

test('detail quotes honor configured amounts, exact cents and established puppy overrides',()=>{
 assert.deepEqual(priceDetails(pricing),{status:'established',totalCents:160000,depositCents:40000,remainingCents:120000})
 assert.deepEqual(priceDetails({litterPrice:1850.5,litterDeposit:450.25}),{status:'established',totalCents:185050,depositCents:45025,remainingCents:140025})
 assert.deepEqual(priceDetails({...pricing,overridePrice:2100.25},'estimated'),{status:'established',totalCents:210025,depositCents:40000,remainingCents:170025})
})

test('estimated, unset, incomplete and inconsistent prices never invent an exact final balance',()=>{
 assert.deepEqual(priceDetails(pricing,'estimated'),{status:'estimated',totalCents:160000,depositCents:40000,remainingCents:null})
 assert.deepEqual(priceDetails(pricing,'unset'),{status:'unset',totalCents:null,depositCents:40000,remainingCents:null})
 assert.equal(priceDetails({litterDeposit:425}).remainingCents,null)
 assert.equal(priceDetails({litterPrice:1650}).depositCents,null)
 for(const input of [{litterPrice:0,litterDeposit:400},{litterPrice:'1600',litterDeposit:400},{...pricing,overridePrice:-1},{litterPrice:100,litterDeposit:200}])assert.equal(priceDetails(input).remainingCents,null)
})

test('closed summary is simple, has one deliberate dialog trigger, and contains no policy popup or payment action',()=>{
 const html=render(PriceDetails,{name:'Fictional puppy',pricing})
 assert.match(html,/\$1,600 · \$400 deposit toward the total/);assert.match(html,/View price &amp; what’s included/);assert.match(html,/aria-haspopup="dialog"/);assert.match(html,/aria-expanded="false"/)
 assert.doesNotMatch(html,/<dialog|non-refundable|Veterinary|Remaining balance|checkout|\/api\//)
 const missing=render(PriceDetails,{name:'Fictional litter',pricing:{litterDeposit:425},context:'litter',upcoming:true});assert.match(missing,/Price to be confirmed · \$425 deposit/);assert.doesNotMatch(missing,/\$1,600|\$400/)
})

test('opened puppy details use only approved direct-sale benefits and accurate deposit/total/balance terms',()=>{
 const html=render(PriceDetailsContent,{name:'Fictional puppy',pricing})
 for(const amount of ['$400','$1,200','$1,600'])assert(html.includes(amount))
 for(const text of ['Remaining balance','Total puppy price','non-refundable','Payable before or at pickup','CKC registration papers','Written vaccination and deworming records','scented blanket','puppies still need consistent training'])assert(html.includes(text),text)
 assert.equal(directPurchaseBenefits.length,6);assert.doesNotMatch(html,/GoodDog|Good Dog|financing|insurance|payment.protection|fully.house.trained|guarantee|additional.fee/i)
})

test('upcoming details distinguish a selection position, future transfer and an estimate from a final quote',()=>{
 const props={name:'Fictional upcoming litter',pricing,context:'litter',upcoming:true},established=render(PriceDetailsContent,props)
 for(const text of ['picking order','not a particular puppy','next available position in a future litter','existing reserved positions are kept','sex, color, or litter size'])assert(established.includes(text),text)
 const estimate=render(PriceDetailsContent,{...props,pricingStatus:'estimated'});assert.match(estimate,/Estimated litter price/);assert.match(estimate,/price is an estimate/);assert.match(estimate,/To be confirmed/);assert.doesNotMatch(estimate,/\$1,200/)
 const unset=render(PriceDetailsContent,{...props,pricingStatus:'unset'});assert.match(unset,/Not yet established/);assert.doesNotMatch(unset,/\$1,600|\$1,200/)
})

test('real public queries carry optional estimate labels without changing their numeric price/deposit',async()=>{
 const dataset=[{_id:'litter',_type:'litter',status:'planned',price:1950,deposit:450,pricingStatus:'estimated'},{_id:'puppy',_type:'puppy',slug:{current:'fictional'},litter:{_ref:'litter'},overridePrice:2100}]
 const l=(await (await evaluate(parse(littersQuery),{dataset})).get())[0],p=await (await evaluate(parse(puppyQuery),{dataset,params:{slug:'fictional'}})).get()
 assert.equal(l.pricingStatus,'estimated');assert.equal(l.price,1950);assert.equal(l.deposit,450);assert.equal(p.litterPricingStatus,'estimated');assert.equal(p.overridePrice,2100);assert.equal(priceDetails(p,p.litterPricingStatus).remainingCents,165000)
})
