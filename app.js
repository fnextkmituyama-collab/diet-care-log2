const STORAGE_KEY = "dietCareLog.records";
const VIOLATION_KEY = "dietCareLog.violations";
const GOAL_KEY = "dietCareLog.goal";
const DEFAULT_TARGET_CALORIES = 1600;
const CALORIES_PER_EXERCISE_MINUTE = 6;
const IDEAL_PFC_RATIO = { protein: 0.14, fat: 0.25, carb: 0.61 };

const records = loadRecords();
const violationCounts = loadViolationCounts();
let goal = loadGoal();
let activeAngryAdvice = null;
let barcodeStream = null;
let barcodeScanTimer = null;
let pendingScannedProduct = null;

const angryMessages = {
  oko: [
    { type: "over_calorie_small", title: "その小さな甘え、普通に積もります", text: "100kcalくらい？その油断が一番しぶといんです。『ちょっとだけ』で自分を許すたびに、目標は静かに遠ざかっています。次の一食で帳尻を合わせてください。" },
    { type: "over_calorie_medium", title: "誤差の顔をした普通の敗北です", text: "300kcal近いズレを『まあまあ』で済ませるんですか。目標を見て、超えて、まだ平気な顔。記録アプリを使って現実逃避するの、かなり器用ですね。次で削ってください。" },
    { type: "over_calorie_big", title: "0が一個見えてないんですか", text: "500kcal以上オーバー。これは誤差ではなく、正面衝突です。食べていい理由を探す前に、食べた分をどう返すか考えてください。言い訳より先に歩け。" },
    { type: "junk_food", title: "そのメニュー、確信犯ですよね", text: "ラーメン、ケーキ、マック系。分かっていて選んだなら、分かっていて調整してください。『美味しかったから仕方ない』で済むなら、目標なんて最初から要りません。" },
    { type: "night_food", title: "夜の判断力、欲望に買収されています", text: "夜中の一口は、翌朝の後悔に化ける定期便です。『今日だけ』という雑な免罪符、何枚発行する気ですか。明日の自分に請求書を回すのをやめてください。" },
    { type: "heavy_food", title: "その一皿、弁明をどうぞ", text: "高カロリーを堂々と記録。結構、証拠提出ありがとうございます。では目標を掲げた人間がそれを選んだ合理性について、今すぐ自分で弁論してください。まあ厳しいでしょうけど。" },
    { type: "exercise_tiny", title: "それ、運動というより挨拶です", text: "その分数で運動記録を名乗るのはかなり強気です。入力して達成感を出す前に、今その場でスクワットを足してください。記録は汗の代用品ではありません。" },
    { type: "exercise_low", title: "まだ準備運動の領域です", text: "少し動いたのは認めます。でもそこで勝った顔をするのは早い。あと10分足してください。階段、散歩、スクワット。選択肢はあります。ないのはやる気だけです。" },
    { type: "exercise_high", title: "今日は動いた、でも調子に乗らない", text: "運動量はいいです。そこは認めます。ただし今日の頑張りを、明日のサボりの前払いにしないでください。変わる人は一発芸ではなく、淡々と積みます。" },
    { type: "weight_gain_small", title: "小さい増加をなめないでください", text: "少し増えただけ、で流すと次も同じです。数字は小さくても、油断の匂いは濃い。今日の食事と運動で締め直してください。" },
    { type: "weight_gain_medium", title: "増え方に言い訳の余地が減っています", text: "前回よりしっかり増えています。水分？タイミング？もちろん可能性はあります。でも全部そこに押しつけるのは都合が良すぎます。行動を見直してください。" },
    { type: "weight_gain_big", title: "増え方が派手です", text: "この増え方を見て、まだ偶然で片付けますか。食べた、動かなかった、調整しなかった。心当たりがあるなら、今日から一個ずつ潰してください。現実は待ってくれません。" },
    { type: "pfc_protein_low", title: "たんぱく質、薄すぎます", text: "炭水化物で場を埋めて、たんぱく質が留守です。体を変えたいなら材料を入れてください。鶏肉、魚、卵、豆腐、どれか足しましょう。" },
    { type: "pfc_fat_high", title: "脂質が主役を奪っています", text: "脂質が前に出すぎです。おいしいものほど静かにカロリーを持ってきます。次は揚げ物より焼き、クリームより和風で調整してください。" },
    { type: "pfc_carb_high", title: "炭水化物に寄りすぎです", text: "米、麺、パンで押し切る構成になっています。満足感は出ても、バランスは崩れます。次は野菜とたんぱく質を足してください。" }
  ],
  rage: [
    { type: "over_calorie_small", title: "また小さい甘えですか", text: "また微妙にオーバー。地味ですね、でもしっかり邪魔です。『このくらい』を積み上げて変われない理由を自作する作業、そろそろ終了してください。" },
    { type: "over_calorie_medium", title: "目標超過、再犯です", text: "また超過。見えていて超える、記録していて超える。もう『うっかり』ではなく、管理の敗北です。次の食事を削るか、歩くか、今すぐ決めてください。" },
    { type: "over_calorie_big", title: "500kcal以上オーバー、さすがに雑です", text: "0が一個見えてないんですか。これは『ちょっと食べた』ではなく、計画を横から殴っています。反省した顔だけ作っても変わりません。今日中に動く、次を削る、両方です。" },
    { type: "junk_food", title: "欲望に負ける流れ、連敗中です", text: "またそのメニュー。偶然ではなく、もはや運用方針ですね。言い訳、反省、再犯。この見事な三段落構成をそろそろ破壊してください。行動を変えない反省はただの演技です。" },
    { type: "night_food", title: "夜中の甘え、再犯です", text: "また夜に食べたんですか。分かっていてやるのが一番たちが悪い。眠る前の数分の快楽に、明日の自分を売り渡すな。食べたなら返済してください。" },
    { type: "heavy_food", title: "同じことを2回、さすがに雑です", text: "また高カロリーですか。反省してから同じ選択を繰り返す速度だけは一流ですね。目標達成したいのか、欲望の下請けを続けたいのか、今ここで決めてください。" },
    { type: "exercise_tiny", title: "その運動量で提出する気ですか", text: "その数分で運動記録を名乗るのは無理があります。入力して満足する前に、今その場でスクワットを追加してください。証拠はフォームではなく汗です。" },
    { type: "exercise_low", title: "運動をごまかしています", text: "少しだけ動いて『やりました』の顔。はいはい、主張は分かりました。で、結果は？ 目標を変えたいなら、運動量も変えてください。言い訳の筋トレだけ上達しています。" },
    { type: "exercise_high", title: "今日の努力を明日の言い訳にするな", text: "今日は多めに動きました。そこは認めます。ただし『今日やったから明日は休み』が出た瞬間に台無しです。継続できない努力は一発芸。明日も逃げないでください。" },
    { type: "weight_gain_small", title: "小さな増加をまた見逃す気ですか", text: "また少し増えましたね。小さいからセーフ、ではありません。小さい増加を甘く見る人が、あとで大きな差に驚くんです。今日の選択を締めてください。" },
    { type: "weight_gain_medium", title: "体重増加、言い逃れ不可です", text: "増えました。数字はあなたに気を使いません。食事、運動、睡眠、どこかで雑になっています。原因探しごっこで終わらせず、今日の行動で返してください。" },
    { type: "weight_gain_big", title: "体重増加、見事に結果が出ています", text: "原因不明の怪奇現象ではありません。食べた、動かなかった、調整しなかった。その積み重ねです。現実が証拠として提出されました。次の一手で覆してください。判決はまだ変えられます。" },
    { type: "pfc_protein_low", title: "たんぱく質不足、再犯です", text: "また材料不足です。体を変えたいのに、体を作る材料を入れない。なかなか大胆な矛盾ですね。次の食事で主菜を足してください。" },
    { type: "pfc_fat_high", title: "脂質が暴れています", text: "脂質が主役を奪いすぎです。揚げ物、クリーム、ジャンクに寄せたなら、結果も寄ってきます。次は逃げずに軽くしてください。" },
    { type: "pfc_carb_high", title: "炭水化物頼み、またですか", text: "また炭水化物に寄っています。満腹感でごまかしても、バランスの悪さは隠れません。野菜とたんぱく質を足して組み直してください。" }
  ]
};

const elements = {
  todayLabel: document.querySelector("#today-label"),
  resetDataButton: document.querySelector("#reset-data-button"),
  goalForm: document.querySelector("#goal-form"),
  goalCurrentWeight: document.querySelector("#goal-current-weight"),
  goalTargetWeight: document.querySelector("#goal-target-weight"),
  goalDate: document.querySelector("#goal-date"),
  goalResult: document.querySelector("#goal-result"),
  weightForm: document.querySelector("#weight-form"),
  mealForm: document.querySelector("#meal-form"),
  exerciseForm: document.querySelector("#exercise-form"),
  scanBarcodeButton: document.querySelector("#scan-barcode-button"),
  stopScanButton: document.querySelector("#stop-scan-button"),
  barcodePanel: document.querySelector("#barcode-panel"),
  barcodeVideo: document.querySelector("#barcode-video"),
  barcodeManual: document.querySelector("#barcode-manual"),
  lookupBarcodeButton: document.querySelector("#lookup-barcode-button"),
  barcodeStatus: document.querySelector("#barcode-status"),
  recordDate: document.querySelector("#record-date"),
  weight: document.querySelector("#weight"),
  condition: document.querySelector("#condition"),
  mealTime: document.querySelector("#meal-time"),
  mealName: document.querySelector("#meal-name"),
  calorie: document.querySelector("#calorie"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseTime: document.querySelector("#exercise-time"),
  logList: document.querySelector("#log-list"),
  historyList: document.querySelector("#history-list"),
  trendChart: document.querySelector("#trend-chart"),
  chartSummary: document.querySelector("#chart-summary"),
  intakeCalorie: document.querySelector("#intake-calorie"),
  targetCalorie: document.querySelector("#target-calorie"),
  calorieProgress: document.querySelector("#calorie-progress"),
  burnedCalorieSummary: document.querySelector("#burned-calorie-summary"),
  remainingCalorie: document.querySelector("#remaining-calorie"),
  currentWeight: document.querySelector("#current-weight"),
  scoreValue: document.querySelector("#score-value"),
  scoreTitle: document.querySelector("#score-title"),
  scoreMessage: document.querySelector("#score-message"),
  proteinBar: document.querySelector("#protein-bar"),
  fatBar: document.querySelector("#fat-bar"),
  carbBar: document.querySelector("#carb-bar"),
  proteinValue: document.querySelector("#protein-value"),
  fatValue: document.querySelector("#fat-value"),
  carbValue: document.querySelector("#carb-value"),
  pfcScore: document.querySelector("#pfc-score"),
  pfcAdvice: document.querySelector("#pfc-advice"),
  adviceCard: document.querySelector("#advice-card"),
  advisorFace: document.querySelector("#advisor-face"),
  adviceModeLabel: document.querySelector("#advice-mode-label"),
  adviceTitle: document.querySelector("#advice-title"),
  adviceMessage: document.querySelector("#advice-message"),
  dramaticPopup: document.querySelector("#dramatic-popup"),
  dramaticLabel: document.querySelector("#dramatic-label"),
  dramaticTitle: document.querySelector("#dramatic-title"),
  dramaticMessage: document.querySelector("#dramatic-message"),
  dramaticClose: document.querySelector("#dramatic-close"),
  notice: document.querySelector("#save-notice"),
  mealStatuses: {
    "朝食": document.querySelector("#status-breakfast"),
    "昼食": document.querySelector("#status-lunch"),
    "夕食": document.querySelector("#status-dinner"),
    "間食": document.querySelector("#status-snack"),
  },
};

initialize();

function initialize() {
  const today = toDateInputValue(new Date());
  elements.recordDate.value = today;
  elements.todayLabel.textContent = formatDateLabel(today);
  fillGoalForm();

  document.querySelectorAll("[data-meal-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.mealTime.value = button.dataset.mealShortcut;
      elements.mealName.focus();
    });
  });

  elements.goalForm.addEventListener("submit", handleGoalSubmit);
  elements.weightForm.addEventListener("submit", handleWeightSubmit);
  elements.mealForm.addEventListener("submit", handleMealSubmit);
  elements.exerciseForm.addEventListener("submit", handleExerciseSubmit);
  elements.scanBarcodeButton.addEventListener("click", startBarcodeScanner);
  elements.stopScanButton.addEventListener("click", stopBarcodeScanner);
  elements.lookupBarcodeButton.addEventListener("click", () => lookupBarcode(elements.barcodeManual.value));
  elements.barcodeManual.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lookupBarcode(elements.barcodeManual.value);
    }
  });
  elements.resetDataButton.addEventListener("click", resetAllData);
  elements.dramaticClose.addEventListener("click", hideDramaticPopup);
  elements.dramaticPopup.addEventListener("click", (event) => {
    if (event.target === elements.dramaticPopup) hideDramaticPopup();
  });

  render();
}

function handleGoalSubmit(event) {
  event.preventDefault();
  goal = {
    currentWeight: Number(elements.goalCurrentWeight.value) || null,
    targetWeight: Number(elements.goalTargetWeight.value) || null,
    goalDate: elements.goalDate.value || null,
  };
  saveGoal();
  render();
  showNotice("目標を保存しました");
}

function handleWeightSubmit(event) {
  event.preventDefault();
  const weight = Number(elements.weight.value);
  if (!weight) return showNotice("体重を入力してください");

  const previousWeightRecord = records.find((item) => item.type === "body");
  const previousWeight = previousWeightRecord ? Number(previousWeightRecord.weight) : null;
  const weightDelta = previousWeight ? weight - previousWeight : 0;
  const record = {
    type: "body",
    date: elements.recordDate.value || toDateInputValue(new Date()),
    label: "体重",
    description: elements.condition.value.trim() || "体重を記録しました",
    value: `${weight.toFixed(1)}kg`,
    weight,
    previousWeight,
    weightDelta,
  };

  addRecord(record);
  triggerAngryAdvice(record);
  elements.weight.value = "";
  elements.condition.value = "";
  showNotice("体重を保存しました");
}

function handleMealSubmit(event) {
  event.preventDefault();
  const mealName = elements.mealName.value.trim();
  const calories = Number(elements.calorie.value);
  if (!mealName || Number.isNaN(calories)) return showNotice("食べたものとカロリーを入力してください");

  const pfc = getMealPfc(mealName, calories);
  const record = {
    type: "meal",
    date: elements.recordDate.value || toDateInputValue(new Date()),
    label: elements.mealTime.value,
    description: mealName,
    value: `${formatNumber(calories)}kcal`,
    calories,
    pfc,
  };

  addRecord(record);
  triggerAngryAdvice(record);
  pendingScannedProduct = null;
  elements.mealName.value = "";
  elements.calorie.value = "";
  showNotice("食事を保存しました");
}

function handleExerciseSubmit(event) {
  event.preventDefault();
  const exerciseName = elements.exerciseName.value.trim();
  const minutes = Number(elements.exerciseTime.value);
  if (!exerciseName || !minutes) return showNotice("運動内容と時間を入力してください");

  const burnedCalories = Math.round(minutes * CALORIES_PER_EXERCISE_MINUTE);
  const record = {
    type: "exercise",
    date: elements.recordDate.value || toDateInputValue(new Date()),
    label: "運動",
    description: `${exerciseName}${minutes}分`,
    value: `${formatNumber(burnedCalories)}kcal`,
    minutes,
    burnedCalories,
  };

  addRecord(record);
  triggerAngryAdvice(record);
  elements.exerciseName.value = "";
  elements.exerciseTime.value = "";
  showNotice("運動を保存しました");
}

function addRecord(record) {
  records.unshift({
    id: window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    ...record,
  });
  saveRecords();
  render();
}

function resetAllData() {
  records.length = 0;
  Object.keys(violationCounts).forEach((key) => delete violationCounts[key]);
  goal = {};
  activeAngryAdvice = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VIOLATION_KEY);
  localStorage.removeItem(GOAL_KEY);
  fillGoalForm();
  hideDramaticPopup();
  render();
  showNotice("記録をリセットしました");
}

function triggerAngryAdvice(record) {
  const violationType = detectViolation(record);
  if (!violationType) return;
  const key = `${record.date}:${violationType}`;
  violationCounts[key] = (violationCounts[key] || 0) + 1;
  saveViolationCounts();
  const mode = violationCounts[key] >= 2 ? "rage" : "oko";
  const message = pickAngryMessage(mode, violationType);
  activeAngryAdvice = { mode, ...message };
  renderAdvice();
  showDramaticPopup(activeAngryAdvice);
}

function detectViolation(record) {
  if (record.type === "body" && record.weightDelta > 0) return getWeightGainType(record.weightDelta);
  if (record.type === "exercise") return getExerciseType(record.minutes);
  if (record.type !== "meal") return null;

  const text = record.description.toLowerCase();
  const todayMeals = records.filter((item) => item.date === record.date && item.type === "meal");
  const intake = todayMeals.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const calorieOver = intake - getTargetCalories();
  const pfc = sumPfc(todayMeals);
  const pfcType = getPfcViolationType(pfc, intake);
  const nightWords = ["夜中", "深夜", "夜食", "寝る前", "締め", "〆"];
  const junkWords = ["ラーメン", "らーめん", "ケーキ", "マック", "マクド", "ビッグマック", "ポテト", "ハンバーガー", "ピザ", "唐揚げ", "からあげ", "揚げ", "ドーナツ", "アイス", "スイーツ"];

  if (calorieOver > 0) return getCalorieOverType(calorieOver);
  if (nightWords.some((word) => text.includes(word))) return "night_food";
  if (junkWords.some((word) => text.includes(word))) return "junk_food";
  if (record.calories >= 800) return "heavy_food";
  if (pfcType) return pfcType;
  return null;
}

function getCalorieOverType(calorieOver) {
  if (calorieOver >= 500) return "over_calorie_big";
  if (calorieOver >= 250) return "over_calorie_medium";
  return "over_calorie_small";
}

function getWeightGainType(weightDelta) {
  if (weightDelta >= 0.8) return "weight_gain_big";
  if (weightDelta >= 0.3) return "weight_gain_medium";
  return "weight_gain_small";
}

function getExerciseType(minutes) {
  if (minutes < 5) return "exercise_tiny";
  if (minutes < 15) return "exercise_low";
  if (minutes >= 60) return "exercise_high";
  return null;
}

function getPfcViolationType(pfc, calories) {
  if (calories < 300) return null;
  const balance = getPfcBalance(pfc);
  if (balance.proteinRatio < 0.11) return "pfc_protein_low";
  if (balance.fatRatio > 0.38) return "pfc_fat_high";
  if (balance.carbRatio > 0.74) return "pfc_carb_high";
  return null;
}

function pickAngryMessage(mode, type) {
  const messages = angryMessages[mode];
  const exact = messages.filter((message) => message.type === type);
  const pool = exact.length ? exact : messages;
  return pool[Math.floor(Math.random() * pool.length)];
}

function render() {
  renderGoal();
  renderLogList();
  renderHistory();
  renderSummary();
  renderPfc();
  renderTrendChart();
  renderAdvice();
}

function renderGoal() {
  const targetCalories = getTargetCalories();
  elements.targetCalorie.textContent = formatNumber(targetCalories);
  if (!goal.targetWeight || !goal.goalDate) {
    elements.goalResult.textContent = "目標体重と期限を入れると、1日の目安を表示します。";
    return;
  }
  const latestWeight = getLatestWeight();
  const baseWeight = latestWeight || goal.currentWeight;
  if (!baseWeight) {
    elements.goalResult.textContent = `目標は${goal.targetWeight.toFixed(1)}kg。現在体重を記録すると必要ペースを計算します。`;
    return;
  }
  const days = Math.max(Math.ceil((new Date(`${goal.goalDate}T00:00:00`) - new Date()) / 86400000), 1);
  const diff = baseWeight - goal.targetWeight;
  const dailyDeficit = Math.round((diff * 7200) / days);
  if (diff <= 0) {
    elements.goalResult.textContent = `目標達成圏内です。維持目安は1日${formatNumber(targetCalories)}kcal前後。油断すると戻ります。`;
    return;
  }
  elements.goalResult.textContent = `目標まであと${diff.toFixed(1)}kg、残り${days}日。1日約${formatNumber(Math.max(dailyDeficit, 0))}kcal分の調整が目安です。`;
}

function renderSummary() {
  const today = toDateInputValue(new Date());
  const todayRecords = records.filter((record) => record.date === today);
  const meals = todayRecords.filter((record) => record.type === "meal");
  const exercises = todayRecords.filter((record) => record.type === "exercise");
  const latestWeight = records.find((record) => record.type === "body");
  const targetCalories = getTargetCalories();
  const intake = meals.reduce((sum, record) => sum + Number(record.calories || 0), 0);
  const burned = exercises.reduce((sum, record) => sum + Number(record.burnedCalories || 0), 0);
  const remaining = targetCalories - intake + burned;
  const progress = Math.min((intake / targetCalories) * 100, 100);
  const score = calculateScore(todayRecords, intake);

  elements.intakeCalorie.textContent = formatNumber(intake);
  elements.burnedCalorieSummary.textContent = `${formatNumber(burned)}kcal`;
  elements.remainingCalorie.textContent = `${formatNumber(remaining)}kcal`;
  elements.currentWeight.textContent = latestWeight ? latestWeight.value : "--kg";
  elements.calorieProgress.style.width = `${progress}%`;
  elements.scoreValue.textContent = score;
  elements.scoreTitle.textContent = getScoreTitle(score);
  elements.scoreMessage.textContent = getScoreMessage(score, meals.length, exercises.length);

  Object.entries(elements.mealStatuses).forEach(([mealName, element]) => {
    const hasMeal = meals.some((record) => record.label === mealName);
    element.textContent = hasMeal ? "入力済" : mealName === "間食" ? "追加" : "未入力";
  });
}

function renderPfc() {
  const today = toDateInputValue(new Date());
  const meals = records.filter((record) => record.date === today && record.type === "meal");
  const calories = meals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
  const pfc = sumPfc(meals);
  const maxProtein = 100;
  const maxFat = 70;
  const maxCarb = 260;

  elements.proteinValue.textContent = `${Math.round(pfc.protein)}g`;
  elements.fatValue.textContent = `${Math.round(pfc.fat)}g`;
  elements.carbValue.textContent = `${Math.round(pfc.carb)}g`;
  elements.proteinBar.style.width = `${Math.min((pfc.protein / maxProtein) * 100, 100)}%`;
  elements.fatBar.style.width = `${Math.min((pfc.fat / maxFat) * 100, 100)}%`;
  elements.carbBar.style.width = `${Math.min((pfc.carb / maxCarb) * 100, 100)}%`;

  const violation = getPfcViolationType(pfc, calories);
  const balance = getPfcBalance(pfc);
  if (calories === 0) {
    elements.pfcScore.textContent = "未記録";
    elements.pfcAdvice.textContent = "食べたものからPFCを推定し、P14:F25:C61にどれだけ近いかで採点します。";
  } else if (violation === "pfc_protein_low") {
    elements.pfcScore.textContent = `${balance.score}点`;
    elements.pfcAdvice.textContent = `P${balance.proteinPercent}:F${balance.fatPercent}:C${balance.carbPercent}。たんぱく質が薄いです。鶏肉・魚・卵・豆腐を足すと締まります。`;
  } else if (violation === "pfc_fat_high") {
    elements.pfcScore.textContent = `${balance.score}点`;
    elements.pfcAdvice.textContent = `P${balance.proteinPercent}:F${balance.fatPercent}:C${balance.carbPercent}。脂質が前に出すぎです。揚げ物やクリーム系を次で控えると整います。`;
  } else if (violation === "pfc_carb_high") {
    elements.pfcScore.textContent = `${balance.score}点`;
    elements.pfcAdvice.textContent = `P${balance.proteinPercent}:F${balance.fatPercent}:C${balance.carbPercent}。炭水化物に寄っています。野菜と主菜を足して戻しましょう。`;
  } else {
    elements.pfcScore.textContent = `${balance.score}点`;
    elements.pfcAdvice.textContent = `P${balance.proteinPercent}:F${balance.fatPercent}:C${balance.carbPercent}。理想比率に近いです。この調子でいきましょう。`;
  }
}

function renderLogList() {
  const today = toDateInputValue(new Date());
  const todayRecords = records.filter((record) => record.date === today);
  if (todayRecords.length === 0) {
    elements.logList.innerHTML = `<div class="empty-state"><strong>まだ記録がありません</strong><p>体重や食事を保存すると、ここにタイムラインとして表示されます。</p></div>`;
    return;
  }
  elements.logList.innerHTML = todayRecords.map(renderRecordItem).join("");
}

function renderHistory() {
  const dailyData = buildDailyTrendData().slice(-7).reverse();
  if (dailyData.length === 0) {
    elements.historyList.innerHTML = `<div class="empty-state"><strong>履歴はまだありません</strong><p>数日分の記録がたまると、日別に確認できます。</p></div>`;
    return;
  }
  elements.historyList.innerHTML = dailyData.map((day) => {
    const pfc = day.pfc || { protein: 0, fat: 0, carb: 0 };
    return `
      <article class="history-item">
        <div>
          <time>${escapeHtml(formatDateLabel(day.date))}</time>
          <p>${day.weight ? `${day.weight.toFixed(1)}kg` : "体重未記録"} / ${formatNumber(day.calories)}kcal</p>
        </div>
        <strong>P${Math.round(pfc.protein)} F${Math.round(pfc.fat)} C${Math.round(pfc.carb)}</strong>
      </article>
    `;
  }).join("");
}

function renderRecordItem(record) {
  const pfcText = record.type === "meal" && record.pfc
    ? `<small>P${Math.round(record.pfc.protein)}g F${Math.round(record.pfc.fat)}g C${Math.round(record.pfc.carb)}g</small>`
    : "";
  return `
    <article class="log-item">
      <span class="log-dot ${record.type}"></span>
      <div>
        <time datetime="${escapeHtml(record.date)}">${escapeHtml(formatRecordTime(record))}</time>
        <p>${escapeHtml(record.description)}</p>
        ${pfcText}
      </div>
      <strong>${escapeHtml(record.value)}</strong>
    </article>
  `;
}

function renderAdvice() {
  if (activeAngryAdvice) {
    const isRage = activeAngryAdvice.mode === "rage";
    elements.adviceCard.classList.toggle("rage-mode", isRage);
    elements.adviceCard.classList.toggle("oko-mode", !isRage);
    elements.advisorFace.textContent = "!";
    elements.adviceModeLabel.textContent = isRage ? "強めの喝" : "今日の喝";
    elements.adviceTitle.textContent = activeAngryAdvice.title;
    elements.adviceMessage.textContent = activeAngryAdvice.text;
    return;
  }
  const today = toDateInputValue(new Date());
  const todayRecords = records.filter((record) => record.date === today);
  const meals = todayRecords.filter((record) => record.type === "meal");
  const exercises = todayRecords.filter((record) => record.type === "exercise");
  const intake = meals.reduce((sum, record) => sum + Number(record.calories || 0), 0);
  const burned = exercises.reduce((sum, record) => sum + Number(record.burnedCalories || 0), 0);

  elements.adviceCard.classList.remove("oko-mode", "rage-mode");
  elements.advisorFace.textContent = "✓";
  elements.adviceModeLabel.textContent = "アドバイス";
  elements.adviceTitle.textContent = getAdviceTitle(intake, meals.length);
  elements.adviceMessage.textContent = getAdviceMessage(intake, burned, meals.length);
}

async function startBarcodeScanner() {
  elements.barcodePanel.hidden = false;
  elements.barcodeStatus.textContent = "カメラを起動しています。バーコードを明るい場所で写してください。";

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    elements.barcodeStatus.textContent = "このブラウザではカメラが使えません。番号入力で検索してください。";
    return;
  }

  if (!("BarcodeDetector" in window)) {
    elements.barcodeStatus.textContent = "このブラウザはバーコード読み取りに未対応です。番号入力で検索してください。";
    return;
  }

  try {
    stopBarcodeScanner(false);
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    elements.barcodeVideo.srcObject = barcodeStream;
    await elements.barcodeVideo.play();
    elements.stopScanButton.hidden = false;

    const detector = await createBarcodeDetector();
    barcodeScanTimer = window.setInterval(async () => {
      if (elements.barcodeVideo.readyState < 2) return;
      const codes = await detector.detect(elements.barcodeVideo);
      if (!codes.length) return;
      const barcode = codes[0].rawValue;
      stopBarcodeScanner(false);
      lookupBarcode(barcode);
    }, 650);
  } catch (error) {
    stopBarcodeScanner(false);
    elements.barcodeStatus.textContent = "カメラを開けませんでした。ブラウザのカメラ許可を確認するか、番号入力で検索してください。";
  }
}

async function createBarcodeDetector() {
  const desiredFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
  if (!BarcodeDetector.getSupportedFormats) return new BarcodeDetector({ formats: desiredFormats });
  const supported = await BarcodeDetector.getSupportedFormats();
  const formats = desiredFormats.filter((format) => supported.includes(format));
  return new BarcodeDetector({ formats: formats.length ? formats : supported });
}

function stopBarcodeScanner(updateStatus = true) {
  if (barcodeScanTimer) {
    window.clearInterval(barcodeScanTimer);
    barcodeScanTimer = null;
  }
  if (barcodeStream) {
    barcodeStream.getTracks().forEach((track) => track.stop());
    barcodeStream = null;
  }
  elements.barcodeVideo.srcObject = null;
  elements.stopScanButton.hidden = true;
  if (updateStatus) elements.barcodeStatus.textContent = "読み取りを停止しました。";
}

async function lookupBarcode(rawBarcode) {
  const barcode = String(rawBarcode || "").replace(/\D/g, "");
  if (!barcode) {
    elements.barcodeStatus.textContent = "バーコード番号を入力してください。";
    return;
  }

  elements.barcodePanel.hidden = false;
  elements.barcodeManual.value = barcode;
  elements.barcodeStatus.textContent = "商品データを探しています。";

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("network");
    const data = await response.json();
    if (data.status !== 1 || !data.product) throw new Error("not_found");

    const product = normalizeProduct(data.product);
    if (!product.calories) throw new Error("no_nutrition");

    pendingScannedProduct = product;
    elements.mealName.value = product.name;
    elements.calorie.value = product.calories;
    elements.barcodeStatus.textContent = `${product.name} を入力しました。PFCも商品データを優先します。`;
    showNotice("バーコードから自動入力しました");
  } catch (error) {
    pendingScannedProduct = null;
    elements.barcodeStatus.textContent = "商品が見つからないか、栄養データが不足しています。手入力でいきましょう。";
  }
}

function normalizeProduct(product) {
  const nutriments = product.nutriments || {};
  const nameParts = [product.brands, product.product_name].filter(Boolean);
  const name = nameParts.join(" ").trim() || "バーコード商品";
  const calories = getNutrimentKcal(nutriments);
  const pfc = {
    protein: getNutrimentNumber(nutriments, "proteins"),
    fat: getNutrimentNumber(nutriments, "fat"),
    carb: getNutrimentNumber(nutriments, "carbohydrates"),
  };

  return {
    name,
    calories: Math.round(calories || 0),
    pfc: pfc.protein || pfc.fat || pfc.carb ? pfc : null,
  };
}

function getNutrimentKcal(nutriments) {
  const serving = Number(nutriments["energy-kcal_serving"]);
  if (serving) return serving;
  const per100g = Number(nutriments["energy-kcal_100g"]);
  if (per100g) return per100g;
  const kjServing = Number(nutriments.energy_serving);
  if (kjServing) return kjServing / 4.184;
  const kj100g = Number(nutriments.energy_100g);
  if (kj100g) return kj100g / 4.184;
  return 0;
}

function getNutrimentNumber(nutriments, key) {
  return Number(nutriments[`${key}_serving`] || nutriments[`${key}_100g`] || 0);
}

function getMealPfc(mealName, calories) {
  if (
    pendingScannedProduct &&
    pendingScannedProduct.pfc &&
    pendingScannedProduct.name === mealName &&
    Number(pendingScannedProduct.calories) === Number(calories)
  ) {
    return pendingScannedProduct.pfc;
  }
  return estimatePfc(mealName, calories);
}

function renderTrendChart() {
  const dailyData = buildDailyTrendData();
  if (dailyData.length === 0) {
    elements.trendChart.innerHTML = renderEmptyChart();
    elements.chartSummary.textContent = "記録が増えると推移が表示されます。";
    return;
  }
  const recentData = dailyData.slice(-7);
  elements.trendChart.innerHTML = createTrendSvg(recentData);
  elements.chartSummary.textContent = createTrendSummary(recentData);
}

function buildDailyTrendData() {
  const grouped = new Map();
  records.slice().reverse().forEach((record) => {
    if (!grouped.has(record.date)) grouped.set(record.date, { date: record.date, calories: 0, weight: null, pfc: { protein: 0, fat: 0, carb: 0 } });
    const day = grouped.get(record.date);
    if (record.type === "meal") {
      day.calories += Number(record.calories || 0);
      const pfc = record.pfc || estimatePfc(record.description, record.calories || 0);
      day.pfc.protein += pfc.protein;
      day.pfc.fat += pfc.fat;
      day.pfc.carb += pfc.carb;
    }
    if (record.type === "body") day.weight = Number(record.weight);
  });
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function createTrendSvg(data) {
  const width = 360;
  const height = 190;
  const padding = { top: 20, right: 18, bottom: 34, left: 38 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const weightData = data.filter((item) => Number.isFinite(item.weight));
  const calorieData = data.filter((item) => item.calories > 0);
  const weightDomain = getDomain(weightData.map((item) => item.weight), 0.4);
  const calorieDomain = getDomain(calorieData.map((item) => item.calories), 100);
  const xFor = (index) => data.length === 1 ? padding.left + innerWidth / 2 : padding.left + (index / (data.length - 1)) * innerWidth;
  const yFor = (value, domain) => domain.max === domain.min ? padding.top + innerHeight / 2 : padding.top + innerHeight - ((value - domain.min) / (domain.max - domain.min)) * innerHeight;
  const weightPoints = data.map((item, index) => Number.isFinite(item.weight) ? `${xFor(index)},${yFor(item.weight, weightDomain)}` : null).filter(Boolean);
  const caloriePoints = data.map((item, index) => item.calories > 0 ? `${xFor(index)},${yFor(item.calories, calorieDomain)}` : null).filter(Boolean);
  const labels = data.map((item, index) => {
    const date = new Date(`${item.date}T00:00:00`);
    return `<text x="${xFor(index)}" y="176" text-anchor="middle" class="chart-label">${date.getMonth() + 1}/${date.getDate()}</text>`;
  }).join("");
  const weightCircles = data.map((item, index) => Number.isFinite(item.weight) ? `<circle cx="${xFor(index)}" cy="${yFor(item.weight, weightDomain)}" r="4" class="weight-dot"><title>${item.weight.toFixed(1)}kg</title></circle>` : "").join("");
  const calorieCircles = data.map((item, index) => item.calories > 0 ? `<circle cx="${xFor(index)}" cy="${yFor(item.calories, calorieDomain)}" r="4" class="calorie-dot"><title>${formatNumber(item.calories)}kcal</title></circle>` : "").join("");
  return `
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}" class="chart-axis"></line>
    <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}" class="chart-axis"></line>
    <line x1="${padding.left}" y1="${padding.top + innerHeight / 2}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight / 2}" class="chart-grid"></line>
    ${weightPoints.length > 1 ? `<polyline points="${weightPoints.join(" ")}" class="weight-stroke"></polyline>` : ""}
    ${caloriePoints.length > 1 ? `<polyline points="${caloriePoints.join(" ")}" class="calorie-stroke"></polyline>` : ""}
    ${weightCircles}${calorieCircles}${labels}
  `;
}

function renderEmptyChart() {
  return `<line x1="38" y1="156" x2="342" y2="156" class="chart-axis"></line><text x="180" y="92" text-anchor="middle" class="chart-empty">まだ記録がありません</text>`;
}

function getDomain(values, padding) {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? { min: min - padding, max: max + padding } : { min: min - padding, max: max + padding };
}

function createTrendSummary(data) {
  const firstWeight = data.find((item) => Number.isFinite(item.weight));
  const latestWeight = data.slice().reverse().find((item) => Number.isFinite(item.weight));
  const latestCalories = data[data.length - 1]?.calories || 0;
  if (firstWeight && latestWeight && firstWeight !== latestWeight) {
    const diff = latestWeight.weight - firstWeight.weight;
    const direction = diff > 0 ? "増加" : "減少";
    return `直近${data.length}日で体重は${Math.abs(diff).toFixed(1)}kg${direction}。今日の摂取は${formatNumber(latestCalories)}kcalです。`;
  }
  if (latestWeight) return `最新体重は${latestWeight.weight.toFixed(1)}kg。今日の摂取は${formatNumber(latestCalories)}kcalです。`;
  return `今日の摂取は${formatNumber(latestCalories)}kcalです。体重も記録すると推移が見えます。`;
}

function estimatePfc(foodName, calories) {
  const text = foodName.toLowerCase();
  let ratio = { ...IDEAL_PFC_RATIO };
  const rules = [
    { words: ["鶏", "胸肉", "むね肉", "ささみ", "魚", "鮭", "まぐろ", "卵", "豆腐", "納豆", "プロテイン", "牛たん", "ステーキ"], ratio: { protein: 0.27, fat: 0.28, carb: 0.45 } },
    { words: ["牛丼", "うな丼", "うな重", "弁当", "定食", "丼"], ratio: { protein: 0.15, fat: 0.25, carb: 0.60 } },
    { words: ["ラーメン", "らーめん", "中華そば", "うどん", "そば", "パスタ", "スパゲティ"], ratio: { protein: 0.14, fat: 0.25, carb: 0.61 } },
    { words: ["米", "ごはん", "玄米", "パン", "おにぎり"], ratio: { protein: 0.09, fat: 0.12, carb: 0.79 } },
    { words: ["カレー", "カツ", "唐揚げ", "からあげ", "揚げ"], ratio: { protein: 0.15, fat: 0.38, carb: 0.47 } },
    { words: ["ケーキ", "ドーナツ", "アイス", "スイーツ", "チョコ", "クッキー"], ratio: { protein: 0.06, fat: 0.42, carb: 0.52 } },
    { words: ["マック", "マクド", "ポテト", "ピザ", "ハンバーガー"], ratio: { protein: 0.14, fat: 0.43, carb: 0.43 } },
    { words: ["サラダ", "野菜", "味噌汁", "スープ", "海藻"], ratio: { protein: 0.18, fat: 0.18, carb: 0.64 } },
  ];
  const hit = rules.find((rule) => rule.words.some((word) => text.includes(word)));
  if (hit) ratio = hit.ratio;
  return {
    protein: Math.round((calories * ratio.protein) / 4),
    fat: Math.round((calories * ratio.fat) / 9),
    carb: Math.round((calories * ratio.carb) / 4),
  };
}

function getPfcBalance(pfc) {
  const pCal = Number(pfc.protein || 0) * 4;
  const fCal = Number(pfc.fat || 0) * 9;
  const cCal = Number(pfc.carb || 0) * 4;
  const total = Math.max(pCal + fCal + cCal, 1);
  const proteinRatio = pCal / total;
  const fatRatio = fCal / total;
  const carbRatio = cCal / total;
  const diff =
    Math.abs(proteinRatio - IDEAL_PFC_RATIO.protein) +
    Math.abs(fatRatio - IDEAL_PFC_RATIO.fat) +
    Math.abs(carbRatio - IDEAL_PFC_RATIO.carb);

  return {
    proteinRatio,
    fatRatio,
    carbRatio,
    proteinPercent: Math.round(proteinRatio * 100),
    fatPercent: Math.round(fatRatio * 100),
    carbPercent: Math.round(carbRatio * 100),
    score: Math.max(0, Math.min(100, 100 - Math.round(diff * 180))),
  };
}

function sumPfc(meals) {
  return meals.reduce((sum, meal) => {
    const pfc = meal.pfc || estimatePfc(meal.description || "", meal.calories || 0);
    sum.protein += Number(pfc.protein || 0);
    sum.fat += Number(pfc.fat || 0);
    sum.carb += Number(pfc.carb || 0);
    return sum;
  }, { protein: 0, fat: 0, carb: 0 });
}

function getTargetCalories() {
  if (!goal.targetWeight || !goal.goalDate) return DEFAULT_TARGET_CALORIES;
  const latestWeight = getLatestWeight() || goal.currentWeight;
  if (!latestWeight) return DEFAULT_TARGET_CALORIES;
  const days = Math.max(Math.ceil((new Date(`${goal.goalDate}T00:00:00`) - new Date()) / 86400000), 1);
  const diff = latestWeight - goal.targetWeight;
  const dailyDeficit = Math.max(Math.round((diff * 7200) / days), 0);
  return Math.max(DEFAULT_TARGET_CALORIES - dailyDeficit, 1200);
}

function getLatestWeight() {
  const latestWeight = records.find((record) => record.type === "body");
  return latestWeight ? Number(latestWeight.weight) : null;
}

function fillGoalForm() {
  if (!goal) return;
  elements.goalCurrentWeight.value = goal.currentWeight || "";
  elements.goalTargetWeight.value = goal.targetWeight || "";
  elements.goalDate.value = goal.goalDate || "";
}

function calculateScore(todayRecords, intake) {
  let score = 45;
  if (todayRecords.some((record) => record.type === "body")) score += 15;
  if (todayRecords.some((record) => record.type === "meal")) score += 20;
  if (todayRecords.some((record) => record.type === "exercise")) score += 10;
  if (intake > 0 && intake <= getTargetCalories()) score += 10;
  if (intake > getTargetCalories() + 300) score -= 10;
  return Math.max(0, Math.min(score, 100));
}

function getScoreTitle(score) {
  if (score >= 85) return "かなりいい感じです";
  if (score >= 70) return "いいペースで記録できています";
  if (score >= 55) return "あと少し記録すると整います";
  return "まずは1つ保存してみましょう";
}

function getScoreMessage(score, mealCount, exerciseCount) {
  if (mealCount === 0) return "食事を1つ入力すると、今日のカロリーとPFCが見えるようになります。";
  if (exerciseCount === 0) return "余裕があれば、軽い散歩も記録してみましょう。";
  if (score >= 85) return "食事と運動の記録がそろっています。この調子で続けましょう。";
  return "今日の記録が増えるほど、アドバイスが具体的になります。";
}

function getAdviceTitle(intake, mealCount) {
  if (mealCount === 0) return "まずは今日の食事を記録してみましょう";
  if (intake > getTargetCalories()) return "次の食事は軽めにするとバランスが取りやすいです";
  return "目標カロリー内でいいペースです";
}

function getAdviceMessage(intake, burned, mealCount) {
  if (mealCount === 0) return "食べたものからPFCをざっくり推定し、偏りがあれば喝を入れます。";
  if (intake > getTargetCalories()) return "野菜や汁物を中心にして、脂質の多いメニューを少し控えると調整しやすいです。";
  if (burned > 0) return "運動も記録できています。夕食はたんぱく質と野菜を意識するとさらに良いです。";
  return "夕食で魚・鶏肉・豆腐などを選ぶと、たんぱく質を補いやすいです。";
}

function showDramaticPopup(advice) {
  const isRage = advice.mode === "rage";
  elements.dramaticPopup.classList.toggle("rage-mode", isRage);
  elements.dramaticPopup.classList.toggle("oko-mode", !isRage);
  elements.dramaticLabel.textContent = isRage ? "強めの喝" : "今日の喝";
  elements.dramaticTitle.textContent = advice.title;
  elements.dramaticMessage.textContent = advice.text;
  elements.dramaticPopup.hidden = false;
}

function hideDramaticPopup() {
  elements.dramaticPopup.hidden = true;
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadViolationCounts() {
  try { return JSON.parse(localStorage.getItem(VIOLATION_KEY)) || {}; } catch { return {}; }
}

function saveViolationCounts() {
  localStorage.setItem(VIOLATION_KEY, JSON.stringify(violationCounts));
}

function loadGoal() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY)) || {}; } catch { return {}; }
}

function saveGoal() {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

function showNotice(message) {
  elements.notice.textContent = message;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { elements.notice.textContent = ""; }, 2200);
}

function formatRecordTime(record) {
  return `${formatDateLabel(record.date)} ${record.label}`;
}

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = toDateInputValue(new Date());
  const suffix = dateValue === today ? " 今日" : "";
  return `${date.getMonth() + 1}月${date.getDate()}日${suffix}`;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatNumber(number) {
  return Number(number).toLocaleString("ja-JP");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
