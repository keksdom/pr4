const PLACES = [
  "музеї золотих унітазів",
  "бутику \"iDeputat\" з VIP-персоналом",
  "театрі опери «Оппаре»",
  "супермаркеті «Все для них»",
  "кафе «Їда в пакеті»",
  "міськїй адміністрації — відділ \"Рога і копита\"",];

const MYSTERIES = [
  {title:"Зникла золота гумова уточка", tone:"абсурд"},
  {title:"Украли рецепт борщу (без буряка!)", tone:"комедія"},
  {title:"Хтось змінює заставки в комп'ютерах мерії", tone:"сарказм"},
  {title:"Директор музею зник — залишився тільки парик", tone:"мелодрама"},
  {title:"У театрі замінюють партитуру на караоке", tone:"феєрія"}
];

const SUSPECT_TEMPLATES = [
  name => ({name: name || "Повар-Негодник", trait:"ненавидить суп", alibiChance:0.3}),
  name => ({name: name || "Певець у ритм", trait:"говорить тільки віршами", alibiChance:0.6}),
  name => ({name: name || "Бухгалтер з паспортом-сюрпризом", trait:"має дивні документи", alibiChance:0.4}),
  name => ({name: name || "Філософ з плакатом", trait:"вірить в силу ложки", alibiChance:0.2}),
  name => ({name: name || "Нічний сторож «Я ні при чому»", trait:"спить на службі", alibiChance:0.7})
];

const CLUE_TEMPLATES = [
  "сліди кетчупу",
  "анонімка, написана Comic Sans",
  "відбиток лапи (інтрига!)",
  "USB з одним файлом — Rickroll.mp4",
  "квитанція на стрижку парика",
  "фото з підозрілим фоном: портрет чиновника"
];

const ENDINGS = [
  "Герой геніально розкрив справу та отримав купон на шаурму — сатирична нагорода від міської ради.",
  "Виявилося: герой сам був злочинцем — на ім'я 'формальний конфлікт інтересів'.",
  "Це була прихована камера для телевізійного шоу — і мер дав прес-реліз.",
  "Справу розкрито, але всі питають: «А хто оплатить пошиття парика?» — легенда створена.",
  "Усе це влаштував загублений парик — кумедний сюжет для брифінгу."
];

/* Стан справи */
let caseState = null;

/* Утиліти */
function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randChance(p){ return Math.random() < p; }
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

/* ===========================
   Звуки — комедійні, синтез в WebAudio
   =========================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playComedic(type){
  // type: 'success' | 'fail' | 'final'
  const now = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc.connect(gain);
  osc2.connect(gain);

  if(type === 'success'){
    // короткий веселий біп + клік
    osc.type = 'sine'; osc.frequency.setValueAtTime(880, now);
    osc2.type = 'square'; osc2.frequency.setValueAtTime(1320, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc.start(now); osc2.start(now);
    osc.stop(now + 0.32); osc2.stop(now + 0.32);
  } else if(type === 'fail'){
    // комедійний "ой" — низький поскрип
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);
    osc.start(now); osc.stop(now + 0.55);
  } else if(type === 'final'){
    // короткі фанфари + сміх (синтезований)
    osc.type = 'triangle'; osc.frequency.setValueAtTime(660, now);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.start(now); osc2.start(now);
    osc.stop(now + 1.2); osc2.stop(now + 1.2);
    // невеличкий сміх (тремоло)
    const laugh = audioCtx.createOscillator();
    const lg = audioCtx.createGain();
    laugh.type = 'square'; laugh.frequency.setValueAtTime(300, now + 0.25);
    lg.gain.setValueAtTime(0, now + 0.25);
    lg.gain.linearRampToValueAtTime(0.08, now + 0.27);
    lg.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    laugh.connect(lg); lg.connect(audioCtx.destination);
    laugh.start(now + 0.25); laugh.stop(now + 0.9);
  }
}

/* ===========================
   Генерація справи
   =========================== */
function generateCase(){
  const name = document.getElementById('name').value.trim() || "Тарас Катигорошко";
  const strength = clamp(parseInt(document.getElementById('strength').value)||5,1,10);
  const charisma = clamp(parseInt(document.getElementById('charisma').value)||5,1,10);
  const luck = clamp(parseInt(document.getElementById('luck').value)||5,1,10);
  const intellect = clamp(parseInt(document.getElementById('intellect').value)||5,1,10);

  const intuition = Math.round((luck + intellect) / 2);
  const comedy = Math.round((charisma + luck) / 2);

  // nullish assign — зберігаємо лічильник справ
  window.totalCases ??= 0;
  window.totalCases++;

  const suspects = [];
  const numS = 3 + Math.floor(Math.random()*3);
  for(let i=0;i<numS;i++){
    const tmpl = rand(SUSPECT_TEMPLATES);
    suspects.push(tmpl());
  }

  const clues = [];
  const numC = 2 + Math.floor(Math.random()*3);
  const used = new Set();
  while(clues.length < numC){
    const c = rand(CLUE_TEMPLATES);
    if(!used.has(c)){ used.add(c); clues.push(c); }
  }

  const place = rand(PLACES);
  const mystery = rand(MYSTERIES);

  caseState = {
    hero:{name,strength,charisma,luck,intellect,intuition,comedy},
    place,mystery,suspects,clues,sceneIndex:0,log:[],foundClues:[],asked:[],score:0,ended:false
  };

  const trickyHint = (luck > 7 && charisma > 6) ? "Вас зустрічають з посмішкою — може бути підстава від прес-служби." :
                     (intellect > 7 || luck > 6) ? "Є тонка нитка, що веде до кабінету з пільгами." :
                     "Схоже, хаос — головний заступник у цій історії.";

  writeLog(`<b>Справа #${window.totalCases}:</b> У ${place} — ${mystery.title}. ${trickyHint}`);
  updatePreview();
  enableActions(true);
  renderState();
}

/* Оновлення прев’ю */
function updatePreview(){
  const s = caseState.hero;
  const preview = document.getElementById('statsPreview');
  preview.innerHTML = `
    <div class="stat">Сила: ${s.strength}</div>
    <div class="stat">Харизма: ${s.charisma}</div>
    <div class="stat">Удача: ${s.luck}</div>
    <div class="stat">Інтелект: ${s.intellect}</div>
    <div class="stat">Інтуїція: ${s.intuition}</div>
    <div class="stat">Юмор: ${s.comedy}</div>
  `;
  const p = clamp((s.intuition / 10) * 100, 6, 100);
  document.getElementById('intuitionBar').style.width = p + '%';
  document.getElementById('caseBrief').innerText = `Коротко: ${caseState.mystery.title} у ${caseState.place}`;
}

/* Лог */
function writeLog(html){
  caseState.log.unshift({time: Date.now(), text: html});
  renderLog();
}

function renderLog(){
  const log = document.getElementById('log'); log.innerHTML = '';
  for(const entry of caseState.log){
    const el = document.createElement('div');
    el.className = 'scene';
    el.innerHTML = `<div style="font-size:12px;color:#8b9bb0">${new Date(entry.time).toLocaleTimeString()}</div>${entry.text}`;
    log.appendChild(el);
  }
}

/* Контроль кнопок */
function enableActions(flag){
  document.getElementById('inspectBtn').disabled = !flag;
  document.getElementById('interviewBtn').disabled = !flag;
  document.getElementById('clueBtn').disabled = !flag;
}

/* Дія: Оглянути місце */
function actionInspect(){
  if(caseState.ended) return;
  const chance = (caseState.hero.intuition * 6 + caseState.hero.luck * 4) / 100;
  const found = randChance(chance);
  if(found){
    const newClue = rand(CLUE_TEMPLATES);
    // перевірка на дубль
    if(!caseState.foundClues.includes(newClue)){
      caseState.foundClues.push(newClue);
      writeLog(`<b>Огляд:</b> Знайдена підказка — <i>${newClue}</i>! (${caseState.hero.name} блистить інтуїцією)`);
      playComedic('success');
      caseState.score += 10;
    } else {
      writeLog(`<b>Огляд:</b> Ви лише знайшли старий плакат «За купу папірців» — але вписано в атмосферу.`);
      playComedic('fail');
      caseState.hero.intuition = Math.max(1, caseState.hero.intuition - 1);
    }
  } else {
    writeLog(`<b>Огляд:</b> Нічого значимого. Ви намагалися, але кабінетний хаос перемагає.`);
    playComedic('fail');
    caseState.hero.intuition = Math.max(1, caseState.hero.intuition - 1); // декремент
  }
  renderState();
}

/* Дія: Допитати підозрюваного */
function actionInterview(){
  if(caseState.ended) return;
  const suspect = rand(caseState.suspects);
  const baseChance = (caseState.hero.charisma + caseState.hero.intellect) / 20;
  const reveal = randChance(baseChance * (1 - (suspect.alibiChance ?? 0)));
  if(reveal){
    const hint = rand(["бачив парик, що падав під килим", "згадав дивну квитанцію на ім'я «нагороди»", "співав під носа мотив караоке"]);
    writeLog(`<b>Допит:</b> Ви допитали <i>${suspect.name}</i> (${suspect.trait}). Він проговорився: «${hint}».`);
    playComedic('success');
    caseState.score += 8;
    caseState.asked.push(suspect.name);
  } else {
    writeLog(`<b>Допит:</b> ${suspect.name} говорив у віршах і купив час для прес-служби. Спробуйте інший підхід.`);
    playComedic('fail');
    caseState.sceneIndex++; // інкремент як "спроба"
  }
  renderState();
}

/* Дія: Перевірити докази */
function actionCheckClues(){
  if(caseState.ended) return;
  const cluesTotal = caseState.clues.concat(caseState.foundClues);
  const helpful = cluesTotal.length >= 3 || caseState.hero.intellect > 7;
  if(helpful){
    writeLog(`<b>Докази:</b> Комбінація доказів (${cluesTotal.join(', ')}) вказує на несподіваний слід — ймовірно, службова змова.`);
    playComedic('success');
    caseState.score += 12;
    attemptReveal();
  } else {
    const joke = caseState.hero.comedy > 6 ? "Ви жартували на допиті — сміх завадив логіці." : "Нитка поки слабка, але анекдот вдалося записати.";
    writeLog(`<b>Докази:</b> Поки що не зв'язуються. ${joke}`);
    playComedic('fail');
    caseState.hero.comedy = clamp(caseState.hero.comedy + 1, 1, 10);
  }
  renderState();
}

/* Спроба розкриття — різні кінцівки */
function attemptReveal(){
  const s = caseState.score;
  const hero = caseState.hero;
  if((s >= 25 && hero.intellect >= 6) || (hero.intuition >= 8 && hero.luck >= 6)){
    const r = Math.random();
    let ending;
    if(r < 0.12) ending = ENDINGS[1];
    else if(r < 0.35) ending = ENDINGS[2];
    else if(r < 0.75) ending = ENDINGS[0];
    else ending = ENDINGS[3];

    const epilog = hero.comedy > 6 ? "Публіка у захваті — вас номінують на «Містера Інквізитор»." : "Метод викликав суперечки серед місцевих бюрократів.";
    writeLog(`<b>РАЗГАДКА:</b> ${ending} ${epilog}`);
    playComedic('final');

    if(ending.includes("шаурму")) writeLog(`<div style="color:#ffd89b">Ви отримали купон: -50% на шаурму від місцевого спонсора.</div>`);

    finalizeCase(ending);
  } else {
    writeLog(`<b>РАЗГАДКА:</b> Ви близько, але ще бракує доказів. Спробуйте інше дію або огляд.`);
    playComedic('fail');
  }
}

/* Завершення справи */
function finalizeCase(ending){
  caseState.ended = true;
  enableActions(false);
  const final = document.getElementById('finalResult');
  final.style.display = 'block';
  final.innerHTML = `<b>Фінал:</b> ${ending} <div style="margin-top:8px;color:#9fb3c8">Оцінка: ${caseState.score} очок. Інтерпретація: ${interpretScore(caseState.score)}</div>`;
  if(ending.includes("сам був злочинцем")){
    final.innerHTML += `<div style="margin-top:8px;color:#f79c9c">Сюрприз: у вас знайдено дивні відбитки — співпадіння?</div>`;
  }
}

/* Інтерпретація очок */
function interpretScore(score){
  return score >= 30 ? "Ви — легенда детективного відділу." :
         score >= 20 ? "Достойний результат." :
         score >= 10 ? "Непогано, але є над чим працювати." : "Пора взяти кави і переглянути докази.";
}

/* Візуальний рендеринг */
function renderState(){
  renderLog();
  const log = document.getElementById('log');
  log.scrollTop = 0;
}

/* Скидання */
function resetApp(){
  caseState = null;
  document.getElementById('log').innerHTML = '<div class="muted">Ще немає справи — згенеруйте її.</div>';
  document.getElementById('statsPreview').innerHTML = '';
  document.getElementById('caseBrief').innerText = '';
  enableActions(false);
  document.getElementById('finalResult').style.display = 'none';
}

/* Обробники кнопок */
document.getElementById('genBtn').addEventListener('click', ()=>{ generateCase(); });
document.getElementById('resetBtn').addEventListener('click', resetApp);
document.getElementById('inspectBtn').addEventListener('click', actionInspect);
document.getElementById('interviewBtn').addEventListener('click', actionInterview);
document.getElementById('clueBtn').addEventListener('click', actionCheckClues);

/* Ініціалізація */
resetApp();

/* Порада: щоб звук працював у деяких браузерах, користувачеві може знадобитися один клік для розблокування AudioContext.
   Ми викликаємо маленький жест-ініціатор при першому натисканні на генерувати. */
document.getElementById('genBtn').addEventListener('click', async () => {
  if (audioCtx.state === 'suspended') await audioCtx.resume();
});
