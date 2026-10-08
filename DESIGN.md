# Paragon design system

The approved red-crested silver helmet is the brand asset, used unchanged. The interface is a dark guild operations app with four destinations: Home, Auctions, Events and Profile. All text is English. Actual Metin2 item icons, class artwork and Demon Tower imagery remain.

Palette: canvas #0b0d11, panel #12151b, raised #191d25, edge #2b303a, text #f1f2f5, muted #a0a8b7, action crimson #d8373e. Silver replaces gold. System sans typography, tabular numbers, bold compact headings. Buttons are at least 44px and preserve geometry through pointer states. Corners 5px actions / 8px panels; hairline borders establish depth.

Desktop has a logo masthead, four tabs, a compact character/PP sidebar and the working area. Mobile has a condensed character summary and a fixed four-tab bottom bar with safe-area padding. Leader controls remain within their corresponding section. Auctions pair a selectable item list with a prominent item detail and bid history. No empty inventory cells, wooden frames or ornamental UI textures.

Reference: Awesome DESIGN.md Raycast, adapted for dark surface hierarchy and data density. User logo and guild functions lead the design; Raycast branding and marketing compositions are not used. Reviewed against Vercel Web Interface Guidelines, with desktop/mobile rendering and real interactions.

Guild entry stays compact: centered emblem and Discord sign-in with current Member-role access. Public demo buttons are disabled in production. No slogans, feature icon strip, marketing explanations or decorative section eyebrows.

All displayed timestamps and event calendar tiles use the device time zone. Event creation shows that zone and converts local input to a UTC timestamp; invalid local times during daylight-saving gaps are rejected. Push payloads contain the UTC event timestamp for local formatting by the device service worker. The guild's weekly deposit boundary remains a shared guild rule.

Navigation uses plain text tabs without decorative icons. Mobile labels remain 13px with 48px touch targets.

Visible game branding uses Arthion in the masthead, footer, page title, install manifest and member/admin copy.

Guild Home shows Weekly Quests, ongoing/upcoming events and auctions. Four text destinations are Home, Auctions, Events and Profile, with a fixed mobile bottom bar. Event workflows live in an accessible detail dialog; profile contains created, joined and attended history. Weekly contribution cards distinguish not completed, awaiting approval and completed, with the in-game destination GuildBanker at Ch-3 Blacksmith. No slogans or decorative navigation icons are added.

Events use one labeled type filter instead of a row of category tabs. Help creation displays Starts Now and a duration in minutes; other types retain local start-time input. The creator and confirmed participants earn the same PP after administrator approval. An ongoing Help event exposes proof upload before its End action, which stays disabled until a screenshot exists. Chosen duration is displayed as an expected end time; completion requires the creator and administrator review.

Event navigation separates Schedule, My Events, History and administrator Review. Create Event is the single page-level action and opens a focused native dialog with a compact reward summary and footer actions. Review includes a pending-count badge and never shares the creation form. One list surface replaces stacked empty panels. Notification and install settings sit in a Profile disclosure, separate from event browsing. Dialog dismissal retains an unfinished form draft; successful creation clears it and returns to Schedule.

Page headings have no guild shield/status badge. Auction creation uses one form: a required item screenshot and English name, with bid settings and optional source/details. There is no item catalogue or icon import flow. Uploaded screenshots use smooth contained previews and a full-size link; older icon-based auctions retain their existing assets. Only guild administrators can create or cancel auctions; members can bid.

Attendance confirmation uses immediate local selections, Select All / Clear All, and a bounded list for large groups. Submit for Approval stays in a fixed dialog footer with the reward count and saves all selected names atomically. Screenshot evidence collapses once uploaded; the creator is shown separately as an eligible recipient of the same reward. Failed submissions retain the selection.

Administrator review has independent local reward selections, including the creator. Host attendance remains unchanged when an administrator excludes a recipient. Select All / Clear All and a fixed Approve Selected footer support large groups; excluded users receive no PP. Whole-event rejection requires a reason.

Guild Settings and Manage Profile are removed. The account menu opens an administrator-only PP panel with a searchable roster, native player selection, Add PP / Remove PP action, positive amount, reason and recent signed adjustments. Manual credits and deductions are immutable, audited and idempotent; recipient membership is verified before adjusting points. Deductions are atomic and cannot consume auction reservations or make available PP negative.

Profile notification controls include an own-device push test. New Help announcements remain deliverable during their duration. Notifications deep-link to the event and honor member/preference changes. Discord event announcements use a single rich embed, guild emblem, location, reward, device-local Discord timestamps and an Open Event link button, with mentions disabled. A persistent outbox and stable nonce limit duplicate sends; demos never post to Discord.

New events offer a Channel selector with CH-1 through CH-6. The map and channel appear together in home/profile summaries and event details, and the Discord card includes a Channel field. Device notifications also show the selected CH. Historic events with unknown channels are not assigned a fabricated value.

How to Use is a public, static English visual guide at /how-to-use. A shared footer exposes it on the sign-in gateway and every application screen, without adding a fifth tab. Seven native exclusive disclosures keep only the chosen topic open; short numbered steps sit beside real application screenshots at desktop widths and above them on phones. Topic links and URL fragments open the correct disclosure, and every screenshot links to its original resolution. Thirteen captures use fictional accounts in the isolated local demo; notification readiness is previewed without production requests or device subscriptions. No real member data is published. The guide covers iPhone Home Screen setup, notifications/reminders, event participation/proof/review, PP/contributions, auctions and admin controls. Chrome installation instructions are excluded. Apple’s setup reference is linked; the native iPhone permission prompt is described rather than fabricated. The guide fetches no private API data.

Event creation uses the shared reward policy: Help and Demon Tower 10 PP, PvE 35 PP, Open PvP and Guild War 100 PP, World Boss 75 PP. Experienced role holders can create every non-Help type, including Custom with a chosen whole-number PP reward and map or free-text location. Demon Tower fixes the map to Demon Tower. All non-Help types show a device-local start time, no duration or end-time field, and a manual End Event action. Historical event rewards remain unchanged.

How to Use presents a topic chooser and one illustrated step at a time. Back/Next controls sit beside the instruction, before the screenshot. Desktop keeps a compact topic index; mobile shows either the chooser or the selected guide. Topic and step are shareable in the URL hash, keyboard navigation moves focus to the new heading, and optional details stay collapsed. The public guide never reads guild APIs.
