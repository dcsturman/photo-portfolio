/* =============================================================
   photos.js  —  YOUR control file. Edit this, not the others.

   • ORDER  : photos appear in the order listed here, top to bottom.
              Reorder by moving whole lines.
   • caption: YOUR words. Left blank for you to fill in.
   • category: one of  "People"  "Places"  "Critters"
              (the "Everything" filter shows them all).

   The // note at the end of each line is just a reminder of what
   the photo is — it does nothing and you can delete it.
   ============================================================= */

const PHOTOS = [
  {
    file: "DSC_2868.jpg",
    category: "People",
    caption: "Take me out to the ball game",
  }, // boy grinning at a Giants game
  { file: "DSC_4064.jpg", category: "Critters", caption: "Don't tread on me" }, // chipmunk beside a hiking boot
  {
    file: "Sturman_Formal_2.jpg",
    category: "Places",
    caption: "The Patriarchs",
  }, // Zion canyon peaks
  {
    file: "STURMAN_Stopped_2.jpg",
    category: "Critters",
    caption: "Great Blue",
  }, // great blue heron in flight
  { file: "DSC_5609.jpg", category: "People", caption: "Lily" }, // woman in profile, b&w
  { file: "DSC_0181.jpg", category: "Critters", caption: "On the wing" }, // harrier in flight
  {
    file: "Sturman_Urban_4.jpg",
    category: "Places",
    caption: "Study break",
  }, // blue scooter, "Found Study"
  { file: "DSC_0974.jpg", category: "Critters", caption: "Blue is black" }, // black hen in the grass
  {
    file: "STURMAN_Light_02.jpg",
    category: "People",
    caption: "Into the sunset",
  }, // backlit silhouette walking a dog
  {
    file: "Sturman_Formal_1.jpg",
    category: "Places",
    caption: "Kissing rocks",
  }, // sandstone arch against blue sky
  { file: "DSC_1088.jpg", category: "Critters", caption: "I'm just standing" }, // horse in a stall, b&w
  {
    file: "DSC_5452.jpg",
    category: "People",
    caption: "Self: Aching foot",
  }, // man seated, b&w portrait
  { file: "DSC_0054.jpg", category: "Places", caption: "Transport" }, // SF streetcar on Market St
  { file: "DSC_2922.jpg", category: "Critters", caption: "Show your colors" }, // banana slug on a rock
  { file: "DSC_5469.jpg", category: "People", caption: "Unexpected friends" }, // woman beside a donkey at a fence
  { file: "Sturman_Urban_2.jpg", category: "Places", caption: "The Strand" }, // red ACT theater facade
  { file: "STURMAN_Light_01.jpg", category: "Critters", caption: "Luna" }, // dog in dramatic light, b&w
  {
    file: "Sturman_storytelling_07.jpg",
    category: "People",
    caption: "Italian Dream",
  }, // Crepe maker at farmers market
  { file: "DSC_0077.jpg", category: "People", caption: "You be you" }, // person reclining on a bench, b&w
  { file: "DSC_0016.jpg", category: "Places", caption: "Pathways" }, // empty SF street, footbridge view
  { file: "DSC_2958.jpg", category: "Critters", caption: "Chill'n Chicken" }, // white hen in the coop
  { file: "DSC_2712.jpg", category: "People", caption: "Take a swing" }, // Padres batter swinging at a pitch.
  { file: "STURMAN_Light_03.jpg", category: "People", caption: "Family Photo" }, // two long shadows on pavement
  {
    file: "Sturman_Urban_1.jpg",
    category: "Places",
    caption: "Nature & Nurture",
  }, // desert pavilion framing a mesa
  { file: "DSC_6076.jpg", category: "Places", caption: "Doorway" }, // Landscape through doorway
  { file: "DSC_0043.jpg", category: "Places", caption: "Many robots" }, // Waymo cars at an intersection
  { file: "DSC_0482.jpg", category: "Critters", caption: "Brahman bull" }, // bull behind fence
  { file: "STURMAN_Light_04.jpg", category: "Critters", caption: "Shiny bugs" }, // backlit bokeh in an evergreen
  { file: "DSC_2550.jpg", category: "Places", caption: "Bucket" }, // red bucket on a weathered fence
  { file: "DSC_0365.jpg", category: "People", caption: "Can't beat the heat" }, // vendor at farmer's market
  { file: "APC_0223.jpg", category: "Places", caption: "Mount Rainier" }, // Mount Rainier with Lumen Field and Mariners park in the forground
  { file: "APC_0247.jpg", category: "Places", caption: "Round and round" }, // Ferris wheel
  { file: "APC_0253.jpg", category: "People", caption: "Budding artist" }, // street artist spraypainting
  { file: "APC_0263.jpg", category: "People", caption: "The Beat" }, // street musician drumming
  { file: "APC_0266.jpg", category: "Places", caption: "United by Nature" }, // mural of a boy and a girl at huge size
  { file: "APC_0275.jpg", category: "Places", caption: "Whats that?" }, // pigeon on top of old machinery
  { file: "APC_0284.jpg", category: "Places", caption: "More shops" }, // slow exposure with movement of neon sign
  { file: "DSC_0795.jpg", category: "Critters", caption: "Gotta scoot" }, // mocking bird moving off a bench
  { file: "APC_0315.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "APC_0326.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "APC_0344.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0417.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0425.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0444.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0467.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0479.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0495.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0504.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0509.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
  { file: "DSC_0545.jpg", category: "Places", caption: "" }, // TODO: set category (People/Places/Critters) & caption
];
