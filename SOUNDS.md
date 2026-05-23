# Platform Sounds

The old bundled `ClankerfightsSFX` helper has been retired. Games should call
documented platform sound IDs directly through `playgent.sound("<id>")`; the
parent shell owns playback.

All games in this collection are expected to have a small set of professional,
viewer-safe cues for visible selections, confirmations, phase changes, scoring,
combat, card movement, or endings. Keep cues semantic and sparse; avoid adding
sounds for hidden information until it is visible to the current viewer.

See [`SOUND_GUIDE.md`](./SOUND_GUIDE.md) for the current catalog and usage
rules.
