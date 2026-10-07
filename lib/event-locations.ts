// English names verified against Gameforge's Metin2 Wiki world-map index.
// https://en-wiki.metin2.gameforge.com/index.php/Template:Main_Page/World_MapV2
export const EVENT_LOCATIONS=[
 {group:'Towns',maps:['Joan','Pyungmoo','Yongan','Bokjung','Bakra','Yayang']},
 {group:'Guild Zones',maps:['Waryong','Imha','Jungrang','Songpa','Daeyami','Miryang']},
 {group:'Open World',maps:['Valley of Seungryong','Yongbi Desert','Mount Sohan','Fireland','Hwang Temple','Ghost Forest','Red Forest','Snakefield','Land of Giants']},
 {group:'Ape Dungeons',maps:['Hasun Dong','Jungsun Dong','Sangsun Dong']},
 {group:'Spider Dungeons',maps:['Spider Dungeon 1','Spider Dungeon 2','Spider Dungeon 3',"Spider Queen's Nest"]},
 {group:'Demon Tower',maps:['Demon Tower']},
 {group:'Grotto of Exile',maps:['Grotto of Exile','Grotto of Exile V2',"Dragon's Temple"]},
 {group:'PvP & Meeting Areas',maps:['Guild War Area','Arena','OX-Competition','Wedding Map','Castle Gate']},
] as const;
export const EVENT_MAP_NAMES:readonly string[]=EVENT_LOCATIONS.flatMap(group=>[...group.maps]);
export function mapLabel(name:string){return name==='Spider Dungeon 1'?name+' (SD1)':name==='Spider Dungeon 2'?name+' (SD2)':name==='Spider Dungeon 3'?name+' (SD3)':name;}
