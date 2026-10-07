import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import GuildFooter from '../guild-footer';
import './guide.css';

export const metadata:Metadata={title:'How to Use — Paragon',description:'A step-by-step guide to Paragon: phone installation, notifications, events, Participation Points and guild auctions.'};
export const dynamic='force-static';

const topics=[
 ['getting-started','Get Started'],['install','Add to Your Phone'],['notifications','Enable Notifications'],
 ['points','PP & Weekly Quest'],['join-events','Join an Event'],['host-events','Create & Finish Events'],
 ['auctions','Bid in Auctions'],['profile','Your Profile'],['administrators','For Administrators'],['troubleshooting','Troubleshooting'],
] as const;

function Steps({children}:{children:ReactNode}){return <ol className="pg-guide-steps" role="list">{children}</ol>;}
function Step({title,children}:{title:string;children:ReactNode}){return <li><strong>{title}</strong><div>{children}</div></li>;}
function Topic({id,title,children}:{id:string;title:string;children:ReactNode}){return <section className="pg-guide-section" id={id} aria-labelledby={id+'-title'}><h2 id={id+'-title'}>{title}</h2>{children}<a className="pg-guide-top" href="#guide-top">Back to top</a></section>;}

export default function HowToUse(){
 return <div id="paragon-design"><div className="pg-stage"><div className="pg-app pg-guide-app">
  <a className="pg-skip" href="#main-content">Skip to content</a>
  <header className="pg-masthead"><a className="pg-brand pg-guide-brand" href="/" aria-label="Paragon home"><img className="pg-crest" src="/branding/paragon-emblem.png" width={80} height={80} alt=""/><div><strong className="pg-guide-brand-name" translate="no">PARAGON</strong><span>ARTHION GUILD</span></div></a><a className="pg-button" href="/">Open Paragon</a></header>
  <main className="pg-guide-main" id="main-content">
   <header className="pg-guide-heading" id="guide-top"><h1>How to Use</h1><p>Set up your phone, join guild events and keep track of your PP.</p></header>
   <div className="pg-guide-layout">
    <aside className="pg-guide-contents"><nav aria-label="Guide contents"><h2>In this guide</h2><ol>{topics.map(([id,title])=><li key={id}><a href={'#'+id}>{title}</a></li>)}</ol></nav></aside>
    <article className="pg-guide-article" aria-label="Paragon user guide">
     <Topic id="getting-started" title="Get Started">
      <Steps>
       <Step title="Open Paragon"><p>Go to <a href="/">paragonguild.xyz</a> in your browser.</p></Step>
       <Step title="Sign in with Discord"><p>Select <b>Sign in with Discord</b> and authorize the sign-in using your guild Discord account.</p></Step>
       <Step title="Check your guild access"><p>Your account needs the guild’s <b>Member</b> role. Your Discord nickname and class roles are used for your profile. If your class is not assigned yet, it appears as <b>Unassigned</b>.</p></Step>
       <Step title="Start from Home"><p><b>Home</b> shows your weekly quest, current events and auctions. Use <b>Auctions</b> to bid, <b>Events</b> to join or host, and <b>Profile</b> to check your history. On a phone, these four destinations are at the bottom of the screen.</p></Step>
      </Steps>
      <p className="pg-guide-note">Guild access follows your current Discord roles. This guide can be read without signing in; your account and guild activity require Member access.</p>
     </Topic>

     <Topic id="install" title="Add Paragon to Your Phone">
      <p>Install directly from your browser. Paragon opens from its own Home Screen icon.</p>
      <div className="pg-guide-device-grid">
       <div className="pg-guide-device"><h3>iPhone · Safari</h3><Steps>
        <Step title="Open the website in Safari"><p>Visit <a href="/">paragonguild.xyz</a>. If you opened a link inside Discord, open it in Safari first.</p></Step>
        <Step title="Open Share"><p>Tap <b>Share</b> in Safari. Depending on your layout, open the page menu or <b>More</b> first, then select <b>Share</b>.</p></Step>
        <Step title="Add to Home Screen"><p>Scroll through the actions and tap <b>Add to Home Screen</b>. If it is missing, use <b>Edit Actions</b> to add it.</p></Step>
        <Step title="Add Paragon"><p>If you see <b>Open as Web App</b>, leave it turned on. Tap <b>Add</b>.</p></Step>
        <Step title="Open the new Paragon icon"><p>Launch Paragon from your Home Screen and sign in again if requested. Use this installed app when enabling iPhone notifications.</p></Step>
       </Steps><a className="pg-guide-source" href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios" target="_blank" rel="noopener noreferrer">Apple’s installation instructions (opens in a new tab)</a></div>
       <div className="pg-guide-device"><h3>Android · Chrome</h3><Steps>
        <Step title="Open the website in Chrome"><p>Visit <a href="/">paragonguild.xyz</a> in a normal browser tab.</p></Step>
        <Step title="Open the Chrome menu"><p>Tap <b>More</b> beside the address bar.</p></Step>
        <Step title="Install Paragon"><p>Choose <b>Install and create shortcut → Install</b>. On some Chrome versions, this is called <b>Install app</b> or <b>Add to Home screen</b>. Confirm the installation.</p></Step>
        <Step title="Launch from your phone"><p>Open the Paragon icon from your Home Screen or app list, then sign in with Discord if requested.</p></Step>
       </Steps><a className="pg-guide-source" href="https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en" target="_blank" rel="noopener noreferrer">Google’s installation instructions (opens in a new tab)</a></div>
      </div>
      <p className="pg-guide-note">On iPhone, device notifications require the Home Screen app on iOS 16.4 or later. <a href="https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/" target="_blank" rel="noopener noreferrer">Apple’s Web Push support details (opens in a new tab)</a>.</p>
     </Topic>

     <Topic id="notifications" title="Enable & Receive Notifications">
      <h3>Turn on notifications for this device</h3>
      <Steps>
       <Step title="Open Profile"><p>On iPhone, launch the installed Paragon app first. Sign in, then open <a href="/?view=profile"><b>Profile</b></a>.</p></Step>
       <Step title="Expand Notifications & App Settings"><p>Scroll down and open <b>Notifications & App Settings</b>.</p></Step>
       <Step title="Enable Device Notifications"><p>Tap <b>Enable Device Notifications</b>. When your phone or browser asks for permission, choose <b>Allow</b>. The button will change to <b>Disable Device Notifications</b> once enabled.</p></Step>
       <Step title="Choose new-event announcements"><p>Keep <b>Notify me when a new guild event is announced</b> checked to receive new-event alerts, including Help events that start immediately.</p></Step>
       <Step title="Send yourself a test"><p>Tap <b>Test Device Notification</b>. Check your notification centre or Lock Screen. If nothing arrives, follow the <a href="#troubleshooting">notification troubleshooting steps</a> below.</p></Step>
      </Steps>
      <h3>Set a reminder for an upcoming event</h3>
      <Steps>
       <Step title="Open the event"><p>Go to <a href="/?view=events"><b>Events</b></a> and open an event that has not started yet.</p></Step>
       <Step title="Choose Remind Me"><p>Select <b>15 minutes before</b>, <b>30 minutes before</b> or <b>1 hour before</b>, then tap <b>Save Reminder</b>. Choose a lead time that has not already passed.</p></Step>
       <Step title="Open the notification when it arrives"><p>With device notifications enabled, reminders can arrive while Paragon is closed. Tap an alert to open that event. Joining an event and setting a reminder are separate actions.</p></Step>
      </Steps>
      <p className="pg-guide-note">Help events start immediately, so use new-event alerts for them. Enable notifications separately on each device. Signing out stops push delivery to that device. Your phone’s notification permissions and Focus / Do Not Disturb settings also affect what you see.</p>
      <p>To stop announcements, uncheck the new-event preference. To stop all Paragon push notifications on this device, choose <b>Disable Device Notifications</b>.</p>
     </Topic>

     <Topic id="points" title="PP & Your Weekly Quest">
      <p>Participation Points (PP) are your guild balance for loot auctions. Earn PP from approved events, your weekly contribution and any administrator adjustments.</p>
      <Steps>
       <Step title="Check Weekly Quests on Home"><p>The <b>Guild Bank Contribution</b> quest asks for <b>500,000 Yang</b> each week.</p></Step>
       <Step title="Make the transfer in game"><p>Give the Yang to <b>GuildBanker</b> at the <b>CH-3 Blacksmith</b>.</p></Step>
       <Step title="Wait for the Deposit Log"><p>Your transfer needs to be recorded under your character’s name in the guild Deposit Log. Paragon checks the log every <b>5 minutes</b>.</p></Step>
       <Step title="Check the completed quest"><p>Once this week’s recorded payments reach 500,000 Yang, the Home card changes to <b>Completed</b>. The weekly reward is <b>20 PP</b>, credited once for that week.</p></Step>
       <Step title="Review your deposits"><p>Open <a href="/?view=profile"><b>Profile</b></a> to see <b>Total Deposited</b>, <b>This Week</b> and <b>Deposit History</b>. Payments are listed with their dates, highest amounts first.</p></Step>
      </Steps>
      <p className="pg-guide-note">The shared guild week resets on Monday in Europe/Istanbul. Event and auction times use your own device’s time zone.</p>
      <p>Imported historical contributions use <b>20 PP per 500,000 Yang</b>, including partial amounts rounded down to whole PP. For example, 1,000,000 Yang is 40 PP. Opening credits and the same week’s quest reward are counted only once. If your payment is missing or linked to the wrong character, ask an administrator to check the Deposit Log and character mapping.</p>
     </Topic>

     <Topic id="join-events" title="Join an Event">
      <Steps>
       <Step title="Find an event"><p>Open a card on <b>Home</b>, or use <a href="/?view=events"><b>Events → Schedule</b></a>. You can filter by event type.</p></Step>
       <Step title="Check where and when"><p>Read the map, <b>CH-1–CH-6</b>, start time, host and event details. Start times are shown in your device’s time zone.</p></Step>
       <Step title="Tap Join Event"><p>Your name appears in <b>Participants</b>. If you can no longer attend while sign-ups are open, tap <b>Leave Event</b>.</p></Step>
       <Step title="Attend in game"><p>Meet the group at the event’s map and channel. Signing up alone does not award PP.</p></Step>
       <Step title="Wait for attendance and approval"><p>The host confirms who attended and submits screenshot evidence. An administrator reviews the event and decides which members receive PP.</p></Step>
       <Step title="Check your reward"><p>Look in <b>Profile</b> for your event history and PP transaction after approval.</p></Step>
      </Steps>
      <div className="pg-guide-table-wrap"><table className="pg-guide-table"><caption>Event rewards and creation access</caption><thead><tr><th scope="col">Event Type</th><th scope="col">PP Each</th><th scope="col">Who Can Create</th></tr></thead><tbody>
       <tr><th scope="row">Help</th><td>25 PP</td><td>Any guild member · 2 per guild day</td></tr>
       <tr><th scope="row">PvE</th><td>35 PP</td><td>Members with event organizer access</td></tr>
       <tr><th scope="row">PvP</th><td>75 PP</td><td>Members with event organizer access</td></tr>
       <tr><th scope="row">World Boss</th><td>100 PP</td><td>Members with event organizer access</td></tr>
      </tbody></table></div>
      <p>After approval, the creator and approved participants earn the same reward for that event type. Administrators can exclude individual members from rewards.</p>
     </Topic>

     <Topic id="host-events" title="Create & Finish Events">
      <h3>Create a Help event</h3>
      <Steps>
       <Step title="Select Create Event"><p>Use <b>Create Event</b> on Home or in Events. Choose <b>Help</b> as the event type.</p></Step>
       <Step title="Describe your request"><p>Add an event name, choose a <b>Location</b> and a <b>Channel</b> from CH-1 to CH-6, and add useful details.</p></Step>
       <Step title="Choose a duration"><p>Help starts <b>Now</b>. Choose how many minutes you expect it to take, then tap <b>Start Help Event</b>. You can create at most two Help events per guild day, using Europe/Istanbul time.</p></Step>
      </Steps>
      <h3>Finish the event and confirm attendance</h3>
      <Steps>
       <Step title="Upload screenshot evidence"><p>Open your event, expand <b>Screenshot Evidence</b>, choose a PNG, JPEG or WebP image under <b>8 MB</b>, and tap <b>Upload Screenshot</b>. You can upload up to three screenshots.</p></Step>
       <Step title="End Event"><p>When the activity is finished, tap <b>End Event</b>. For Help, this button stays disabled until a screenshot is uploaded. The duration is an expected end time; you still need to finish the event yourself.</p></Step>
       <Step title="Select the people who actually attended"><p>Check their names under <b>Participants</b>. Use <b>Select All</b> if everyone attended, then uncheck any exceptions. Selections are saved together when you submit.</p></Step>
       <Step title="Submit for Approval"><p>Tap <b>Submit for Approval</b> in the event’s bottom action bar. The creator is included as an eligible reward recipient. Screenshot evidence is required for every event type before submission.</p></Step>
       <Step title="Wait for administrator review"><p>The event shows <b>Awaiting Approval</b>. PP is awarded only after review, to the recipients the administrator approves.</p></Step>
      </Steps>
      <p className="pg-guide-note">PvE, PvP and World Boss creation require event organizer access. Organizers choose a start date and time instead of a Help duration; the same evidence, attendance and approval steps apply.</p>
      <p>You can find your hosted events under <b>Events → My Events</b> or in <b>Profile</b>. If an event will not take place, open <b>Cancel This Event</b> and choose <b>Confirm Cancellation</b>. Cancelled events award no PP and a cancelled Help request still counts toward your daily limit.</p>
     </Topic>

     <Topic id="auctions" title="Bid in Auctions">
      <Steps>
       <Step title="Open an auction"><p>Go to <a href="/?view=auctions"><b>Auctions</b></a> and select an item. Check its screenshot, name, details and closing time.</p></Step>
       <Step title="Check the current bidding"><p>The item shows its <b>Highest bidder</b>, current bid, minimum next bid and bid history.</p></Step>
       <Step title="Place your total bid"><p>Tap <b>Place Bid</b>, enter a valid PP amount and choose <b>Confirm Bid</b>. Your bid must meet the displayed minimum and increment, and fit your available PP.</p></Step>
       <Step title="Raise a bid if needed"><p>If you are leading, use <b>Raise Bid</b>. Enter your new <b>total</b> bid: to raise 40 PP to 60 PP, enter 60, not 20.</p></Step>
       <Step title="Follow the result"><p>Your leading bids appear under <b>Your Leading Bids</b>. Once an auction is finalized, check <b>Auction History</b> for the winner and Profile for any PP deduction.</p></Step>
      </Steps>
      <div className="pg-guide-example"><h3>What happens to your PP?</h3><dl>
       <div><dt>Place a 40 PP bid with a 100 PP balance</dt><dd>Balance: 100 · Reserved: 40 · Available: 60</dd></div>
       <div><dt>Another player outbids you</dt><dd>Your 40 PP reservation is released. You are not charged.</dd></div>
       <div><dt>You win at 40 PP</dt><dd>40 PP is deducted once when the auction is finalized. Balance: 60 · Reserved: 0</dd></div>
      </dl><p>This example assumes you have no other reserved bids. A cancelled auction releases its reservation. Only the winner pays.</p></div>
     </Topic>

     <Topic id="profile" title="Read Your Profile">
      <Steps>
       <Step title="Open Profile"><p>Check your Discord character name and class, contribution totals, created events, joined events and attended event history.</p></Step>
       <Step title="Understand the three PP amounts"><p><b>Balance</b> is your total PP. <b>Reserved</b> is held for your leading auction bids. <b>Available</b> is Balance minus Reserved—the amount you can use for other bids.</p></Step>
       <Step title="Check Your Participation Points"><p>Filter your transaction history by event rewards, deposits, loot or manual adjustments. Positive entries add PP; negative entries deduct PP.</p></Step>
       <Step title="Keep notification settings up to date"><p>Use <b>Notifications & App Settings</b> to enable or disable this device and choose new-event alerts.</p></Step>
      </Steps>
     </Topic>

     <Topic id="administrators" title="For Administrators">
      <p>These controls appear only for administrator accounts. Event organizer access alone does not grant auction or PP administration.</p>
      <h3>Review event rewards</h3><Steps>
       <Step title="Open Events → Review"><p>Select an event marked <b>Awaiting Approval</b> and check the uploaded screenshots.</p></Step>
       <Step title="Choose reward recipients"><p>Under <b>Reward Recipients</b>, select the creator and confirmed participants you want to reward. Use <b>Select All</b> or <b>Clear All</b>, then adjust individual names.</p></Step>
       <Step title="Save the decision"><p>Tap <b>Approve Selected</b>. Unselected recipients receive no PP. To reject the whole event, enter a reason and use <b>Reject Event</b>.</p></Step>
      </Steps>
      <h3>Create or cancel an auction</h3><Steps>
       <Step title="Open Auctions → Manage Auctions"><p>Upload an item screenshot and enter its English name. Fill in the bidding settings, duration and any item details, then start the auction.</p></Step>
       <Step title="Check the live auction"><p>Confirm that its screenshot, name, minimum bid and closing time are correct. To stop an active auction, select <b>Cancel Auction</b> and confirm; the leading bidder’s reserved PP is released.</p></Step>
      </Steps>
      <h3>Add or remove PP</h3><Steps>
       <Step title="Open your account menu → Admin Panel"><p>Search the guild roster and select a player. Member-role accounts are included even if they have never signed in.</p></Step>
       <Step title="Choose Add PP or Remove PP"><p>Enter a positive amount and a clear <b>Reason</b>. Save the adjustment; removing PP also requires <b>Confirm Removal</b>.</p></Step>
       <Step title="Check the result"><p>The player’s history records the signed adjustment, reason and administrator. A deduction cannot spend reserved auction PP or make the available balance negative.</p></Step>
      </Steps>
     </Topic>

     <Topic id="troubleshooting" title="Troubleshooting">
      <div className="pg-guide-faq">
       <details><summary>I cannot sign in</summary><p>Use the Discord account that has the guild’s Member role. Ask a guild administrator to check the role if access is denied. If Discord is temporarily unavailable, wait briefly and try again. An unassigned class does not prevent Member access.</p></details>
       <details><summary>Add to Home Screen is missing on iPhone</summary><p>Open the site in Safari, not Discord’s built-in browser. Open Share, scroll to <b>Edit Actions</b> and add <b>Add to Home Screen</b>. Leave <b>Open as Web App</b> enabled if shown, then open the installed Paragon icon.</p></details>
       <details><summary>I enabled notifications but receive nothing</summary><p>First check that Paragon shows <b>Disable Device Notifications</b>, then use <b>Test Device Notification</b>. On iPhone, open the Home Screen app and check <b>Settings → Notifications → Paragon → Allow Notifications</b>. On Android, open Chrome’s site permissions for Paragon and set <b>Notifications → Allow</b>; also check your phone’s app notification permissions. Check Focus / Do Not Disturb and use a normal browsing session. Return to Paragon and enable the device again if permission was previously blocked.</p><p>For new-event alerts, keep the announcement checkbox enabled. For a reminder, choose it on an upcoming event and save it before the chosen lead time passes. Alerts follow your device’s notification settings, so a test may appear in the notification centre rather than as a banner.</p><a href="https://support.google.com/chrome/answer/3220216?co=GENIE.Platform%3DAndroid&hl=en" target="_blank" rel="noopener noreferrer">Chrome notification settings (opens in a new tab)</a></details>
       <details><summary>My contribution or PP is missing</summary><p>Check that the payment is in the Deposit Log under the correct character name and date. Allow the next five-minute check to complete. Profile shows the last checked time; if updates are delayed, the last verified data stays visible. Ask an administrator to check your character mapping if the payment still does not appear.</p><p>Event PP appears after administrator approval. The weekly reward and imported opening contributions are counted once, so a refresh does not grant the same points again.</p></details>
       <details><summary>My event is Awaiting Completion or Awaiting Approval</summary><p><b>Awaiting Completion</b> means the Help duration has elapsed; the host still needs to upload evidence, end the event and confirm attendance. <b>Awaiting Approval</b> means attendance has been submitted and an administrator needs to review it.</p></details>
       <details><summary>I cannot create a PvE, PvP or World Boss event</summary><p>These event types require the guild’s event organizer role. Ask an administrator to check your Discord access. Every guild member can create up to two Help events per guild day.</p></details>
       <details><summary>My bid was not accepted</summary><p>Check the latest minimum next bid, required increment, closing time and available PP. Another player may have raised the bid while you had the form open. Reopen the auction and use the latest amounts. PP reserved for other leading bids is not available to spend again.</p></details>
      </div>
     </Topic>
    </article>
   </div>
  </main>
  <GuildFooter standalone guide/>
 </div></div></div>;
}
