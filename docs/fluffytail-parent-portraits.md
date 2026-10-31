# Parent portraits — October 31, 2026

The owner supplied photographs of Penny, Elsie and Rocco and requested transparent website portraits, with Penny replacing the go-home announcement. The selected PNGs were edited with the built-in image editor, then checked at website display size on white and ivory backgrounds. The originals remain intact.

- Penny and Elsie replace only their respective current litter `heroImage` references. Their existing order remains Penny first, Elsie second.
- About's existing “My home, my dogs” section shows all three named portraits. Rocco has no recorded litter relationship, so none was added or implied.
- `lib/parent-portraits.ts` records the exact selected Sanity asset URLs. Only those images receive transparent, uncropped litter-tile styling. Historical and future ordinary photos retain their presentation.
- Each selected original is a 1254 × 1254 RGBA PNG. Responsive delivery uses the existing Sanity image helper.

Sanity production transaction `L11icTaLbZZfGeQH0hV5OC` changed only the two litter hero images. Revision guards and before/after comparison verified all other fields were preserved. No parent records or schema changes were needed.

Local deliverables, original-source references and exact image prompts are saved in the project workspace's `output/parent-portraits` folder. Publication snapshots and the guarded script are retained in the local `FluffyTail/ParentPhotoUpdate` support folder.
