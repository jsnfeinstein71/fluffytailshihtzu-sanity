import './register-typescript.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {getPuppyProfilePortrait} from '../lib/puppy-portraits.ts'

test('the first cutout only belongs to Elsie Girl 2 and yields to a newer CMS photo', () => {
  const puppy = {
    _id: '136dcb97-3aaf-41dd-9a5d-b5fe194d629e',
    photoUrl: 'https://cdn.sanity.io/images/3glz6dkx/production/3fa2bdd49dd9673a24c8a16ead795e9bb514b52b-2048x1984.jpg',
  }
  assert.equal(getPuppyProfilePortrait(puppy), '/puppies/elsie-girl2-profile-transparent.png')
  assert.equal(getPuppyProfilePortrait({...puppy, _id: 'a-different-girl-2'}), null)
  assert.equal(getPuppyProfilePortrait({...puppy, photoUrl: 'https://example.com/newer-photo.jpg'}), null)
  assert.equal(getPuppyProfilePortrait({...puppy, photoUrl: null}), null)
})
