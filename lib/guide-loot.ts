import catalog from './guide-loot.json';
export type LootIcon = {src:string;sheetWidth?:number;sheetHeight?:number;x?:number;y?:number;width?:number;height?:number};
export type LootCategory='Weapons'|'Armours'|'Accessories'|'Materials'|'Utility'|'Unconfirmed';
export type LootItem={id:string;name:string;category:LootCategory;icon:LootIcon;status:'identified'|'unconfirmed';questionNumber?:number;referenceNumber?:number;aliases?:string[];englishNamePending?:boolean;slots?:number};
export type ChestEntry={item:string;quantity?:number;quantities?:number[];summonsBoss?:string};
export type GuideChest={id:string;name:string;icon:LootIcon;bossId:string|null;aliases:string[];reference:string;referenceEntryCount:number;entries:ChestEntry[]};
export const lootItems=catalog.items as Record<string,LootItem>;
export const guideChests=catalog.chests as GuideChest[];
export const unconfirmedLoot=Object.values(lootItems).filter(item=>item.status==='unconfirmed').sort((a,b)=>a.questionNumber!-b.questionNumber!);
export function guideChest(id:string|null){return guideChests.find(chest=>chest.id===id);}
export function chestForBoss(bossId:string){return guideChests.find(chest=>chest.bossId===bossId);}
