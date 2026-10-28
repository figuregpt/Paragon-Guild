/** Two quiet sine notes with soft envelopes; no audio file or external request. */
export class BossChime{
 private context:AudioContext|null=null;
 get ready(){return this.context?.state==='running';}
 async prepare(){try{if(!this.context){const Audio=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)return false;this.context=new Audio();}if(this.context.state==='suspended')await this.context.resume();return this.ready;}catch{return false;}}
 play(){const context=this.context;if(!context||context.state!=='running')return false;
  try{for(const [index,frequency]of [880,1174.66].entries()){const start=context.currentTime+index*.18,oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.035,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.23);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.25);}return true;}catch{return false;}}
 close(){void this.context?.close().catch(()=>{});this.context=null;}
}
