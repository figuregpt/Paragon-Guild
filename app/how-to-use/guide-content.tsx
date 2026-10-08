import {t,currentLanguage} from '@/lib/i18n';
import type {ReactNode} from 'react';
import {EVENT_REWARDS,eventKindLabel} from '@/lib/event-types';
export type GuideStep={title:string;body:ReactNode;image:string;alt:string;width:number;height:number;path?:string;note?:ReactNode;extra?:ReactNode};
export type GuideTopic={id:string;title:string;subtitle:string;steps:GuideStep[]};
function rich(text:string){return t(text).split(/(<b>.*?<\/b>)/g).map((part,i)=>part.startsWith('<b>')?<b key={i}>{part.slice(3,-4)}</b>:part);}
export function getGuideTopics():GuideTopic[]{
const sizes:Record<string,Record<string,number>>={tr:{'weekly-quest':299,'create-help':860,'create-auction':727},el:{'notifications':434,'join-event':773,'create-help':860,'attendance':765,'bid':415,'create-auction':727,'custom-event':998,'demon-tower':813,'pve-event':812}};
const screen=(image:string,alt:string,width:number,height:number)=>({image,alt,width,height:sizes[currentLanguage()]?.[image]??height});
const home=screen('home',t("Paragon Home with Weekly Quests and the bottom navigation"),390,620);
const notifications=screen('notifications',t("Profile notification settings and Enable Device Notifications"),358,413);
const join=screen('join-event',t("Help event: location, CH-3, 10 PP and Join Event"),358,742);
const help=screen('create-help',t("Create Help: map, channel, duration and Start Help Event"),358,853);
const evidence=screen('evidence',t("Screenshot Evidence with an example image and upload control"),324,453);
const attendance=screen('attendance',t("Attendance checkboxes, Select All and Submit for Approval"),358,755);
const points=screen('points',t("Profile showing balance, available PP, reserved PP and history"),358,554);
const rewards=<details className="pg-guide-extra"><summary>{t("PP rewards")}</summary><dl>{Object.entries(EVENT_REWARDS).map(([kind,pp])=><div key={kind}><dt>{t(eventKindLabel(kind))}</dt><dd>{pp} PP</dd></div>)}<div><dt>{t('Custom')}</dt><dd>{t("Chosen by host")}</dd></div></dl><p>{t("New events use these rewards. Existing events keep their original PP.")}</p></details>;
return [
 {id:'phone',title:t("Add to iPhone"),subtitle:t("Safari → Home Screen"),steps:[
  {title:t("Open Paragon in Safari"),body:rich("Visit <b>paragonguild.xyz</b>. If you opened the link in Discord, switch to Safari."),...home,path:t("iPhone · Safari")},
  {title:t("Add it to your Home Screen"),body:rich("Tap <b>Share</b> (or <b>menu → Share</b>) → <b>Add to Home Screen</b> → <b>Add</b>. Keep <b>Open as Web App</b> on if shown."),...home,note:<a href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios" target="_blank" rel="noopener noreferrer">{t("See Apple’s illustrated steps ↗")}</a>},
  {title:t("Open the Paragon icon"),body:rich("Launch it from your Home Screen and choose <b>Sign in with Discord</b>. Next, turn on notifications."),...home,note:rich("Your Discord account needs the guild’s <b>Member</b> role."),extra:<a className="pg-guide-related" href="#notifications">{t("Next guide: Notifications →")}</a>}
 ]},
 {id:'notifications',title:t("Get notifications"),subtitle:t("New events & reminders"),steps:[
  {title:t("Open notification settings"),body:rich("Tap <b>Profile</b>, then <b>Notifications & App Settings</b>."),...notifications,path:t("Profile → Notifications & App Settings"),note:rich("On iPhone, use the Home Screen app. iOS 16.4 or later is required.")},
  {title:t("Enable alerts & test them"),body:rich("Tap <b>Enable Device Notifications</b> → <b>Allow</b>. Keep new-event alerts checked. Tap <b>Test Device Notification</b> and check your notifications."),...notifications,note:rich("Enable notifications on each device. Signing out stops push on that device.")},
  {title:t("Set an event reminder"),body:rich("Open an upcoming event → <b>Remind Me</b>. Choose <b>15, 30 or 60 minutes before</b> → <b>Save Reminder</b>."),...screen('reminder',t("Event Reminder with time choices and Save Reminder"),358,354),note:rich("Help starts now, so Help requests use new-event alerts.")},
  {title:t("Tap the notification to join"),body:rich("The alert opens the event. Tap <b>Join Event</b> to sign up."),...join,extra:<details className="pg-guide-extra"><summary>{t("No notification?")}</summary><p>{t("On iPhone: Settings → Notifications → Paragon → Allow Notifications. Check Focus / Do Not Disturb, then try the test again.")}</p></details>}
 ]},
 {id:'events',title:t("Join an event"),subtitle:t("Join → attend → earn PP"),steps:[
  {title:t("Choose an event"),body:rich("Open <b>Events</b> and tap an event. Check its map, CH and start time. Times follow your device."),...join,path:t("Events → Open an event")},
  {title:t("Tap Join Event"),body:rich("Attend in game at the shown location. If you cannot go, tap <b>Leave Event</b>."),...join,note:rich("Joining alone does not earn PP.")},
  {title:t("Wait for your PP"),body:rich("The host confirms attendance and sends proof. After admin approval, your reward appears in <b>Profile</b>."),...points,note:rich("The creator and approved participants get the same PP."),extra:rewards}
 ]},
 {id:'help',title:t("Create & finish Help"),subtitle:t("10 PP · up to 2 per day"),steps:[
  {title:t("Create a Help request"),body:rich("Open <b>Events</b> → <b>Create Event</b>. Choose <b>Help</b>, enter the name, map, CH and duration → <b>Start Help Event</b>."),...help,path:t("Events → Create Event → Help"),note:rich("Starts immediately. Maximum 2 Help events per guild day, using Istanbul time.")},
  {title:t("Upload your screenshot"),body:rich("Open your event → <b>Screenshot Evidence</b>. Choose your screenshot → <b>Upload Screenshot</b>."),...evidence,note:rich("PNG, JPEG or WebP, up to 8 MB each. Maximum 3 screenshots.")},
  {title:t("Tap End Event"),body:rich("Finish the Help request when you are done. A screenshot is required before this button works."),...evidence,note:rich("The chosen duration does not end the event automatically.")},
  {title:t("Choose who attended"),body:rich("Tap <b>Select All</b>, then uncheck anyone who did not attend."),...attendance},
  {title:t("Submit for Approval"),body:rich("Tap <b>Submit for Approval</b>. An admin checks the proof and decides who receives PP."),...attendance,note:rich("The creator and approved participants earn <b>10 PP each</b>."),extra:<details className="pg-guide-extra"><summary>{t("Find or cancel your event")}</summary><p>{t("Open My Events or Profile. To cancel: Cancel This Event → Confirm Cancellation. Cancelled events award no PP and still count toward the daily Help limit.")}</p></details>}
 ]},
 {id:'experienced',title:t("Create other events"),subtitle:t("Experienced role required"),steps:[
  {title:t("Schedule Demon Tower"),body:rich("Choose <b>Demon Tower</b>. Enter a name, CH and start time → <b>Schedule Event</b>. The map is already selected."),...screen('demon-tower',t("Demon Tower form with 10 PP, channel and a start time only"),358,798),path:t("Events → Create Event → Demon Tower"),note:rich("Requires <b>Experienced</b>. Reward: <b>10 PP</b>. No end time; finish with <b>End Event</b>.")},
  {title:t("Make a Custom event"),body:rich("Choose <b>Custom</b>. Set the title, CH, PP and start time. Select a map, or choose <b>Custom…</b> and type a location."),...screen('custom-event',t("Custom form with title, CH-6, location, 41 PP and start time"),358,983),note:rich("Tap <b>Schedule Event</b>. Your chosen PP applies equally to the creator and approved participants.")},
  {title:t("Choose another event type"),body:rich("You can also choose <b>PvE</b>, <b>Open PvP</b>, <b>Guild War</b> or <b>World Boss</b>. Set the name, location, CH and start time."),...screen('pve-event',t("PvE form showing 35 PP, Spider Dungeon 2, CH-3 and start time"),358,798),extra:rewards},
  {title:t("End, confirm & submit"),body:rich("After the start time, tap <b>End Event</b>. Upload proof, select attendance and tap <b>Submit for Approval</b>."),...attendance,note:rich("These events end manually. Proof is required before submission."),extra:<a className="pg-guide-related" href="#help/2">{t("See the screenshot & attendance steps →")}</a>}
 ]},
 {id:'auctions',title:t("Bid in an auction"),subtitle:t("Only the winner pays"),steps:[
  {title:t("Pick an item"),body:rich("Open <b>Auctions</b>. Check the item screenshot, highest bidder and time left → <b>Place Bid</b>."),...screen('bid',t("Place a Bid showing the next minimum and Confirm Bid"),358,394),path:t("Auctions → Place Bid")},
  {title:t("Enter your total bid"),body:rich("Enter the full amount → <b>Confirm Bid</b>. To raise a bid from 40 to 60 PP, enter <b>60</b>."),...screen('bid',t("Total bid input and Confirm Bid"),358,394),note:rich("A leading bid reserves PP. Being outbid releases it.")},
  {title:t("Check the result"),body:rich("Open <b>Auction History</b>. Only the winner’s PP is deducted when the auction is finalized."),...points,extra:<details className="pg-guide-extra"><summary>{t("How reserved PP works")}</summary><p>{t("100 PP balance − 40 PP leading bid = 60 PP available. Win at 40 PP? Your balance becomes 60 PP. Lose? Your reservation is released.")}</p></details>}
 ]},
 {id:'points',title:t("PP & weekly contribution"),subtitle:t("Balance, deposits & weekly quest"),steps:[
  {title:t("Give 500,000 Yang in game"),body:rich("Give it to <b>GuildBanker</b> at the <b>CH-3 Blacksmith</b>. The payment must be added to the Deposit Log."),...screen('weekly-quest',t("Weekly contribution marked Completed after 500,000 Yang"),358,340),path:t("Weekly Quest · in game")},
  {title:t("Wait for Completed"),body:rich("The site checks the log every <b>5 minutes</b>. Your Home card becomes <b>Completed</b> and awards <b>20 PP</b> once that week."),...screen('weekly-quest',t("Automatic weekly contribution marked Completed"),358,340),note:rich("No manual submission. The guild week resets on Monday in Istanbul time.")},
  {title:t("Check your profile"),body:rich("Open <b>Profile</b>. See your PP history, available balance and total Yang deposits. <b>Deposit History</b> lists the largest amounts first."),...points,note:rich("Available PP = balance − reserved PP."),extra:<details className="pg-guide-extra"><summary>{t("Missing an older payment?")}</summary><p>{t("Historical deposits earn 20 PP per 500,000 Yang, rounded down to whole PP. Ask an admin to check your character name in the log.")}</p></details>}
 ]},
 {id:'administrators',title:t("Admin tools"),subtitle:t("Approve PP & manage auctions"),steps:[
  {title:t("Approve event rewards"),body:rich("Open <b>Events</b> → <b>Review</b>. Check the proof, uncheck anyone who should get no PP, then tap <b>Approve Selected</b>."),...screen('review',t("Admin review with individual creator and participant choices"),358,860),path:t("Administrators only"),note:rich("The creator can also be excluded. Rejecting the whole event requires a reason.")},
  {title:t("Add or remove PP"),body:rich("Account menu → <b>Admin Panel</b>. Select a player, choose <b>Add PP</b> or <b>Remove PP</b>, enter the amount and reason → save."),...screen('admin-points',t("PP adjustment with player, action, amount and reason"),324,609),note:rich("Removal needs <b>Confirm Removal</b>. Reserved PP cannot be deducted.")},
  {title:t("Start an auction"),body:rich("Open <b>Auctions</b> → <b>Manage Auctions</b>. Add an item screenshot and name, set the minimum, increment and duration → <b>Start Auction</b>."),...screen('create-auction',t("Auction creation with screenshot, name and bidding settings"),356,708),note:rich("Cancelling an auction releases its reserved PP.")}
 ]}
] satisfies GuideTopic[];
}
