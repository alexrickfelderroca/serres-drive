/* =====================================================================
   SERRES DRIVE — media-map.js
   Maps each fleet slug to the Sicurcars scrape images that show that car
   (derived from each post's own caption hashtags / model callouts, and
   spot-checked visually). Files live in assets/img/cars/scrape/.
   These are the collaboration's real fleet photos (see footer credit).
   Only confident matches are listed; unmatched posters are omitted.

   NOTE: the keys MUST be current fleet slugs. When the fleet was rebuilt in
   July 2026 several slugs changed and the stale keys failed silently (no error,
   the gallery just vanished). The check at the bottom of this file warns about
   that in the console rather than letting it slip through again.
   ===================================================================== */
window.SERRES_MEDIA = {
  "audi-rs6-avant":            ["2026-05-26_DY0Q91JN29-.jpg"],
  "audi-rs3":                  ["2026-05-17_DYc8A-dN9E3.jpg"],
  "porsche-911-carrera-992":   ["2026-05-10_DYKxvRLDb-7.jpg", "2026-02-20_DU-RvxBDoDm.jpg"],
  "porsche-911-targa-gts":     ["2026-05-06_DYAeFsqjRWl.jpg"],
  "porsche-cayenne-turbo-gt":  ["2026-04-23_DXe_yzLDf4H.jpg"],
  "audi-rsq3-sportback":       ["2026-04-15_DXKhJ8UDTKH.jpg", "2026-03-13_DV08YVODvdx.jpg", "2026-02-27_DVRT_hDjSAV.jpg"],
  "mercedes-amg-g63":          ["2026-04-10_DW9XTMvjaXY.jpg", "2026-03-05_DVg0NxTDWMO.jpg"],
  "porsche-cayenne-gts-coupe": ["2026-03-18_DWBjCCLjXtQ.jpg"],
  "volkswagen-golf-r":         ["2026-03-05_DVf902oDhL0.jpg", "2026-02-12_DUqzW7uDcaL.jpg"],
  "porsche-718-spyder":        ["2026-01-30_DUIayrkjuP0.jpg"]
};

/* Warn (console only) about keys that no longer match a car, so a future fleet
   change cannot silently drop a gallery again. */
(function () {
  if (!window.SERRES_FLEET || !window.console) return;
  var slugs = {}, k;
  for (var i = 0; i < window.SERRES_FLEET.length; i++) slugs[window.SERRES_FLEET[i].slug] = 1;
  for (k in window.SERRES_MEDIA) {
    if (window.SERRES_MEDIA.hasOwnProperty(k) && !slugs[k]) {
      console.warn("SERRES_MEDIA: no car with slug '" + k + "' — its photos will never show.");
    }
  }
})();
