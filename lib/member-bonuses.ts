import type {Language} from './i18n';
export type BonusCategory='attributes'|'offense'|'defense'|'recovery'|'utility';
export type BonusDefinition={id:string;category:BonusCategory;max:number|null;unit:'flat'|'percent'|'boolean';names:Record<Language,string>};
const bonus=(id:string,category:BonusCategory,max:number|null,unit:BonusDefinition['unit'],en:string,tr:string,el:string):BonusDefinition=>({id,category,max,unit,names:{en,tr,el}});
// Maxima are per equipment item, transcribed from the guild's supplied screenshots.
// They describe individual affixes, not a cap on the player's manually entered totals.
export const MEMBER_BONUSES:BonusDefinition[]=[
 bonus('max_hp','attributes',2000,'flat','Max. HP','Maksimum HP','Μέγιστη HP'),
 bonus('max_sp','attributes',800,'flat','Max. SP','Maksimum SP','Μέγιστη SP'),
 bonus('vitality','attributes',12,'flat','Vitality','Canlılık','Ζωτικότητα'),
 bonus('intelligence','attributes',12,'flat','Intelligence','Zeka','Νοημοσύνη'),
 bonus('strength','attributes',12,'flat','Strength','Güç','Δύναμη'),
 bonus('dexterity','attributes',12,'flat','Dexterity','Çeviklik','Ευκινησία'),
 bonus('attack_speed','attributes',8,'percent','Attack Speed','Saldırı Hızı','Ταχύτητα Επίθεσης'),
 bonus('movement_speed','attributes',20,'percent','Movement Speed','Hareket Hızı','Ταχύτητα Κίνησης'),
 bonus('casting_speed','attributes',20,'percent','Casting Speed','Büyü Hızı','Ταχύτητα Μαγείας'),
 bonus('hp_regeneration','recovery',30,'percent','HP Regeneration','HP Üretimi','Αναγέννηση HP'),
 bonus('sp_regeneration','recovery',30,'percent','SP Regeneration','SP Üretimi','Αναγέννηση SP'),
 bonus('poison_chance','offense',8,'percent','Poisoning Chance','Zehirleme Şansı','Πιθανότητα Δηλητηρίασης'),
 bonus('stun_chance','offense',8,'percent','Stun Chance','Bayılma Şansı','Πιθανότητα Αναισθητοποίησης'),
 bonus('slow_chance','offense',8,'percent','Slowing Chance','Yavaşlama Şansı','Πιθανότητα Επιβράδυνσης'),
 bonus('critical_chance','offense',10,'percent','Critical Hit Chance','Kritik Vuruş Şansı','Πιθανότητα Κρίσιμου Χτυπήματος'),
 bonus('piercing_chance','offense',10,'percent','Piercing Hit Chance','Delici Vuruş Şansı','Πιθανότητα Διαπεραστικού Χτυπήματος'),
 bonus('half_humans','offense',10,'percent','Strong Against Half Humans','Yarı İnsanlara Karşı Güçlü','Δύναμη Εναντίον Ημιανθρώπων'),
 bonus('animals','offense',20,'percent','Strong Against Animals','Hayvanlara Karşı Güçlü','Δύναμη Εναντίον Ζώων'),
 bonus('orcs','offense',20,'percent','Strong Against Orcs','Orklara Karşı Güçlü','Δύναμη Εναντίον Ορκ'),
 bonus('mystics','offense',20,'percent','Strong Against Mystics','Mistiklere Karşı Güçlü','Δύναμη Εναντίον Μυστικιστών'),
 bonus('undead','offense',20,'percent','Strong Against Undead','Ölümsüzlere Karşı Güçlü','Δύναμη Εναντίον Απέθαντων'),
 bonus('devils','offense',20,'percent','Strong Against Devils','Şeytanlara Karşı Güçlü','Δύναμη Εναντίον Δαιμόνων'),
 bonus('hp_absorb','recovery',10,'percent','Damage Absorbed by HP','Vuruşta HP Çalma','Απορρόφηση Ζημιάς ως HP'),
 bonus('sp_absorb','recovery',10,'percent','Damage Absorbed by SP','Vuruşta SP Çalma','Απορρόφηση Ζημιάς ως SP'),
 bonus('sp_steal','recovery',10,'percent','SP Steal Chance','SP Çalma Şansı','Πιθανότητα Κλοπής SP'),
 bonus('melee_block','defense',15,'percent','Block Melee Attacks','Yakın Dövüş Saldırılarını Bloklama','Αποκλεισμός Κοντινών Επιθέσεων'),
 bonus('arrow_dodge','defense',15,'percent','Dodge Arrows','Oktan Kaçınma Şansı','Αποφυγή Βελών'),
 bonus('sword_defense','defense',15,'percent','Sword Defense','Kılıç Savunması','Άμυνα Σπαθιού'),
 bonus('two_handed_defense','defense',15,'percent','Two-Handed Defense','Çift El Savunması','Άμυνα Δίχειρου Όπλου'),
 bonus('dagger_defense','defense',15,'percent','Dagger Defense','Bıçak Savunması','Άμυνα Στιλέτου'),
 bonus('bell_defense','defense',15,'percent','Bell Defense','Çan Savunması','Άμυνα Καμπάνας'),
 bonus('fan_defense','defense',15,'percent','Fan Defense','Yelpaze Savunması','Άμυνα Βεντάλιας'),
 bonus('arrow_defense','defense',15,'percent','Arrow Defense','Ok Savunması','Άμυνα Βελών'),
 bonus('magic_resistance','defense',15,'percent','Magic Resistance','Büyüye Karşı Dayanıklılık','Αντίσταση στη Μαγεία'),
 bonus('melee_reflect','defense',10,'percent','Reflect Melee Damage','Yakın Dövüş Hasarını Yansıtma','Ανάκλαση Κοντινής Ζημιάς'),
 bonus('sp_on_kill','recovery',5,'percent','Restore SP on Kill','Öldürmede SP Yenileme Şansı','Ανάκτηση SP μετά από Θανάτωση'),
 bonus('exp_bonus','utility',20,'percent','EXP Bonus Chance','EXP Bonus Şansı','Πιθανότητα Μπόνους EXP'),
 bonus('double_yang','utility',20,'percent','Double Yang Drop Chance','İki Kat Yang Düşme Şansı','Πιθανότητα Διπλού Yang'),
 bonus('double_items','utility',5,'percent','Double Item Drop Chance','İki Kat Eşya Düşme Şansı','Πιθανότητα Διπλών Αντικειμένων'),
 bonus('stun_immunity','defense',null,'boolean','Immune to Stun','Sersemliğe Karşı Bağışıklık','Ανοσία στην Αναισθητοποίηση'),
 bonus('slow_immunity','defense',null,'boolean','Immune to Slow','Yavaşlamaya Karşı Bağışıklık','Ανοσία στην Επιβράδυνση'),
 bonus('skill_attack_value','offense',40,'flat','Skill Attack Value','Beceri Saldırı Değeri','Αξία Επίθεσης Ικανότητας'),
 bonus('poison_resistance','defense',null,'percent','Poison Resistance','Zehire Karşı Savunma','Αντίσταση στο Δηλητήριο'),
 bonus('reduced_sp','utility',15,'percent','Reduced SP Consumption','Azaltılmış SP Tüketimi','Μειωμένη Κατανάλωση SP'),
 bonus('skill_duration','utility',10,'percent','Skill Duration','Beceri Süresi','Διάρκεια Ικανότητας'),
 bonus('potion_duration','utility',20,'percent','Potion Duration','İksir Süresi','Διάρκεια Φίλτρου'),
 bonus('potion_strength','utility',10,'percent','Potion Strength','İksir Gücü','Ισχύς Φίλτρου'),
 bonus('skill_hp_absorb','recovery',10,'percent','Skill Damage Absorbed by HP','Beceri Hasarının HP ile Absorbesi','Απορρόφηση Ζημιάς Ικανότητας ως HP'),
 bonus('attack_value','offense',50,'flat','Attack Value','Ortalama Saldırı Değeri','Αξία Επίθεσης'),
];
export const BONUS_CATEGORIES:Record<BonusCategory,Record<Language,string>>={
 attributes:{en:'Attributes',tr:'Temel Özellikler',el:'Χαρακτηριστικά'},offense:{en:'Attack',tr:'Saldırı',el:'Επίθεση'},defense:{en:'Defense',tr:'Savunma',el:'Άμυνα'},recovery:{en:'Recovery',tr:'Yenilenme',el:'Ανάκτηση'},utility:{en:'Other Bonuses',tr:'Diğer Bonuslar',el:'Άλλα Μπόνους'},
};
export const BONUS_IDS=new Set(MEMBER_BONUSES.map(b=>b.id));
export type BonusTotals=Record<string,number>;
export type PublicMember={id:string;name:string;class:string;avatar:string|null;class_roles:import('./member-class-roles').MemberClassRole[];group_id:string|null;group_name:string|null;updated:number|null};
export type MemberProfile={member:PublicMember;bonuses:BonusTotals;revision:number;updated:number|null;editable:boolean};
export type PvpGroup={id:string;name:string;description:string;revision:number;member_ids:string[]};
