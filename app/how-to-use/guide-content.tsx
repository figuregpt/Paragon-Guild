import type {ReactNode} from 'react';
import {EVENT_REWARDS,eventKindLabel} from '@/lib/event-types';
export type GuideStep={title:string;body:ReactNode;image:string;alt:string;width:number;height:number;path?:string;note?:ReactNode;extra?:ReactNode};
export type GuideTopic={id:string;title:string;subtitle:string;steps:GuideStep[]};
const screen=(image:string,alt:string,width:number,height:number)=>({image,alt,width,height});
const home=screen('home','Paragon Home with Weekly Quests and the bottom navigation',390,620);
const notifications=screen('notifications','Profile notification settings and Enable Device Notifications',358,413);
const join=screen('join-event','Help event: location, CH-3, 10 PP and Join Event',358,742);
const help=screen('create-help','Create Help: map, channel, duration and Start Help Event',358,853);
const evidence=screen('evidence','Screenshot Evidence with an example image and upload control',324,453);
const attendance=screen('attendance','Attendance checkboxes, Select All and Submit for Approval',358,755);
const points=screen('points','Profile showing balance, available PP, reserved PP and history',358,554);
const rewards=<details className="pg-guide-extra"><summary>PP rewards</summary><dl>{Object.entries(EVENT_REWARDS).map(([kind,pp])=><div key={kind}><dt>{eventKindLabel(kind)}</dt><dd>{pp} PP</dd></div>)}<div><dt>Custom</dt><dd>Chosen by host</dd></div></dl><p>New events use these rewards. Existing events keep their original PP.</p></details>;
export const guideTopics:GuideTopic[]=[
 {id:'phone',title:'Add to iPhone',subtitle:'Safari → Home Screen',steps:[
  {title:'Open Paragon in Safari',body:<>Visit <b>paragonguild.xyz</b>. If you opened the link in Discord, switch to Safari.</>,...home,path:'iPhone · Safari'},
  {title:'Add it to your Home Screen',body:<>Tap <b>Share</b> (or <b>menu → Share</b>) → <b>Add to Home Screen</b> → <b>Add</b>. Keep <b>Open as Web App</b> on if shown.</>,...home,note:<a href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios" target="_blank" rel="noopener noreferrer">See Apple’s illustrated steps ↗</a>},
  {title:'Open the Paragon icon',body:<>Launch it from your Home Screen and choose <b>Sign in with Discord</b>. Next, turn on notifications.</>,...home,note:<>Your Discord account needs the guild’s <b>Member</b> role.</>,extra:<a className="pg-guide-related" href="#notifications">Next guide: Notifications →</a>}
 ]},
 {id:'notifications',title:'Get notifications',subtitle:'New events & reminders',steps:[
  {title:'Open notification settings',body:<>Tap <b>Profile</b>, then <b>Notifications & App Settings</b>.</>,...notifications,path:'Profile → Notifications & App Settings',note:<>On iPhone, use the Home Screen app. iOS 16.4 or later is required.</>},
  {title:'Enable alerts & test them',body:<>Tap <b>Enable Device Notifications</b> → <b>Allow</b>. Keep new-event alerts checked. Tap <b>Test Device Notification</b> and check your notifications.</>,...notifications,note:<>Enable notifications on each device. Signing out stops push on that device.</>},
  {title:'Set an event reminder',body:<>Open an upcoming event → <b>Remind Me</b>. Choose <b>15, 30 or 60 minutes before</b> → <b>Save Reminder</b>.</>,...screen('reminder','Event Reminder with time choices and Save Reminder',358,354),note:<>Help starts now, so Help requests use new-event alerts.</>},
  {title:'Tap the notification to join',body:<>The alert opens the event. Tap <b>Join Event</b> to sign up.</>,...join,extra:<details className="pg-guide-extra"><summary>No notification?</summary><p>On iPhone: Settings → Notifications → Paragon → Allow Notifications. Check Focus / Do Not Disturb, then try the test again.</p></details>}
 ]},
 {id:'events',title:'Join an event',subtitle:'Join → attend → earn PP',steps:[
  {title:'Choose an event',body:<>Open <b>Events</b> and tap an event. Check its map, CH and start time. Times follow your device.</>,...join,path:'Events → Open an event'},
  {title:'Tap Join Event',body:<>Attend in game at the shown location. If you cannot go, tap <b>Leave Event</b>.</>,...join,note:<>Joining alone does not earn PP.</>},
  {title:'Wait for your PP',body:<>The host confirms attendance and sends proof. After admin approval, your reward appears in <b>Profile</b>.</>,...points,note:<>The creator and approved participants get the same PP.</>,extra:rewards}
 ]},
 {id:'help',title:'Create & finish Help',subtitle:'10 PP · up to 2 per day',steps:[
  {title:'Create a Help request',body:<>Open <b>Events</b> → <b>Create Event</b>. Choose <b>Help</b>, enter the name, map, CH and duration → <b>Start Help Event</b>.</>,...help,path:'Events → Create Event → Help',note:<>Starts immediately. Maximum 2 Help events per guild day, using Istanbul time.</>},
  {title:'Upload your screenshot',body:<>Open your event → <b>Screenshot Evidence</b>. Choose your screenshot → <b>Upload Screenshot</b>.</>,...evidence,note:<>PNG, JPEG or WebP, up to 8 MB each. Maximum 3 screenshots.</>},
  {title:'Tap End Event',body:<>Finish the Help request when you are done. A screenshot is required before this button works.</>,...evidence,note:<>The chosen duration does not end the event automatically.</>},
  {title:'Choose who attended',body:<>Tap <b>Select All</b>, then uncheck anyone who did not attend.</>,...attendance},
  {title:'Submit for Approval',body:<>Tap <b>Submit for Approval</b>. An admin checks the proof and decides who receives PP.</>,...attendance,note:<>The creator and approved participants earn <b>10 PP each</b>.</>,extra:<details className="pg-guide-extra"><summary>Find or cancel your event</summary><p>Open My Events or Profile. To cancel: Cancel This Event → Confirm Cancellation. Cancelled events award no PP and still count toward the daily Help limit.</p></details>}
 ]},
 {id:'experienced',title:'Create other events',subtitle:'Experienced role required',steps:[
  {title:'Schedule Demon Tower',body:<>Choose <b>Demon Tower</b>. Enter a name, CH and start time → <b>Schedule Event</b>. The map is already selected.</>,...screen('demon-tower','Demon Tower form with 10 PP, channel and a start time only',358,798),path:'Events → Create Event → Demon Tower',note:<>Requires <b>Experienced</b>. Reward: <b>10 PP</b>. No end time; finish with <b>End Event</b>.</>},
  {title:'Make a Custom event',body:<>Choose <b>Custom</b>. Set the title, CH, PP and start time. Select a map, or choose <b>Custom…</b> and type a location.</>,...screen('custom-event','Custom form with title, CH-6, location, 41 PP and start time',358,983),note:<>Tap <b>Schedule Event</b>. Your chosen PP applies equally to the creator and approved participants.</>},
  {title:'Choose another event type',body:<>You can also choose <b>PvE</b>, <b>Open PvP</b>, <b>Guild War</b> or <b>World Boss</b>. Set the name, location, CH and start time.</>,...screen('pve-event','PvE form showing 35 PP, Spider Dungeon 2, CH-3 and start time',358,798),extra:rewards},
  {title:'End, confirm & submit',body:<>After the start time, tap <b>End Event</b>. Upload proof, select attendance and tap <b>Submit for Approval</b>.</>,...attendance,note:<>These events end manually. Proof is required before submission.</>,extra:<a className="pg-guide-related" href="#help/2">See the screenshot & attendance steps →</a>}
 ]},
 {id:'auctions',title:'Bid in an auction',subtitle:'Only the winner pays',steps:[
  {title:'Pick an item',body:<>Open <b>Auctions</b>. Check the item screenshot, highest bidder and time left → <b>Place Bid</b>.</>,...screen('bid','Place a Bid showing the next minimum and Confirm Bid',358,394),path:'Auctions → Place Bid'},
  {title:'Enter your total bid',body:<>Enter the full amount → <b>Confirm Bid</b>. To raise a bid from 40 to 60 PP, enter <b>60</b>.</>,...screen('bid','Total bid input and Confirm Bid',358,394),note:<>A leading bid reserves PP. Being outbid releases it.</>},
  {title:'Check the result',body:<>Open <b>Auction History</b>. Only the winner’s PP is deducted when the auction is finalized.</>,...points,extra:<details className="pg-guide-extra"><summary>How reserved PP works</summary><p>100 PP balance − 40 PP leading bid = 60 PP available. Win at 40 PP? Your balance becomes 60 PP. Lose? Your reservation is released.</p></details>}
 ]},
 {id:'points',title:'PP & weekly contribution',subtitle:'Balance, deposits & weekly quest',steps:[
  {title:'Give 500,000 Yang in game',body:<>Give it to <b>GuildBanker</b> at the <b>CH-3 Blacksmith</b>. The payment must be added to the Deposit Log.</>,...screen('weekly-quest','Weekly contribution marked Completed after 500,000 Yang',358,340),path:'Weekly Quest · in game'},
  {title:'Wait for Completed',body:<>The site checks the log every <b>5 minutes</b>. Your Home card becomes <b>Completed</b> and awards <b>20 PP</b> once that week.</>,...screen('weekly-quest','Automatic weekly contribution marked Completed',358,340),note:<>No manual submission. The guild week resets on Monday in Istanbul time.</>},
  {title:'Check your profile',body:<>Open <b>Profile</b>. See your PP history, available balance and total Yang deposits. <b>Deposit History</b> lists the largest amounts first.</>,...points,note:<>Available PP = balance − reserved PP.</>,extra:<details className="pg-guide-extra"><summary>Missing an older payment?</summary><p>Historical deposits earn 20 PP per 500,000 Yang, rounded down to whole PP. Ask an admin to check your character name in the log.</p></details>}
 ]},
 {id:'administrators',title:'Admin tools',subtitle:'Approve PP & manage auctions',steps:[
  {title:'Approve event rewards',body:<>Open <b>Events</b> → <b>Review</b>. Check the proof, uncheck anyone who should get no PP, then tap <b>Approve Selected</b>.</>,...screen('review','Admin review with individual creator and participant choices',358,860),path:'Administrators only',note:<>The creator can also be excluded. Rejecting the whole event requires a reason.</>},
  {title:'Add or remove PP',body:<>Account menu → <b>Admin Panel</b>. Select a player, choose <b>Add PP</b> or <b>Remove PP</b>, enter the amount and reason → save.</>,...screen('admin-points','PP adjustment with player, action, amount and reason',324,609),note:<>Removal needs <b>Confirm Removal</b>. Reserved PP cannot be deducted.</>},
  {title:'Start an auction',body:<>Open <b>Auctions</b> → <b>Manage Auctions</b>. Add an item screenshot and name, set the minimum, increment and duration → <b>Start Auction</b>.</>,...screen('create-auction','Auction creation with screenshot, name and bidding settings',356,708),note:<>Cancelling an auction releases its reserved PP.</>}
 ]}
];
