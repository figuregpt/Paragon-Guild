import artSources from '../public/guide/bosses/SOURCES.json';
import {guideBosses,guideMaps,type GuideBoss} from './game-guide';
import {guideChests,type GuideChest} from './guide-loot';

export type BossArt={image?:string;representative?:boolean;referenceMonster?:string;source?:string};
export type BossKind='Boss'|'Miniboss';
export const MINIBOSS_IDS=['magma-golem','ember-tiger','nightmare-tree','thornspike-stump','dark-crystal-golem','plague-carrier'] as const;
export const bossKind=(id:string):BossKind=>(MINIBOSS_IDS as readonly string[]).includes(id)?'Miniboss':'Boss';
export type BossGuideEntry={id:string;name:string;kind:BossKind;mapName:string;mapImage:string;mapConfirmed:boolean;spawn:GuideBoss|null;chest:GuideChest|null;art:BossArt};
const art=(id:string):BossArt=>artSources.find(source=>source.id===id)??{};
export const bossGuide:BossGuideEntry[]=[
 ...guideBosses.map(boss=>{const map=guideMaps.find(map=>map.id===boss.map)!;return{id:boss.id,name:boss.name,kind:bossKind(boss.id),mapName:map.name,mapImage:map.image,mapConfirmed:true,spawn:boss,chest:guideChests.find(chest=>chest.bossId===boss.id)??null,art:art(boss.id)};}),
 ...[
  ['grim-reaper','Grim Reaper','Demon Tower','/maps/demon-tower.jpg'],
  ['nine-tails','Nine Tails','Mount Sohan','/maps/mount-sohan.png'],
  ['yellow-tiger','Yellow Tiger Ghost','Hwang Temple','/maps/hwang-temple.png'],
  ['queen-spider','Queen Spider','Spider Dungeon 2','/maps/spider-dungeon-2.png'],
 ].map(([id,name,mapName,mapImage])=>({id,name,kind:bossKind(id),mapName,mapImage,mapConfirmed:false,spawn:null,chest:guideChests.find(chest=>chest.bossId===id)??null,art:art(id)})),
];
export function findGuideBoss(id:string|null){return bossGuide.find(boss=>boss.id===id);}
/** Support the draft's previous chest URLs without forcing users through obsolete tabs. */
export function bossFromParams(params:URLSearchParams){return bossGuide.find(boss=>boss.chest?.id===params.get('chest'))??findGuideBoss(params.get('boss'));}
