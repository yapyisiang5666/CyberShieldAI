const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let tab="text",imageData="",imageName="";
const getKey=()=>sessionStorage.getItem("cs_key")||"",getModel=()=>sessionStorage.getItem("cs_model")||"gpt-4.1-mini";
function keyStatus(){const on=!!getKey();$("#keyDot").classList.toggle("on",on);$("#keyText").textContent=on?"AI Connected":"Connect AI"}
function openModal(){ $("#apiKey").value=getKey();$("#model").value=getModel();$("#modalMsg").textContent="";$("#modal").classList.remove("hidden")}
$("#openKey").onclick=openModal;$("#close").onclick=()=>$("#modal").classList.add("hidden");$("#modal").onclick=e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden")};
$("#showKey").onclick=()=>{const i=$("#apiKey"),show=i.type==="password";i.type=show?"text":"password";$("#showKey").textContent=show?"Hide":"Show"};
$("#saveKey").onclick=()=>{const k=$("#apiKey").value.trim();if(!k.startsWith("sk-")){ $("#modalMsg").textContent="Enter a valid key beginning with sk-.";return}sessionStorage.setItem("cs_key",k);sessionStorage.setItem("cs_model",$("#model").value);keyStatus();$("#modalMsg").style.color="#287b15";$("#modalMsg").textContent="Connected for this session.";setTimeout(()=>$("#modal").classList.add("hidden"),650)};
$("#deleteKey").onclick=()=>{sessionStorage.removeItem("cs_key");sessionStorage.removeItem("cs_model");$("#apiKey").value="";keyStatus();$("#modalMsg").textContent="Session key removed."};
$("#message").oninput=e=>$("#count").textContent=e.target.value.length;
$("#sample").onclick=()=>{const s="URGENT: We are calling from your bank. Your account will be frozen today. Click http://secure-bank-check.example and enter your card number, password and OTP immediately.";$("#message").value=s;$("#count").textContent=s.length};
$$(".tab").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;$$(".tab").forEach(x=>x.classList.toggle("active",x===b));$("#textPanel").classList.toggle("active",tab==="text");$("#imagePanel").classList.toggle("active",tab==="image")});
const drop=$("#drop"),file=$("#file");
$("#choose").onclick=e=>{e.stopPropagation();file.click()};drop.onclick=()=>file.click();drop.onkeydown=e=>{if(["Enter"," "].includes(e.key))file.click()};file.onchange=()=>file.files[0]&&handleImage(file.files[0]);
["dragenter","dragover"].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add("drag")}));
["dragleave","drop"].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove("drag")}));
drop.ondrop=e=>{const f=[...e.dataTransfer.files].find(x=>x.type.startsWith("image/"));if(f)handleImage(f)};
document.addEventListener("paste",e=>{const item=[...e.clipboardData.items].find(x=>x.type.startsWith("image/"));if(!item)return;tab="image";$$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.tab==="image"));$("#textPanel").classList.remove("active");$("#imagePanel").classList.add("active");handleImage(item.getAsFile())});
function handleImage(f){if(!["image/png","image/jpeg","image/webp"].includes(f.type))return alert("Use PNG, JPG or WEBP.");if(f.size>8*1024*1024)return alert("Image must be below 8 MB.");const r=new FileReader();r.onload=()=>{imageData=r.result;imageName=f.name||"pasted-image.png";$("#preview").src=imageData;drop.classList.add("hidden");$("#previewWrap").classList.remove("hidden")};r.readAsDataURL(f)}
$("#remove").onclick=()=>{imageData="";file.value="";$("#previewWrap").classList.add("hidden");drop.classList.remove("hidden")};
function state(s){$("#empty").classList.toggle("hidden",s!=="empty");$("#loading").classList.toggle("hidden",s!=="loading");$("#report").classList.toggle("hidden",s!=="report")}
function outputText(d){if(typeof d.output_text==="string")return d.output_text;return(d.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text).join("\n")}
function clean(t){return t.trim().replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/\s*```$/,"")}
function safeReport(r){return{verdict:String(r.verdict||"Needs Review"),risk_score:Math.max(0,Math.min(100,Number(r.risk_score)||0)),confidence:Math.max(0,Math.min(100,Number(r.confidence)||0)),scam_type:String(r.scam_type||"Unclear"),warning_signals:(Array.isArray(r.warning_signals)?r.warning_signals:[]).slice(0,6),recommendation:String(r.recommendation||"Verify independently before acting."),explanation:String(r.explanation||"The content should be checked carefully.")}}
$("#analyse").onclick=async()=>{if(!getKey()){openModal();$("#modalMsg").textContent="Connect an API key first.";return}if(tab==="text"&&!$("#message").value.trim())return alert("Paste a message first.");if(tab==="image"&&!imageData)return alert("Upload or paste a screenshot first.");
const btn=$("#analyse");btn.disabled=true;btn.querySelector("span").textContent="Analysing…";state("loading");
const instructions=`You are the safety analysis engine for a secondary-school cybersecurity project. Analyse the supplied message or screenshot for scam, phishing, impersonation, unsafe links, malware/social-engineering, payment, credential, OTP, privacy and identity-theft risks. Do not claim certainty. Do not identify a real person. Redact passwords, OTPs, bank details, identity numbers, phone numbers and email addresses. Recommend independent verification. Return ONLY valid JSON: {"verdict":"Low Risk | Caution | High Risk | Critical Risk","risk_score":0,"confidence":0,"scam_type":"short category","warning_signals":[{"title":"short signal","evidence":"brief redacted explanation"}],"recommendation":"clear next steps","explanation":"simple student-friendly explanation"}`;
const content=[{type:"input_text",text:tab==="text"?`Analyse this content:\n\n${$("#message").value.trim()}`:`Analyse this screenshot named ${imageName}. Read visible text and context carefully.`}];if(tab==="image")content.push({type:"input_image",image_url:imageData,detail:"high"});
try{const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${getKey()}`,"Content-Type":"application/json"},body:JSON.stringify({model:getModel(),instructions,input:[{role:"user",content}],temperature:.2,max_output_tokens:1100})});const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||`Request failed (${res.status})`);const text=outputText(data);if(!text)throw new Error("Empty AI response.");render(safeReport(JSON.parse(clean(text))))}catch(err){console.error(err);state("empty");$("#empty h3").textContent="Analysis could not be completed";$("#empty p").textContent=err.message+" Check the key, model access, billing limit, network and image size."}finally{btn.disabled=false;btn.querySelector("span").textContent="Analyse with AI"}};
function render(r){let colour="#68d51f";if(r.risk_score>=75)colour="#ef4444";else if(r.risk_score>=45)colour="#f59e0b";else if(r.risk_score>=20)colour="#38a7ff";$("#verdict").textContent=r.verdict;$("#verdict").style.color=colour;$("#score").textContent=r.risk_score;$("#ring").style.background=`conic-gradient(${colour} ${r.risk_score*3.6}deg,#26354a ${r.risk_score*3.6}deg)`;$("#bar").style.width=r.confidence+"%";$("#confidence").textContent=r.confidence+"%";const box=$("#signals");box.innerHTML="";const items=r.warning_signals.length?r.warning_signals:[{title:"No strong signal found",evidence:"Continue to verify the sender independently."}];items.forEach(s=>{const d=document.createElement("div");d.className="signal";const b=document.createElement("b");b.textContent="⚠ "+String(s.title||"Warning sign");const p=document.createElement("div");p.textContent=String(s.evidence||"Requires verification.");d.append(b,p);box.appendChild(d)});$("#recommendation").textContent=r.recommendation;$("#explanation").textContent=r.scam_type+": "+r.explanation;state("report")}
$$(".check").forEach(c=>c.onchange=()=>{const all=$$(".check"),n=all.filter(x=>x.checked).length,p=Math.round(n/all.length*100);$("#progressText").textContent=p+"%";$("#progressBar").style.width=p+"%";$("#progressMsg").textContent=p===100?"Excellent—keep these habits consistent.":p>=60?"Good progress. Strengthen the remaining habits.":"Build these habits one step at a time."});
$$(".quiz button").forEach(b=>b.onclick=()=>{const f=$("#feedback");f.className="";if(b.dataset.answer==="scam"){f.classList.add("good");f.textContent="Correct. The unexpected prize, upfront fee and time pressure are strong scam signals."}else if(b.dataset.answer==="verify"){f.classList.add("warn");f.textContent="Verification is wise, but use an official channel. This example is highly likely to be a scam."}else{f.classList.add("bad");f.textContent="Be careful. Real prizes should not pressure you to pay an unexpected fee immediately."}});
keyStatus();state("empty");

// ===== AI SCAM ESCAPE ROOM =====
const escapeRooms = [
  {
    category:"BANK IMPERSONATION", avatar:"JB", sender:"JuneBank Security",
    meta:"Unknown mobile number · now",
    messages:[
      `Dear customer, we detected an unusual login from another state.`,
      `Your JuneBank account will be <span data-clue="urgency">blocked within 30 minutes</span>. Verify at <span data-clue="fake-link">junebank-secure-login.example</span>.`,
      `For confirmation, reply with your <span data-clue="otp">6-digit OTP</span>.`
    ],
    clues:{
      urgency:["Artificial urgency","The sender pressures the victim to act before thinking."],
      "fake-link":["Look-alike website","The address is not an official JuneBank domain."],
      otp:["OTP request","A legitimate bank should never ask for an OTP through chat."]
    },
    question:"How should you respond to the JuneBank message?",
    choices:[
      ["A","Open the link","Verify before the deadline",false],
      ["B","Reply with OTP","Prove that the account is yours",false],
      ["C","Use official JuneBank contact","Close the message and verify independently",true],
      ["D","Forward it to friends","Ask everyone whether it looks real",false]
    ],
    success:"Excellent. You avoided the message link and used a separately verified JuneBank channel. This prevents the scammer from controlling the verification process.",
    fail:"That action gives the sender more control. Never use the link or contact details inside a suspicious message, and never share an OTP.",
    xp:120
  },
  {
    category:"PARCEL PHISHING", avatar:"PX", sender:"ParcelX Delivery",
    meta:"SMS gateway · 2 minutes ago",
    messages:[
      `We attempted to deliver your parcel but the address was incomplete.`,
      `Pay a <span data-clue="small-fee">RM2 redelivery fee</span> at <span data-clue="short-link">bit.ly/parcel-redelivery</span>.`,
      `Your parcel will be <span data-clue="threat">destroyed tonight</span> if payment is not completed.`
    ],
    clues:{
      "small-fee":["Small payment trap","A tiny fee is used to make the request feel harmless."],
      "short-link":["Hidden destination","A shortened link hides the real website address."],
      threat:["Threat and pressure","The extreme deadline is designed to stop careful checking."]
    },
    question:"What is the safest next step?",
    choices:[
      ["A","Pay RM2","The amount is very small",false],
      ["B","Open the official delivery app","Check tracking independently",true],
      ["C","Reply with your address","Help the courier find you",false],
      ["D","Install the attached app","Track the parcel faster",false]
    ],
    success:"Correct. Opening the official delivery app independently lets you check whether a real parcel and fee exist without trusting the suspicious link.",
    fail:"The small amount is part of the trap. The fake payment page may steal card details or install malware.",
    xp:140
  },
  {
    category:"JOB ADVANCE-FEE SCAM", avatar:"HR", sender:"Global Remote Careers",
    meta:"New contact · today",
    messages:[
      `Congratulations! You were selected for a high-paying remote data-entry job.`,
      `No interview is required. Earn <span data-clue="reward">RM800 per day</span> from home.`,
      `Purchase a <span data-clue="fee">RM180 training package</span> in the next <span data-clue="deadline">20 minutes</span> to secure your position.`
    ],
    clues:{
      reward:["Unrealistic reward","The salary is unusually high for simple work and no interview."],
      fee:["Advance payment","Legitimate employers normally do not charge candidates to receive a job."],
      deadline:["Artificial deadline","The short deadline discourages research and verification."]
    },
    question:"How should the applicant investigate?",
    choices:[
      ["A","Pay and start immediately","Do not lose the opportunity",false],
      ["B","Send identity documents","Complete onboarding first",false],
      ["C","Research the company independently","Check registration, website and real staff",true],
      ["D","Invite another applicant","Share the training fee",false]
    ],
    success:"Well done. Independent company research, a real interview and verified contact details are essential before sharing documents or money.",
    fail:"Do not pay to unlock a job or send identity documents to an unverified recruiter. These can lead to financial and identity theft.",
    xp:160
  },
  {
    category:"FAMILY IMPERSONATION", avatar:"FA", sender:"New number: Family",
    meta:"Unknown number · now",
    messages:[
      `Hi, this is me. My phone broke, so I am using a new number.`,
      `I have an emergency and cannot speak. Please transfer <span data-clue="money">RM1,200</span> now.`,
      `Do not call anyone because it is <span data-clue="secrecy">private</span>. Use this <span data-clue="account">new bank account</span>.`
    ],
    clues:{
      money:["Urgent transfer","A sudden money request from a new number is high risk."],
      secrecy:["Forced secrecy","Scammers isolate victims so nobody can challenge the story."],
      account:["Changed account","An unfamiliar recipient account must be verified separately."]
    },
    question:"How can you confirm the family member's identity?",
    choices:[
      ["A","Transfer half first","Reduce the possible loss",false],
      ["B","Ask a shared secret in chat","Continue using the new number",false],
      ["C","Call the old number or another relative","Verify through a trusted channel",true],
      ["D","Send your bank screenshot","Show that you are trying to help",false]
    ],
    success:"Correct. Verification through the old number or another trusted relative breaks the scammer's control of the conversation.",
    fail:"Do not negotiate or share banking information through the suspicious number. Move verification to an established trusted channel.",
    xp:180
  },
  {
    category:"AI DEEPFAKE BOSS", avatar:"AI", sender:"Director Video Call",
    meta:"Incoming video message · urgent",
    messages:[
      `A realistic video of the school director asks you to keep a project payment confidential.`,
      `The voice says the transfer must happen <span data-clue="secret">without telling teachers</span>.`,
      `The account name is different, and the speaker refuses a <span data-clue="live-check">live callback</span> because of a meeting.`,
      `The request uses a <span data-clue="deepfake">short pre-recorded video</span> instead of a normal conversation.`
    ],
    clues:{
      secret:["Secrecy request","A legitimate payment should follow normal approval and record-keeping."],
      "live-check":["Avoided verification","Refusing a live callback prevents identity confirmation."],
      deepfake:["Possible deepfake","Short recorded clips can imitate a trusted person's face and voice."]
    },
    question:"Choose the defence that defeats the AI scam boss.",
    choices:[
      ["A","Trust the realistic video","Seeing the director is enough",false],
      ["B","Follow the secret instruction","Protect the confidential project",false],
      ["C","Use multi-person verification","Call a known number and require normal approval",true],
      ["D","Ask the video for another message","Continue inside the same channel",false]
    ],
    success:"Boss defeated. Deepfakes make visual evidence less reliable. Multi-person approval and a trusted callback provide stronger verification.",
    fail:"Realistic video and audio are no longer enough. A deepfake scam must be challenged with independent, multi-person verification.",
    xp:250
  }
];

let gameRoom=0, gameXp=0, gameLives=3, foundClues=new Set(), totalCluesFound=0, gameTimer=90, timerId=null, gameAnswered=false, soundOn=true, aiBonusRoom=null;
const game$=s=>document.querySelector(s), game$$=s=>[...document.querySelectorAll(s)];

function currentRoom(){return aiBonusRoom||escapeRooms[gameRoom]}
function startTimer(){
  clearInterval(timerId); gameTimer=90; updateTimer();
  timerId=setInterval(()=>{gameTimer--;updateTimer();if(gameTimer<=0){clearInterval(timerId);autoFailRoom()}},1000)
}
function updateTimer(){const m=String(Math.floor(gameTimer/60)).padStart(2,"0"),s=String(gameTimer%60).padStart(2,"0");game$("#timeStat").textContent=`${m}:${s}`}
function renderRoom(){
  const room=currentRoom(); foundClues=new Set(); gameAnswered=false;
  game$("#roomStat").textContent=aiBonusRoom?"AI":`${gameRoom+1}/5`;
  game$("#xpStat").textContent=gameXp; game$("#livesStat").textContent="♥ ".repeat(gameLives).trim()||"—";
  game$("#roomCategory").textContent=room.category; game$("#senderAvatar").textContent=room.avatar;
  game$("#senderName").textContent=room.sender; game$("#senderMeta").textContent=room.meta;
  game$("#missionQuestion").textContent=room.question; game$("#clueTotal").textContent=Object.keys(room.clues).length;
  game$("#clueCount").textContent="0";game$("#evidenceList").innerHTML='<span class="empty-evidence">No evidence collected yet.</span>';
  game$("#coachPanel").classList.add("hidden"); game$("#gameChat").innerHTML="";
  room.messages.forEach((message,index)=>{
    const div=document.createElement("div");div.className="game-message suspicious";div.innerHTML=message;
    div.querySelectorAll("[data-clue]").forEach(span=>span.addEventListener("click",()=>collectClue(span.dataset.clue,span)));
    game$("#gameChat").appendChild(div);
  });
  const choices=game$("#choiceGrid");choices.innerHTML="";
  room.choices.forEach((choice,index)=>{
    const btn=document.createElement("button");btn.className="game-choice";
    btn.innerHTML=`<span>${choice[0]}</span><div><b>${choice[1]}</b><small>${choice[2]}</small></div>`;
    btn.addEventListener("click",()=>answerRoom(index));choices.appendChild(btn);
  });
  if(!aiBonusRoom){
    game$$(".room-node").forEach((node,index)=>{
      node.classList.toggle("active",index===gameRoom);
      node.classList.toggle("done",index<gameRoom);
      node.classList.toggle("locked",index>gameRoom);
    });
    const progress=Math.round(gameRoom/escapeRooms.length*100);
    game$("#mapProgress").textContent=progress+"%";game$("#mapLine").style.width=progress+"%";
  }
  startTimer();
}
function collectClue(key,span){
  if(foundClues.has(key)||gameAnswered)return;
  const room=currentRoom(), clue=room.clues[key];if(!clue)return;
  foundClues.add(key);totalCluesFound++;span.classList.add("found");
  game$("#clueCount").textContent=foundClues.size;
  const empty=game$(".empty-evidence");if(empty)empty.remove();
  const chip=document.createElement("div");chip.className="evidence-chip";
  chip.innerHTML=`<b>✓ ${clue[0]}</b><small>${clue[1]}</small>`;game$("#evidenceList").appendChild(chip);
  if(foundClues.size===Object.keys(room.clues).length)unlockBadge("badgeDetective");
  playTone(720,.07);
}
function answerRoom(index){
  if(gameAnswered)return;gameAnswered=true;clearInterval(timerId);
  game$$(".game-choice").forEach(b=>b.disabled=true);
  const room=currentRoom(),correct=Boolean(room.choices[index][3]);
  const clueBonus=foundClues.size*15, timeBonus=Math.max(0,gameTimer);
  if(correct){const earned=room.xp+clueBonus+timeBonus;gameXp+=earned;showCoach(true,room.success,earned)}
  else{gameLives=Math.max(0,gameLives-1);gameXp=Math.max(0,gameXp-25);showCoach(false,room.fail,-25)}
  game$("#xpStat").textContent=gameXp;game$("#livesStat").textContent="♥ ".repeat(gameLives).trim()||"—";
  if(!aiBonusRoom&&gameRoom===0&&correct)unlockBadge("badgeGuardian");
  playTone(correct?880:180,.18);
}
function autoFailRoom(){if(gameAnswered)return;gameAnswered=true;gameLives=Math.max(0,gameLives-1);game$("#livesStat").textContent="♥ ".repeat(gameLives).trim()||"—";game$$(".game-choice").forEach(b=>b.disabled=true);showCoach(false,"Time expired. In real scams, pressure is a warning sign—but safe verification should still be calm and deliberate.",-20)}
function showCoach(success,text,reward){
  game$("#coachPanel").classList.remove("hidden");
  game$("#coachBadge").textContent=success?"AI SAFETY COACH · SUCCESS":"AI SAFETY COACH · REVIEW";
  game$("#coachTitle").textContent=success?"Smart decision!":"The scammer gained an advantage";
  game$("#coachTitle").style.color=success?"#83e843":"#ff7b7b";game$("#coachText").textContent=text;
  game$("#rewardXp").textContent=(reward>=0?"+":"")+reward+" XP";
  game$("#rewardClue").textContent=`${foundClues.size}/${Object.keys(currentRoom().clues).length} clues found`;
  game$("#nextRoom").textContent=aiBonusRoom?"Return to Mission Map →":gameRoom===escapeRooms.length-1?"View Final Result →":"Continue →";
}
game$("#nextRoom").addEventListener("click",()=>{
  if(aiBonusRoom){aiBonusRoom=null;renderRoom();return}
  if(gameRoom<escapeRooms.length-1){gameRoom++;renderRoom()}
  else completeGame()
});
function completeGame(){
  clearInterval(timerId);unlockBadge("badgeHero");game$("#mapProgress").textContent="100%";game$("#mapLine").style.width="100%";
  game$("#finalXp").textContent=gameXp;game$("#finalClues").textContent=totalCluesFound;
  game$("#finalRank").textContent=gameXp>=900?"Elite Guardian":gameXp>=650?"Cyber Guardian":"Safety Rookie";
  game$("#gameCompleteModal").classList.remove("hidden");playVictory();
}
game$("#restartGame").addEventListener("click",()=>{game$("#gameCompleteModal").classList.add("hidden");gameRoom=0;gameXp=0;gameLives=3;totalCluesFound=0;game$$(".achievement").forEach(x=>{x.classList.add("locked");x.classList.remove("unlocked")});renderRoom()});
function unlockBadge(id){const b=game$("#"+id);b.classList.remove("locked");b.classList.add("unlocked")}
game$$(".room-node").forEach((node,index)=>node.addEventListener("click",()=>{if(index<=gameRoom&&!gameAnswered){gameRoom=index;aiBonusRoom=null;renderRoom()}}));
game$("#soundToggle").addEventListener("click",()=>{soundOn=!soundOn;game$("#soundToggle").textContent=soundOn?"♪":"×"});
function playTone(freq,duration){if(!soundOn)return;try{const ctx=new(window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(ctx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.stop(ctx.currentTime+duration)}catch{}}
function playVictory(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>playTone(f,.25),i*150))}
game$("#newAiMission").addEventListener("click",generateAiMission);
async function generateAiMission(){
  if(!getKey()){openModal();game$("#modalMsg").textContent="Connect your API key to generate a real AI mission.";return}
  const btn=game$("#newAiMission");btn.disabled=true;btn.textContent="✦ AI is building a mission…";
  const instructions=`Create one safe educational scam-awareness escape-room scenario for secondary school students in Malaysia. Never create operational fraud instructions. Use a fictional organisation name and no real links. Return ONLY JSON:
{"category":"UPPERCASE CATEGORY","avatar":"2 letters","sender":"fictional sender","meta":"short metadata","messages":["message with exactly one <span data-clue=\\"clue1\\">suspicious phrase</span>","message with exactly one <span data-clue=\\"clue2\\">suspicious phrase</span>","message with exactly one <span data-clue=\\"clue3\\">suspicious phrase</span>"],"clues":{"clue1":["short title","educational explanation"],"clue2":["short title","educational explanation"],"clue3":["short title","educational explanation"]},"question":"decision question","choices":[["A","action","short detail",false],["B","action","short detail",false],["C","safe action","short detail",true],["D","action","short detail",false]],"success":"educational success explanation","fail":"educational failure explanation","xp":180}`;
  try{
    const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${getKey()}`,"Content-Type":"application/json"},body:JSON.stringify({model:getModel(),instructions,input:"Generate a fresh mission that is different from bank, parcel, job, family emergency and deepfake examples.",temperature:.8,max_output_tokens:1500})});
    const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||"AI mission request failed.");
    const parsed=JSON.parse(clean(outputText(data)));aiBonusRoom=parsed;renderRoom();game$("#roomStat").textContent="AI";game$("#roomCategory").textContent="AI BONUS MISSION"
  }catch(err){alert("Could not generate the AI mission: "+err.message)}
  finally{btn.disabled=false;btn.textContent="✦ Generate AI Bonus Mission"}
}
renderRoom();
