import catalog from './guide-dews.json';
import type {LootIcon} from './guide-loot';

export type DewIngredient={id:string;name:string;icon:LootIcon;namePending?:boolean};
export type DewRecipe={id:string;output:string;quantity:number;yang:number;referenceOrder:number;ingredients:{item:string;quantity:number}[]};
export const dewItems=catalog.items as Record<string,DewIngredient>;
export const dewRecipes=catalog.recipes as DewRecipe[];
