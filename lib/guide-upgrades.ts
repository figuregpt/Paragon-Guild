import catalog from './guide-upgrades.json';
import type {LootIcon} from './guide-loot';

export type UpgradeCategory='earrings'|'necklaces'|'bracelets'|'shoes'|'helmets'|'shields'|'armours'|'weapons';
export type UpgradeLevel=5|6|7|8|9;
export type UpgradeMaterial={id:string;name:string;icon:LootIcon};
export type UpgradeRequirement={item:string;quantity:number|null};
export type UpgradeBonus={label:string;value:number|null;unit:'flat'|'percent'};
export type UpgradeItem={id:string;category:UpgradeCategory;name:string;level:number;bonuses:UpgradeBonus[]|null;stages:Record<UpgradeLevel,UpgradeRequirement[]|null>;icon?:LootIcon;generic?:boolean;variant?:string;sourceOrder:number};
export const upgradeCategories=catalog.categories as {id:UpgradeCategory;name:string}[];
export const upgradeMaterials=catalog.materials as Record<string,UpgradeMaterial>;
export const upgradeItems=catalog.items as UpgradeItem[];
export const upgradeLevels:UpgradeLevel[]=[5,6,7,8,9];
export function upgradeSelection(params:URLSearchParams){
 const item=upgradeItems.find(item=>item.id===params.get('item'))??upgradeItems.find(item=>item.category===params.get('category'))??upgradeItems[0];
 const value=Number(params.get('upgrade')),stage=upgradeLevels.find(level=>level===value)??9;
 return {item,stage};
}
