/** Arthion-specific locations transcribed from the guild's nine supplied references.
 * Positions are percentages of the terrain bounds, NOT in-game coordinates.
 * Never import generic Metin2 loot tables: Arthion boss and chest loot are separate.
 */
export type GuideMapId = 'fireland' | 'red-forest' | 'ghost-forest' | 'mount-sohan';
export type SpawnPoint = {x:number;y:number};
export const guideMaps = [
 {id:'fireland',name:'Doyyumhwan',subtitle:'Fireland',image:'/maps/fireland.png',source:'https://en-wiki.metin2.gameforge.com/index.php/Doyyumhwan'},
 {id:'red-forest',name:'Red Forest',subtitle:'Red Forest',image:'/maps/red-forest.png',source:'https://en-wiki.metin2.gameforge.com/index.php/Red_Forest'},
 {id:'ghost-forest',name:'Ghost Forest',subtitle:'Arthion map',image:'/maps/boss-guide/ghost-forest-arthion-reference.png',source:null},
 {id:'mount-sohan',name:'Mount Sohan',subtitle:'Mount Sohan',image:'/maps/mount-sohan.png',source:'https://en-wiki.metin2.gameforge.com/index.php/Mount_Sohan'},
] as const;
export type GuideBoss = {id:string;name:string;map:GuideMapId;reference:number;points:SpawnPoint[];bossDrops:null;chestDrops:null};
const points = (values:number[][]):SpawnPoint[] => values.map(([x,y])=>({x,y}));
export const guideBosses:GuideBoss[] = [
 {id:'magma-golem',name:'Magma Golem',map:'fireland',reference:1,points:points([[8.2,25.8],[39.8,25.8],[91.4,27],[25.4,43.4],[67.6,63.3],[29.3,73.8]]),bossDrops:null,chestDrops:null},
 {id:'flame-king',name:'Flame King',map:'fireland',reference:2,points:points([[37.1,8.6],[8.6,50.8],[75.8,44.5],[50.8,72.7],[91.4,68.8],[33.6,92.6]]),bossDrops:null,chestDrops:null},
 {id:'ember-tiger',name:'Ember Tiger',map:'fireland',reference:7,points:points([[27.7,26.2],[82.8,19.9],[60.9,48],[7,75.4]]),bossDrops:null,chestDrops:null},
 {id:'thornspike-stump',name:'Thornspike Stump',map:'red-forest',reference:3,points:points([[61.8,9.9],[31.9,34],[91.1,37.7],[11,55],[58.1,60.2]]),bossDrops:null,chestDrops:null},
 {id:'nightmare-tree',name:'Nightmare Tree',map:'red-forest',reference:4,points:[],bossDrops:null,chestDrops:null},
 {id:'giant-red-tree-ghost',name:'Giant Red Tree Ghost',map:'red-forest',reference:5,points:points([[11,6.8],[90.1,7.9],[34.6,47.1],[76.4,69.6],[9.9,91.1]]),bossDrops:null,chestDrops:null},
 {id:'giant-ghost-tree',name:'Giant Ghost Tree',map:'ghost-forest',reference:6,points:points([[16.1,28.3],[30.1,94.3],[82.9,94.3],[63.3,61.6],[91.6,22.6]]),bossDrops:null,chestDrops:null},
 {id:'dark-crystal-golem',name:'Dark Crystal Golem',map:'mount-sohan',reference:8,points:points([[67.2,48.4],[82.4,66],[15.6,88.3]]),bossDrops:null,chestDrops:null},
 {id:'plague-carrier',name:'Plague Carrier',map:'mount-sohan',reference:9,points:points([[27.7,16.4],[73.4,22.7],[15.2,40.6],[30.1,71.1],[66.8,86.7]]),bossDrops:null,chestDrops:null},
];
export function guideBoss(id:string|null){return guideBosses.find(boss=>boss.id===id);}
