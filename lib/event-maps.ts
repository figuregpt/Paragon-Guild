import catalog from './event-map-assets.json';

export type MapAsset = typeof catalog[number];
/** Integer hundredths of a percent keep pins aligned at any screen size. */
export type MapPin = {asset:string; x:number; y:number};
export const MAP_POSITION_MAX=10_000;
export const eventMapAssets=(location:string)=>catalog.filter(asset=>asset.location===location);
export const eventMapAsset=(id:string)=>catalog.find(asset=>asset.id===id);
export function eventMapPin(event:{location:string;map_asset?:string|null;map_x?:number|null;map_y?:number|null}):MapPin|null {
 const asset=event.map_asset&&eventMapAsset(event.map_asset);
 return asset&&asset.location===event.location&&Number.isInteger(event.map_x)&&Number.isInteger(event.map_y)&&event.map_x!>=0&&event.map_x!<=MAP_POSITION_MAX&&event.map_y!>=0&&event.map_y!<=MAP_POSITION_MAX?{asset:asset.id,x:event.map_x!,y:event.map_y!}:null;
}
export function mapPoint(x:number,y:number):{x:number;y:number}{
 const clamp=(value:number)=>Math.max(0,Math.min(MAP_POSITION_MAX,Math.round(value)));
 return {x:clamp(x),y:clamp(y)};
}
