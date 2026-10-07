export default function GuildSignIn({ready,message}:{ready:boolean;message?:string}){
 return <div id="paragon-design"><div className="pg-stage"><div className="pg-app">
  <a className="pg-skip" href="#main-content">Skip to content</a>
  <header className="pg-masthead"><div className="pg-brand">
   <img className="pg-crest" src="/branding/paragon-emblem.png" width="80" height="80" alt="Paragon guild emblem"/>
   <div><h1>PARAGON</h1><span>ARTHION GUILD</span></div>
  </div></header>
  <main id="main-content" className="pg-login">
   <div className="pg-login-brand"><img src="/branding/paragon-emblem.png" width="380" height="380" alt="Paragon guild emblem"/></div>
   <section className="pg-window"><div className="pg-title"><h3>Sign In</h3></div><div className="pg-form">
    {message&&<p role="alert">{message}</p>}
    <p className="pg-dim">Guild members only.</p>
    {ready?<a className="pg-button pg-red" href="/auth/discord">Sign in with Discord</a>:<><button className="pg-button pg-red" disabled>Sign in with Discord</button><p className="pg-dim">Discord sign-in is currently unavailable.</p></>}
   </div></section>
  </main>
 </div></div></div>;
}
