# Chest loot draft — 26 October 2026

All six chest contents are transcribed from the user's Arthion notebook screenshots. Generic Gameforge loot tables are NOT imported. Those tables and class item pages were consulted only to identify matching item icons and names. Icon URLs are retained in `ICON-SOURCES.json`.

## Screenshot references

| Local reference | User attachment | Reference entries |
| --- | --- | --- |
| red-tree-reference.png | codex-clipboard-14eb8d83-aea7-4d37-87d6-5a0a7e3bfc81.png | 30 |
| reaper-reference.png | codex-clipboard-7259f96f-501c-4837-89f9-594155345a97.png | 24 |
| flame-reference.png | codex-clipboard-9d8a8e34-9447-4879-88e3-b949df1f353f.png | 31 |
| nine-tails-reference.png | codex-clipboard-f21984d0-7f81-4d9f-b54c-c403f4fbfe68.png | 29 |
| yellow-tiger-reference.png | codex-clipboard-de34fa42-33de-4a6c-a7a5-893ebb969154.png | 32 |
| queen-spider-reference.png | codex-clipboard-0ad20ab3-75b8-4fa3-bdda-cd18a8780596.png | 30 |

The larger Grim Reaper reference and the duplicated Lusifer image describe the same chest. Yellow Tiger was also supplied twice. Do not add duplicate chest records.

The icon views use the original supplied reference imagery where that better preserves the Arthion item appearance. The user confirmed the Turkish names for the numbered items; English canonical names and localized labels are recorded in the catalog and the naming section below. Standard equipment labels use official Wiki interlanguage titles when available, with translated fallbacks. Item detail views also show the English identifier.

Only clearly identified quantities are entered. A missing count means unspecified, not a guaranteed single reward. Reinforce Core quantities are grouped as 1 / 2 after user confirmation. No drop rates, upgrade levels, bonus ranges, respawn times or item stats are inferred. These are chest contents, not direct boss drops. Yellow Tiger and Ember Tiger are separate bosses.

## Primary references used for icon identification

- https://arthion.to/presentation — original Arthion crafting and utility icon names.
- https://en-wiki.metin2.gameforge.com/index.php/Grim_Reaper%27s_Chest
- https://en-wiki.metin2.gameforge.com/index.php/Flame_King%27s_Chest
- https://en-wiki.metin2.gameforge.com/index.php/Nine_Tails%27_Chest
- https://en-wiki.metin2.gameforge.com/index.php/Yellow_Tiger%27s_Chest
- https://en-wiki.metin2.gameforge.com/index.php/Queen_Spider_Box
- Official class weapon/armour pages, Shields, Shoes and accessory pages, solely to compare icons.

This remains a local review draft. No push or deployment has been requested.

## Naming corrections confirmed by the user

The user supplied all remaining Turkish item names in the numbered reference order. These are now named records, not unknown placeholders. Two core entries (05 and 16) are Reinforce Core in quantities 1 and 2. Both the Red Tree and Grim Reaper references list these variants; they are grouped into one item per chest. The original 176 source entries therefore appear as 174 chest/item cards, across 77 distinct items. Counts remain available in `referenceEntryCount`.

- 01 Stone of the Blacksmith; 02 Stone Handbook; 03 Enchant Fragment; 04 Empty Bottle; 05/16 Reinforce Core.
- 06 Mysterious Quill; 07 Hermit's Feather; 08 Language Ring.
- 09 Soul Stone+ and 10 Soul Stone were matched before the user's reply.
- 11 Boss Summoning Medal (context identifies the boss it summons); 12 Medal of the Dragon; 13 Scroll of the Location.
- 14 Blacksmith's Memo (user calls it Demircinin İltifatı); 15 Wise Man's Memo.
- 17 Ghost Mask Sallet; 18 Steel Hood; 19 Inventory Expansion; 20 Sunlight Hat; 21 Book of the Leader.

Standard English names were checked against Gameforge Wiki and, for the two legacy memos, the Metin2 SG official patch notes. Reinforce Core is also named in Arthion's official 1.3.0 notes. The special quill, feather and boss medal use English translations of the user's confirmed Turkish labels. The exact Arthion English label for **Enchant Fragment** remains unverified and is explicitly marked as such in the item detail. No item function, stat or recipe has been inferred from a generic server table.

The visible 5 on reference item 17 is not treated as a five-helmet stack: it may indicate an upgrade level. No stack count or upgrade level is asserted for that helmet.

`NAME-SOURCES.json` records the official Wiki interlanguage titles used for Turkish/Greek names. User-supplied Turkish names take precedence. Remaining Greek display names are translations, not claims to be exact Arthion client strings.

## Current navigation and item layout

The earlier section tabs/chest browser have been replaced by a boss directory. Each boss opens one page containing its map, direct-drop status and matching chest contents. Compact mode uses inventory slots with accessible item names and click-to-open details; detailed mode shows named cards. The layout preference is saved locally and retained between bosses. A map shown without guild spawn references has no invented pins. Direct boss drops and dew recipes remain pending user-supplied data.
