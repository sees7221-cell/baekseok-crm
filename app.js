const supabaseUrl = "https://bpqnsvjovrkzwihmfhma.supabase.co";
const supabaseKey = "sb_publishable_WI4ATXwwpOeriBHVTPDPJg_MIWikOXl";

let supabaseClient = null;
let mainArea = null;

document.addEventListener("DOMContentLoaded", function () {
  mainArea = document.getElementById("mainArea");

  if (!mainArea) {
    alert("mainArea를 찾을 수 없습니다.");
    return;
  }

  if (!window.supabase) {
    mainArea.innerHTML = "<div class='card'><h2>Supabase 연결 실패</h2></div>";
    return;
  }

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  showDashboard();
});

function setActive(menu) {
  document.querySelectorAll(".menu-item").forEach(btn => btn.classList.remove("active"));
  const target = document.getElementById("nav-" + menu);
  if (target) target.classList.add("active");
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartText() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatWon(value) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}

function safe(value) {
  return value || "";
}

function pageHeader(title, sub = "") {
  return `
    <div class="page-head">
      <div>
        <div class="page-title">${title}</div>
        ${sub ? `<div class="page-sub">${sub}</div>` : ""}
      </div>
    </div>
  `;
}

/* 대시보드 */

async function showDashboard() {
  setActive("dashboard");

  mainArea.innerHTML = `
    ${pageHeader("대시보드", "오늘 처리할 고객과 월별 현황입니다.")}

    <div class="card-grid">
      <div class="card">
        <h3>오늘 요금제 변경</h3>
        <div class="number" id="planCount">0</div>
      </div>

      <div class="card">
        <h3>오늘 부가서비스 해지</h3>
        <div class="number" id="addonCount">0</div>
      </div>

      <div class="card">
        <h3>오늘 생일 고객</h3>
        <div class="number" id="birthCount">0</div>
      </div>

      <div class="card">
        <h3>중고폰 재고</h3>
        <div class="number" id="usedStockCount">0</div>
      </div>

      <div class="card">
        <h3>이번달 악세 매출</h3>
        <div class="number" id="accessoryMonthAmount">0원</div>
      </div>
    </div>

    <div class="card">
      <h2>금일 할 일</h2>
      <div id="todayTaskList">불러오는 중...</div>
    </div>
  `;

  loadDashboardData();
}

async function loadDashboardData() {
  const today = todayText();
  const todayMonthDay = today.slice(5);
  const monthStart = monthStartText();

  const { data: customers, error } = await supabaseClient
    .from("customers")
    .select("*");

  if (error) {
    document.getElementById("todayTaskList").innerHTML =
      "고객 데이터 불러오기 실패: " + error.message;
    return;
  }

  const planTargets = customers.filter(c => c.plan_change_date === today);
  const addonTargets = customers.filter(c => c.addon_end_date === today);
  const birthTargets = customers.filter(c => c.birth_date && c.birth_date.slice(5) === todayMonthDay);

  document.getElementById("planCount").innerText = planTargets.length;
  document.getElementById("addonCount").innerText = addonTargets.length;
  document.getElementById("birthCount").innerText = birthTargets.length;

  let html = "";

  html += `<h3>요금제 변경 대상</h3>`;
  html += planTargets.length
    ? planTargets.map(c => taskRow(c, "요금제변경")).join("")
    : `<p class="empty">대상 없음</p>`;

  html += `<br><h3>부가서비스 해지 대상</h3>`;
  html += addonTargets.length
    ? addonTargets.map(c => taskRow(c, "부가해지")).join("")
    : `<p class="empty">대상 없음</p>`;

  html += `<br><h3>생일 고객</h3>`;
  html += birthTargets.length
    ? birthTargets.map(c => taskRow(c, "생일")).join("")
    : `<p class="empty">대상 없음</p>`;

  document.getElementById("todayTaskList").innerHTML = html;

  loadDashboardExtra(monthStart);
}

async function loadDashboardExtra(monthStart) {
  const { data: usedPhones } = await supabaseClient
    .from("used_phones")
    .select("*");

  const usedStock = (usedPhones || []).filter(p => p.status !== "판매완료").length;
  const usedEl = document.getElementById("usedStockCount");
  if (usedEl) usedEl.innerText = usedStock;

  const { data: accessories } = await supabaseClient
    .from("accessories")
    .select("*")
    .gte("sale_date", monthStart);

  const total = (accessories || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const accEl = document.getElementById("accessoryMonthAmount");
  if (accEl) accEl.innerText = formatWon(total);
}

function taskRow(c, type) {
  return `
    <div class="list-row" onclick="showCustomerDetail('${c.phone}')">
      <div class="row-title">
        <span>${safe(c.name)} / ${safe(c.phone)}</span>
        <span class="badge">${type}</span>
      </div>
      <div class="row-meta">
        ${safe(c.carrier)} / ${safe(c.plan)}<br>
        ${safe(c.memo)}
      </div>
    </div>
  `;
}

function showTodayTasks() {
  setActive("today");
  showDashboard();
}

/* 고객관리 */

function showCustomers() {
  setActive("customers");

  mainArea.innerHTML = `
    ${pageHeader("고객관리", "고객 등록, 검색, 상세 이력 관리")}

    <div class="card">
      <h2>고객 등록</h2>

      <div class="form-grid">
        <input id="name" placeholder="고객명">
        <input id="phone" placeholder="개통번호">
        <input id="birth_date" type="date">
        <input id="carrier" placeholder="통신사">
        <input id="plan" placeholder="요금제">
        <input id="plan_change_date" type="date">
        <input id="addon_end_date" type="date">
      </div>

      <br>
      <textarea id="memo" placeholder="특이사항"></textarea>
      <button onclick="saveCustomer()">고객 저장</button>
    </div>

    <div class="card">
      <h2>고객 목록</h2>
      <input id="search" placeholder="고객명 또는 번호 검색" onkeyup="loadCustomers()">
      <br><br>
      <div id="customerList"></div>
    </div>
  `;

  loadCustomers();
}

async function saveCustomer() {
  const customer = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    birth_date: document.getElementById("birth_date").value || null,
    carrier: document.getElementById("carrier").value.trim(),
    plan: document.getElementById("plan").value.trim(),
    plan_change_date: document.getElementById("plan_change_date").value || null,
    addon_end_date: document.getElementById("addon_end_date").value || null,
    memo: document.getElementById("memo").value.trim(),
    last_visit_date: todayText()
  };

  if (!customer.name || !customer.phone) {
    alert("고객명과 개통번호는 필수입니다.");
    return;
  }

  const { error } = await supabaseClient
    .from("customers")
    .insert([customer]);

  if (error) {
    alert("저장 실패: " + error.message);
    return;
  }

  alert("고객 저장 완료");
  showCustomers();
}

async function loadCustomers() {
  const list = document.getElementById("customerList");
  if (!list) return;

  const keyword = document.getElementById("search")?.value.trim() || "";

  let query = supabaseClient
    .from("customers")
    .select("*")
    .order("id", { ascending: false });

  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
  }

  const { data, error } = await query;

  if (error) {
    list.innerHTML = "고객 목록 불러오기 실패: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 고객이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="customer" onclick="showCustomerDetail('${c.phone}')">
      <div class="row-title">
        <span>${safe(c.name)} / ${safe(c.phone)}</span>
      </div>
      <div class="row-meta">
        ${safe(c.carrier)} / ${safe(c.plan)}<br>
        요금제변경: ${c.plan_change_date || "-"} / 부가해지: ${c.addon_end_date || "-"}<br>
        ${safe(c.memo)}
      </div>
    </div>
  `).join("");
}

async function showCustomerDetail(phone) {
  setActive("customers");

  const { data: customer, error } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .single();

  if (error) {
    alert("고객정보 불러오기 실패: " + error.message);
    return;
  }

  mainArea.innerHTML = `
    ${pageHeader("고객 상세", `${customer.name} 고객 정보`)}

    <div class="card">
      <h2>${safe(customer.name)}</h2>
      <p><b>개통번호:</b> ${safe(customer.phone)}</p>
      <p><b>생년월일:</b> ${customer.birth_date || "-"}</p>
      <p><b>통신사:</b> ${customer.carrier || "-"}</p>
      <p><b>요금제:</b> ${customer.plan || "-"}</p>
      <p><b>요금제변경일:</b> ${customer.plan_change_date || "-"}</p>
      <p><b>부가서비스해지일:</b> ${customer.addon_end_date || "-"}</p>
      <p><b>특이사항:</b> ${customer.memo || "-"}</p>

      <div class="table-actions">
        <button class="btn-secondary" onclick="showCustomers()">목록으로</button>
        <button onclick="showCustomerEdit('${customer.phone}')">고객정보 수정</button>
      </div>
    </div>

    <div class="card">
      <h2>고객이력 추가</h2>

      <select id="log_type">
        <option value="필름교체">필름교체</option>
        <option value="상담">상담</option>
        <option value="고장접수">고장접수</option>
        <option value="요금문의">요금문의</option>
        <option value="기기변경">기기변경</option>
        <option value="번호이동">번호이동</option>
        <option value="인터넷">인터넷</option>
        <option value="TV">TV</option>
        <option value="악세사리">악세사리</option>
        <option value="기타">기타</option>
      </select>

      <textarea id="log_content" placeholder="내용 입력"></textarea>
      <input id="log_writer" placeholder="작성자" value="김석호">

      <button onclick="saveCustomerLog('${customer.phone}')">이력 저장</button>
    </div>

    <div class="card">
      <h2>고객이력</h2>
      <div id="customerLogList">불러오는 중...</div>
    </div>
  `;

  loadCustomerLogs(customer.phone);
}

async function showCustomerEdit(phone) {
  const { data: c, error } = await supabaseClient
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  mainArea.innerHTML = `
    ${pageHeader("고객정보 수정", `${c.name} 고객 정보 수정`)}

    <div class="card">
      <div class="form-grid">
        <input id="edit_name" value="${safe(c.name)}" placeholder="고객명">
        <input id="edit_phone" value="${safe(c.phone)}" disabled>
        <input id="edit_birth_date" type="date" value="${c.birth_date || ""}">
        <input id="edit_carrier" value="${safe(c.carrier)}" placeholder="통신사">
        <input id="edit_plan" value="${safe(c.plan)}" placeholder="요금제">
        <input id="edit_plan_change_date" type="date" value="${c.plan_change_date || ""}">
        <input id="edit_addon_end_date" type="date" value="${c.addon_end_date || ""}">
      </div>

      <br>
      <textarea id="edit_memo">${safe(c.memo)}</textarea>

      <div class="table-actions">
        <button onclick="updateCustomer('${c.phone}')">수정 저장</button>
        <button class="btn-secondary" onclick="showCustomerDetail('${c.phone}')">취소</button>
      </div>
    </div>
  `;
}

async function updateCustomer(phone) {
  const updateData = {
    name: document.getElementById("edit_name").value.trim(),
    birth_date: document.getElementById("edit_birth_date").value || null,
    carrier: document.getElementById("edit_carrier").value.trim(),
    plan: document.getElementById("edit_plan").value.trim(),
    plan_change_date: document.getElementById("edit_plan_change_date").value || null,
    addon_end_date: document.getElementById("edit_addon_end_date").value || null,
    memo: document.getElementById("edit_memo").value.trim()
  };

  const { error } = await supabaseClient
    .from("customers")
    .update(updateData)
    .eq("phone", phone);

  if (error) {
    alert("수정 실패: " + error.message);
    return;
  }

  alert("수정 완료");
  showCustomerDetail(phone);
}

/* 고객이력 */

async function saveCustomerLog(phone) {
  const log = {
    customer_phone: phone,
    log_type: document.getElementById("log_type").value,
    content: document.getElementById("log_content").value.trim(),
    writer: document.getElementById("log_writer").value.trim()
  };

  if (!log.content) {
    alert("이력 내용을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("customer_logs")
    .insert([log]);

  if (error) {
    alert("이력 저장 실패: " + error.message);
    return;
  }

  alert("이력 저장 완료");
  showCustomerDetail(phone);
}

async function loadCustomerLogs(phone) {
  const { data, error } = await supabaseClient
    .from("customer_logs")
    .select("*")
    .eq("customer_phone", phone)
    .order("id", { ascending: false });

  const list = document.getElementById("customerLogList");
  if (!list) return;

  if (error) {
    list.innerHTML = "이력 불러오기 실패: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 이력이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(log => `
    <div class="list-row">
      <div class="row-title">
        <span>${safe(log.log_type)}</span>
        <span class="badge">${safe(log.writer)}</span>
      </div>
      <div class="row-meta">
        ${safe(log.content)}<br>
        <small>${formatDateTime(log.created_at)}</small>
      </div>
    </div>
  `).join("");
}

/* 중고폰관리 */

async function showUsedPhones() {
  setActive("used");

  mainArea.innerHTML = `
    ${pageHeader("중고폰관리", "매입, 판매, 재고, 수익 관리")}

    <div class="card">
      <h2>중고폰 등록</h2>

      <div class="form-grid">
        <input id="used_customer_name" placeholder="고객명">
        <input id="used_model_name" placeholder="모델명">
        <input id="used_buy_price" type="number" placeholder="매입가">
        <input id="used_sell_price" type="number" placeholder="판매가">
        <select id="used_status">
          <option value="재고">재고</option>
          <option value="판매완료">판매완료</option>
          <option value="보류">보류</option>
        </select>
        <input id="used_buy_date" type="date">
        <input id="used_sell_date" type="date">
      </div>

      <br>
      <textarea id="used_memo" placeholder="메모"></textarea>
      <button onclick="saveUsedPhone()">중고폰 저장</button>
    </div>

    <div class="card">
      <h2>중고폰 목록</h2>
      <div id="usedPhoneList">불러오는 중...</div>
    </div>
  `;

  loadUsedPhones();
}

async function saveUsedPhone() {
  const item = {
    customer_name: document.getElementById("used_customer_name").value.trim(),
    model_name: document.getElementById("used_model_name").value.trim(),
    buy_price: Number(document.getElementById("used_buy_price").value || 0),
    sell_price: Number(document.getElementById("used_sell_price").value || 0),
    status: document.getElementById("used_status").value,
    buy_date: document.getElementById("used_buy_date").value || null,
    sell_date: document.getElementById("used_sell_date").value || null,
    memo: document.getElementById("used_memo").value.trim()
  };

  if (!item.model_name) {
    alert("모델명을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("used_phones")
    .insert([item]);

  if (error) {
    alert("저장 실패: " + error.message);
    return;
  }

  alert("저장 완료");
  showUsedPhones();
}

async function loadUsedPhones() {
  const { data, error } = await supabaseClient
    .from("used_phones")
    .select("*")
    .order("id", { ascending: false });

  const list = document.getElementById("usedPhoneList");
  if (!list) return;

  if (error) {
    list.innerHTML = "불러오기 실패: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 중고폰이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(item => {
    const profit = Number(item.sell_price || 0) - Number(item.buy_price || 0);

    return `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(item.model_name)} / ${safe(item.customer_name)}</span>
          <span class="badge">${safe(item.status)}</span>
        </div>
        <div class="row-meta">
          매입가: ${formatWon(item.buy_price)} / 판매가: ${formatWon(item.sell_price)} / 수익: ${formatWon(profit)}<br>
          매입일: ${item.buy_date || "-"} / 판매일: ${item.sell_date || "-"}<br>
          ${safe(item.memo)}
        </div>
      </div>
    `;
  }).join("");
}

/* 악세사리관리 */

async function showAccessories() {
  setActive("accessories");

  mainArea.innerHTML = `
    ${pageHeader("악세사리관리", "필름, 케이스, 충전기 판매 관리")}

    <div class="card">
      <h2>악세사리 판매 등록</h2>

      <div class="form-grid">
        <input id="acc_customer_name" placeholder="고객명">
        <input id="acc_item_name" placeholder="품목">
        <input id="acc_amount" type="number" placeholder="판매금액">
        <input id="acc_manager" placeholder="담당자" value="김석호">
        <input id="acc_sale_date" type="date" value="${todayText()}">
      </div>

      <br>
      <button onclick="saveAccessory()">악세사리 저장</button>
    </div>

    <div class="card">
      <h2>악세사리 판매내역</h2>
      <div id="accessoryList">불러오는 중...</div>
    </div>
  `;

  loadAccessories();
}

async function saveAccessory() {
  const item = {
    customer_name: document.getElementById("acc_customer_name").value.trim(),
    item_name: document.getElementById("acc_item_name").value.trim(),
    amount: Number(document.getElementById("acc_amount").value || 0),
    manager: document.getElementById("acc_manager").value.trim(),
    sale_date: document.getElementById("acc_sale_date").value || todayText()
  };

  if (!item.item_name || !item.amount) {
    alert("품목과 판매금액을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("accessories")
    .insert([item]);

  if (error) {
    alert("저장 실패: " + error.message);
    return;
  }

  alert("저장 완료");
  showAccessories();
}

async function loadAccessories() {
  const { data, error } = await supabaseClient
    .from("accessories")
    .select("*")
    .order("id", { ascending: false });

  const list = document.getElementById("accessoryList");
  if (!list) return;

  if (error) {
    list.innerHTML = "불러오기 실패: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 악세사리 판매내역이 없습니다.</p>";
    return;
  }

  const monthStart = monthStartText();

  const monthTotal = data
    .filter(item => item.sale_date >= monthStart)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  list.innerHTML = `
    <div class="notice">이번달 악세사리 매출: <b>${formatWon(monthTotal)}</b></div>

    ${data.map(item => `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(item.item_name)} / ${safe(item.customer_name)}</span>
          <span class="badge">${formatWon(item.amount)}</span>
        </div>
        <div class="row-meta">
          판매일: ${item.sale_date || "-"} / 담당자: ${safe(item.manager)}
        </div>
      </div>
    `).join("")}
  `;
}

/* 설정 */

function showSettings() {
  setActive("settings");

  mainArea.innerHTML = `
    ${pageHeader("설정", "CRM 운영 설정")}

    <div class="card">
      <h2>백석점 CRM v1</h2>
      <p>현재 기능</p>
      <br>
      <p>고객관리 / 고객이력 / 금일할일 / 중고폰관리 / 악세사리관리</p>
      <br>
      <div class="notice">
        현재는 기본 공개키 기반입니다. 실제 개인정보 운영 전에는 직원 로그인과 권한 분리 설정이 필요합니다.
      </div>
    </div>
  `;
}

/* 공통 */

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
/* 페이백관리 */

async function showPaybacks() {
  setActive("paybacks");

  mainArea.innerHTML = `
    ${pageHeader("페이백관리", "월별 페이백 지급 내역을 관리합니다.")}

    <div class="card">
      <h2>페이백 등록</h2>

      <div class="form-grid">
        <input id="pay_customer_name" placeholder="고객명">
        <input id="pay_customer_phone" placeholder="개통번호">
        <input id="pay_amount" type="number" placeholder="금액">

        <select id="pay_status">
          <option value="미지급">미지급</option>
          <option value="지급완료">지급완료</option>
          <option value="보류">보류</option>
        </select>

        <input id="pay_date" type="date" value="${todayText()}">
        <input id="pay_manager" placeholder="담당자" value="김석호">
      </div>

      <br>
      <textarea id="pay_memo" placeholder="메모"></textarea>
      <button onclick="savePayback()">페이백 저장</button>
    </div>

    <div class="card">
      <h2>페이백 내역</h2>
      <div id="paybackList">불러오는 중...</div>
    </div>
  `;

  loadPaybacks();
}

async function savePayback() {
  const item = {
    customer_name: document.getElementById("pay_customer_name").value.trim(),
    customer_phone: document.getElementById("pay_customer_phone").value.trim(),
    amount: Number(document.getElementById("pay_amount").value || 0),
    status: document.getElementById("pay_status").value,
    pay_date: document.getElementById("pay_date").value || todayText(),
    manager: document.getElementById("pay_manager").value.trim(),
    memo: document.getElementById("pay_memo").value.trim()
  };

  if (!item.customer_name || !item.amount) {
    alert("고객명과 금액은 필수입니다.");
    return;
  }

  const { error } = await supabaseClient
    .from("paybacks")
    .insert([item]);

  if (error) {
    alert("저장 실패: " + error.message);
    return;
  }

  alert("저장 완료");
  showPaybacks();
}

async function loadPaybacks() {
  const { data, error } = await supabaseClient
    .from("paybacks")
    .select("*")
    .order("id", { ascending: false });

  const list = document.getElementById("paybackList");
  if (!list) return;

  if (error) {
    list.innerHTML = "불러오기 실패: " + error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 페이백 내역이 없습니다.</p>";
    return;
  }

  const monthStart = monthStartText();

  const monthTotal = data
    .filter(item => item.pay_date >= monthStart)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const unpaidTotal = data
    .filter(item => item.status === "미지급")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  list.innerHTML = `
    <div class="notice">
      이번달 페이백 총액: <b>${formatWon(monthTotal)}</b><br>
      미지급 총액: <b>${formatWon(unpaidTotal)}</b>
    </div>

    ${data.map(item => `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(item.customer_name)} / ${safe(item.customer_phone)}</span>
          <span class="badge">${safe(item.status)}</span>
        </div>
        <div class="row-meta">
          금액: ${formatWon(item.amount)}<br>
          지급일: ${item.pay_date || "-"} / 담당자: ${safe(item.manager)}<br>
          ${safe(item.memo)}
        </div>
      </div>
    `).join("")}
  `;
}
