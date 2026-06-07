# Speechify Image Pointer Strict Mode

The audio pill image pointer is intentionally strict.

The current image may change only when the live Speechify highlighted reader text
contains, or has already passed, an explicit singular image mention:

- `RadPrimer image 16`
- `RadPrimer image sixteen`
- `STATdx image 21`
- `image 4`

Plural image mentions can decorate the group label, but they do not choose the
current image by themselves:

- `RadPrimer images 15 and 16`
- `STATdx images 3-4`

These must never change the current image:

- arrow descriptions
- anatomy terms or imaging findings
- words such as `next`, `second`, `following`, `first`, or `last`
- cached lecture text
- synthetic clock or playback progress estimates
- currently visible RadPrimer or STATdx modal state

If the live Speechify highlight does not contain a newer explicit singular image
mention, the pill holds the last explicit image. This keeps the pointer stable
through the explanatory sentences that follow each image mention.

The held image state is reset when Speechify switches to a different lecture
title, so one lecture cannot leak its last image into the next.
