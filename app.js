const STORAGE_KEY = "dietCareLog.records";
const VIOLATION_KEY = "dietCareLog.violations";
const TARGET_CALORIES = 1600;
const CALORIES_PER_EXERCISE_MINUTE = 6;

const records = loadRecords();
const violationCounts = loadViolationCounts();
let activeAngryAdvice = null;

const angryMessages = {
  oko: [
    {
      type: "over_calorie_small",
      title: "その小さな甘え、普通に積もります",
      text: "100kcalくらい？その油断が一番しぶといんです。『ちょっとだけ』で自分を許すたびに、目標は静かに遠ざかっています。次の一食で帳尻を合わせてください。"
    },
    {
      type: "over_calorie_medium",
      title: "誤差の顔をした普通の敗北です",
      text: "300kcal近いズレを『まあまあ』で済ませるんですか。目標を見て、超えて、まだ平気な顔。記録アプリを使って現実逃避するの、かなり器用ですね。次で削ってください。"
    },
    {
      type: "over_calorie_big",
      title: "0が一個見えてないんですか",
      text: "500kcal以上オーバー。これは誤差ではなく、正面衝突です。食べていい理由を探す前に、食べた分をどう返すか考えてください。言い訳より先に歩け。"
    },
    {
      type: "junk_food",
      title: "そのメニュー、確信犯ですよね",
      text: "ラーメン、ケーキ、マック系。分かっていて選んだなら、分かっていて調整してください。『美味しかったから仕方ない』で済むなら、目標なんて最初から要りません。"
    },
    {
      type: "night_food",
      title: "夜の判断力、欲望に買収されています",
      text: "夜中の一口は、翌朝の後悔に化ける定期便です。『今日だけ』という雑な免罪符、何枚発行する気ですか。明日の自分に請求書を回すのをやめてください。"
    },
    {
      type: "heavy_food",
      title: "その一皿、弁明をどうぞ",
      text: "高カロリーを堂々と記録。結構、証拠提出ありがとうございます。では目標を掲げた人間がそれを選んだ合理性について、今すぐ自分で弁論してください。まあ厳しいでしょうけど。"
    },
    {
      type: "exercise_tiny",
      title: "それ、運動というより挨拶です",
      text: "その分数で運動記録を名乗るのはかなり強気です。入力して達成感を出す前に、今その場でスクワットを足してください。記録は汗の代用品ではありません。"
    },
    {
      type: "exercise_low",
      title: "まだ準備運動の領域です",
      text: "少し動いたのは認めます。でもそこで勝った顔をするのは早い。あと10分足してください。階段、散歩、スクワット。選択肢はあります。ないのはやる気だけです。"
    },
    {
      type: "exercise_high",
      title: "今日は動いた、でも調子に乗らない",
      text: "運動量はいいです。そこは認めます。ただし今日の頑張りを、明日のサボりの前払いにしないでください。変わる人は一発芸ではなく、淡々と積みます。"
    },
    {
      type: "weight_gain_small",
      title: "小さい増加をなめないでください",
      text: "少し増えただけ、で流すと次も同じです。数字は小さくても、油断の匂いは濃い。今日の食事と運動で締め直してください。"
    },
    {
      type: "weight_gain_medium",
      title: "増え方に言い訳の余地が減っています",
      text: "前回よりしっかり増えています。水分？タイミング？もちろん可能性はあります。でも全部そこに押しつけるのは都合が良すぎます。行動を見直してください。"
    },
    {
      type: "weight_gain_big",
      title: "増え方が派手です",
      text: "この増え方を見て、まだ偶然で片付けますか。食べた、動かなかった、調整しなかった。心当たりがあるなら、今日から一個ずつ潰してください。現実は待ってくれません。"
    }
  ],
  rage: [
    {
      type: "over_calorie_small",
      title: "また小さい甘えですか",
      text: "また微妙にオーバー。地味ですね、でもしっかり邪魔です。『このくらい』を積み上げて変われない理由を自作する作業、そろそろ終了してください。"
    },
    {
      type: "over_calorie_medium",
      title: "目標超過、再犯です",
      text: "また超過。見えていて超える、記録していて超える。もう『うっかり』ではなく、管理の敗北です。次の食事を削るか、歩くか、今すぐ決めてください。"
    },
    {
      type: "over_calorie_big",
      title: "500kcal以上オーバー、さすがに雑です",
      text: "0が一個見えてないんですか。これは『ちょっと食べた』ではなく、計画を横から殴っています。反省した顔だけ作っても変わりません。今日中に動く、次を削る、両方です。"
    },
    {
      type: "junk_food",
      title: "欲望に負ける流れ、連敗中です",
      text: "またそのメニュー。偶然ではなく、もはや運用方針ですね。言い訳、反省、再犯。この見事な三段落構成をそろそろ破壊してください。行動を変えない反省はただの演技です。"
    },
    {
      type: "night_food",
      title: "夜中の甘え、再犯です",
      text: "また夜に食べたんですか。分かっていてやるのが一番たちが悪い。眠る前の数分の快楽に、明日の自分を売り渡すな。食べたなら返済してください。"
    },
    {
      type: "heavy_food",
      title: "同じことを2回、さすがに雑です",
      text: "また高カロリーですか。反省してから同じ選択を繰り返す速度だけは一流ですね。目標達成したいのか、欲望の下請けを続けたいのか、今ここで決めてください。"
    },
    {
      type: "exercise_tiny",
      title: "その運動量で提出する気ですか",
      text: "その数分で運動記録を名乗るのは無理があります。入力して満足する前に、今その場でスクワットを追加してください。証拠はフォームではなく汗です。"
    },
    {
      type: "exercise_low",
      title: "運動をごまかしています",
      text: "少しだけ動いて『やりました』の顔。はいはい、主張は分かりました。で、結果は？ 目標を変えたいなら、運動量も変えてください。言い訳の筋トレだけ上達しています。"
    },
    {
      type: "exercise_high",
      title: "今日の努力を明日の言い訳にするな",
      text: "今日は多めに動きました。そこは認めます。ただし『今日やったから明日は休み』が出た瞬間に台無しです。継続できない努力は一発芸。明日も逃げないでください。"
    },
    {
      type: "weight_gain_small",
      title: "小さな増加をまた見逃す気ですか",
      text: "また少し増えましたね。小さいからセーフ、ではありません。小さい増加を甘く見る人が、あとで大きな差に驚くんです。今日の選択を締めてください。"
    },
    {
      type: "weight_gain_medium",
      title: "体重増加、言い逃れ不可です",
      text: "増えました。数字はあなたに気を使いません。食事、運動、睡眠、どこかで雑になっています。原因探しごっこで終わらせず、今日の行動で返してください。"
    },
    {
      type: "weight_gain_big",
      title: "体重増加、見事に結果が出ています",
      text: "原因不明の怪奇現象ではありません。食べた、動かなかった、調整しなかった。その積み重ねです。現実が証拠として提出されました。次の一手で覆してください。判決はまだ変えられます。"
    }
  ]
};

const elements = {
  todayLabel: document.querySelector("#today-label"),
  resetDataButton: document.querySelector("#reset-data-button"),
  weightForm: document.querySelector("#weight-form"),
  mealForm: document.querySelector("#meal-form"),
  exerciseForm: document.querySelector("#exercise-form"),
  recordDate: document.querySelector("#record-date"),
  weight: document.querySelector("#weight"),
  condition: document.querySelector("#condition"),
  mealTime: document.querySelector("#meal-time"),
  mealName: document.querySelector("#meal-name"),
  calorie: document.querySelector("#calorie"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseTime: document.querySelector("#exercise-time"),
  logList: document.querySelector("#log-list"),
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
  elements.targetCalorie.textContent = formatNumber(TARGET_CALORIES);

  document.querySelectorAll("[data-meal-shortcut]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.mealTime.value = button.dataset.mealShortcut;
      elements.mealName.focus();
    });
  });

  elements.weightForm.addEventListener("submit", handleWeightSubmit);
  elements.mealForm.addEventListener("submit", handleMealSubmit);
  elements.exerciseForm.addEventListener("submit", handleExerciseSubmit);
  elements.resetDataButton.addEventListener("click", resetAllData);
  elements.dramaticClose.addEventListener("click", hideDramaticPopup);
  elements.dramaticPopup.addEventListener("click", (event) => {
    if (event.target === elements.dramaticPopup) hideDramaticPopup();
  });

  render();
}

function resetAllData() {
  records.length = 0;
  Object.keys(violationCounts).forEach((key) => delete violationCounts[key]);
  activeAngryAdvice = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VIOLATION_KEY);
  hideDramaticPopup();
  render();
  showNotice("記録をリセットしました");
}

function handleWeightSubmit(event) {
  event.preventDefault();

  const weight = Number(elements.weight.value);
  if (!weight) {
    showNotice("体重を入力してください");
    return;
  }

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
  if (!mealName || Number.isNaN(calories)) {
    showNotice("食べたものとカロリーを入力してください");
    return;
  }

  const record = {
    type: "meal",
    date: elements.recordDate.value || toDateInputValue(new Date()),
    label: elements.mealTime.value,
    description: mealName,
    value: `${formatNumber(calories)}kcal`,
    calories,
  };

  addRecord(record);
  triggerAngryAdvice(record);
  elements.mealName.value = "";
  elements.calorie.value = "";
  showNotice("食事を保存しました");
}

function handleExerciseSubmit(event) {
  event.preventDefault();

  const exerciseName = elements.exerciseName.value.trim();
  const minutes = Number(elements.exerciseTime.value);
  if (!exerciseName || !minutes) {
    showNotice("運動内容と時間を入力してください");
    return;
  }

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
  if (record.type === "body" && record.weightDelta > 0) {
    return getWeightGainType(record.weightDelta);
  }

  if (record.type === "exercise") {
    return getExerciseType(record.minutes);
  }

  if (record.type === "meal") {
    const text = record.description.toLowerCase();
    const nightWords = ["夜中", "深夜", "夜食", "寝る前", "締め", "〆"];
    const junkWords = [
      "ラーメン",
      "らーめん",
      "ケーキ",
      "マック",
      "マクド",
      "ビッグマック",
      "ポテト",
      "ハンバーガー",
      "ピザ",
      "唐揚げ",
      "からあげ",
      "揚げ",
      "ドーナツ",
      "アイス",
      "スイーツ"
    ];
    const today = record.date;
    const todayMeals = records.filter((item) => item.date === today && item.type === "meal");
    const intake = todayMeals.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const calorieOver = intake - TARGET_CALORIES;

    if (calorieOver > 0) return getCalorieOverType(calorieOver);
    if (nightWords.some((word) => text.includes(word))) return "night_food";
    if (junkWords.some((word) => text.includes(word))) return "junk_food";
    if (record.calories >= 800) return "heavy_food";
  }

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

function pickAngryMessage(mode, type) {
  const messages = angryMessages[mode];
  const exact = messages.filter((message) => message.type === type);
  const pool = exact.length ? exact : messages;
  return pool[Math.floor(Math.random() * pool.length)];
}

function render() {
  renderLogList();
  renderSummary();
  renderTrendChart();
  renderAdvice();
}

function renderTrendChart() {
  const dailyData = buildDailyTrendData();
  if (dailyData.length === 0) {
    elements.trendChart.innerHTML = renderEmptyChart();
    elements.chartSummary.textContent = "記録が増えると推移が表示されます。";
    return;
  }

  const recentData = dailyData.slice(-7);
  const chart = createTrendSvg(recentData);
  elements.trendChart.innerHTML = chart;
  elements.chartSummary.textContent = createTrendSummary(recentData);
}

function buildDailyTrendData() {
  const grouped = new Map();

  records.slice().reverse().forEach((record) => {
    if (!grouped.has(record.date)) {
      grouped.set(record.date, {
        date: record.date,
        calories: 0,
        weight: null,
      });
    }

    const day = grouped.get(record.date);
    if (record.type === "meal") {
      day.calories += Number(record.calories || 0);
    }
    if (record.type === "body") {
      day.weight = Number(record.weight);
    }
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

  const xFor = (index) => {
    if (data.length === 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };
  const yFor = (value, domain) => {
    if (domain.max === domain.min) return padding.top + innerHeight / 2;
    return padding.top + innerHeight - ((value - domain.min) / (domain.max - domain.min)) * innerHeight;
  };

  const weightPoints = data
    .map((item, index) => Number.isFinite(item.weight) ? `${xFor(index)},${yFor(item.weight, weightDomain)}` : null)
    .filter(Boolean);
  const caloriePoints = data
    .map((item, index) => item.calories > 0 ? `${xFor(index)},${yFor(item.calories, calorieDomain)}` : null)
    .filter(Boolean);

  const labels = data.map((item, index) => {
    const date = new Date(`${item.date}T00:00:00`);
    return `<text x="${xFor(index)}" y="176" text-anchor="middle" class="chart-label">${date.getMonth() + 1}/${date.getDate()}</text>`;
  }).join("");

  const weightCircles = data.map((item, index) => {
    if (!Number.isFinite(item.weight)) return "";
    return `<circle cx="${xFor(index)}" cy="${yFor(item.weight, weightDomain)}" r="4" class="weight-dot"><title>${item.weight.toFixed(1)}kg</title></circle>`;
  }).join("");

  const calorieCircles = data.map((item, index) => {
    if (item.calories <= 0) return "";
    return `<circle cx="${xFor(index)}" cy="${yFor(item.calories, calorieDomain)}" r="4" class="calorie-dot"><title>${formatNumber(item.calories)}kcal</title></circle>`;
  }).join("");

  return `
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}" class="chart-axis"></line>
    <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}" class="chart-axis"></line>
    <line x1="${padding.left}" y1="${padding.top + innerHeight / 2}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight / 2}" class="chart-grid"></line>
    ${weightPoints.length > 1 ? `<polyline points="${weightPoints.join(" ")}" class="weight-stroke"></polyline>` : ""}
    ${caloriePoints.length > 1 ? `<polyline points="${caloriePoints.join(" ")}" class="calorie-stroke"></polyline>` : ""}
    ${weightCircles}
    ${calorieCircles}
    ${labels}
  `;
}

function renderEmptyChart() {
  return `
    <line x1="38" y1="156" x2="342" y2="156" class="chart-axis"></line>
    <text x="180" y="92" text-anchor="middle" class="chart-empty">まだ記録がありません</text>
  `;
}

function getDomain(values, padding) {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - padding, max: max + padding };
  return { min: min - padding, max: max + padding };
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

  if (latestWeight) {
    return `最新体重は${latestWeight.weight.toFixed(1)}kg。今日の摂取は${formatNumber(latestCalories)}kcalです。`;
  }

  return `今日の摂取は${formatNumber(latestCalories)}kcalです。体重も記録すると推移が見えます。`;
}

function renderLogList() {
  if (records.length === 0) {
    elements.logList.innerHTML = `
      <div class="empty-state">
        <strong>まだ記録がありません</strong>
        <p>体重や食事を保存すると、ここにタイムラインとして表示されます。</p>
      </div>
    `;
    return;
  }

  elements.logList.innerHTML = records.map((record) => `
    <article class="log-item">
      <span class="log-dot ${record.type}"></span>
      <div>
        <time datetime="${escapeHtml(record.date)}">${escapeHtml(formatRecordTime(record))}</time>
        <p>${escapeHtml(record.description)}</p>
      </div>
      <strong>${escapeHtml(record.value)}</strong>
    </article>
  `).join("");
}

function renderSummary() {
  const today = toDateInputValue(new Date());
  const todayRecords = records.filter((record) => record.date === today);
  const meals = todayRecords.filter((record) => record.type === "meal");
  const exercises = todayRecords.filter((record) => record.type === "exercise");
  const latestWeight = records.find((record) => record.type === "body");

  const intake = meals.reduce((sum, record) => sum + Number(record.calories || 0), 0);
  const burned = exercises.reduce((sum, record) => sum + Number(record.burnedCalories || 0), 0);
  const remaining = TARGET_CALORIES - intake + burned;
  const progress = Math.min((intake / TARGET_CALORIES) * 100, 100);
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

function calculateScore(todayRecords, intake) {
  let score = 45;
  if (todayRecords.some((record) => record.type === "body")) score += 15;
  if (todayRecords.some((record) => record.type === "meal")) score += 20;
  if (todayRecords.some((record) => record.type === "exercise")) score += 10;
  if (intake > 0 && intake <= TARGET_CALORIES) score += 10;
  if (intake > TARGET_CALORIES + 300) score -= 10;
  return Math.max(0, Math.min(score, 100));
}

function getScoreTitle(score) {
  if (score >= 85) return "かなりいい感じです";
  if (score >= 70) return "いいペースで記録できています";
  if (score >= 55) return "あと少し記録すると整います";
  return "まずは1つ保存してみましょう";
}

function getScoreMessage(score, mealCount, exerciseCount) {
  if (mealCount === 0) return "食事を1つ入力すると、今日のカロリーが見えるようになります。";
  if (exerciseCount === 0) return "余裕があれば、軽い散歩も記録してみましょう。";
  if (score >= 85) return "食事と運動の記録がそろっています。この調子で続けましょう。";
  return "今日の記録が増えるほど、アドバイスが具体的になります。";
}

function getAdviceTitle(intake, mealCount) {
  if (mealCount === 0) return "まずは今日の食事を記録してみましょう";
  if (intake > TARGET_CALORIES) return "次の食事は軽めにするとバランスが取りやすいです";
  return "目標カロリー内でいいペースです";
}

function getAdviceMessage(intake, burned, mealCount) {
  if (mealCount === 0) {
    return "入力した内容から、摂取カロリーや残りカロリーを自動で更新します。";
  }
  if (intake > TARGET_CALORIES) {
    return "野菜や汁物を中心にして、脂質の多いメニューを少し控えると調整しやすいです。";
  }
  if (burned > 0) {
    return "運動も記録できています。夕食はたんぱく質と野菜を意識するとさらに良いです。";
  }
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
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadViolationCounts() {
  try {
    return JSON.parse(localStorage.getItem(VIOLATION_KEY)) || {};
  } catch {
    return {};
  }
}

function saveViolationCounts() {
  localStorage.setItem(VIOLATION_KEY, JSON.stringify(violationCounts));
}

function showNotice(message) {
  elements.notice.textContent = message;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    elements.notice.textContent = "";
  }, 2200);
}

function formatRecordTime(record) {
  const date = formatDateLabel(record.date);
  return `${date} ${record.label}`;
}

function formatDateLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = toDateInputValue(new Date());
  const suffix = dateValue === today ? " 今日" : "";
  return `${date.getMonth() + 1}月${date.getDate()}日${suffix}`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
