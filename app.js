// 백석점 CRM - app.js

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
    mainArea.innerHTML = "<h2>Supabase 라이브러리 로딩 실패</h2>";
    return;
  }

  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  showDashboard();
});

function showDashboard() {
  mainArea.innerHTML = `
    <h1>대시보드</h1>
    <br>

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
        <div class="number">0</div>
      </div>

      <div class="card">
        <h3>이번달 악세 매출</h3>
        <div class="number">0원</div>
      </div>

      <div class="card">
        <h3>이번달 방문 고객</h3>
        <div class="number">0명</div>
      </div>
    </div>
  `;
}

function showCustomers() {
  mainArea.innerHTML = `
    <h1>고객관리</h1>
    <br>

    <div class="card">
      <h2>고객 등록</h2>

      <input id="name" placeholder="고객명">
      <input id="phone" placeholder="개통번호">
      <input id="birth_date" type="date">
      <input id="carrier" placeholder="통신사">
      <input id="plan" placeholder="요금제">
      <input id="plan_change_date" type="date">
      <input id="addon_end_date" type="date">

      <textarea id="memo" placeholder="특이사항"></textarea>

      <button onclick="saveCustomer()">고객 저장</button>
    </div>

    <div class="card">
      <h2>고객 목록</h2>
      <input id="search" placeholder="고객명 또는 번호 검색" onkeyup="loadCustomers()">
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
    memo: document.getElementById("memo").value.trim()
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
    list.innerHTML = `<p>고객 목록 불러오기 실패: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p>등록된 고객이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="customer" onclick="showCustomerDetail('${c.phone}')">
      <b>${c.name || ""}</b> / ${c.phone || ""}<br>
      ${c.carrier || ""} / ${c.plan || ""}<br>
      요금제변경: ${c.plan_change_date || "-"} / 부가해지: ${c.addon_end_date || "-"}<br>
      <small>${c.memo || ""}</small>
    </div>
  `).join("");
}

async function showCustomerDetail(phone) {
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
    <h1>고객 상세</h1>
    <br>

    <div class="card">
      <h2>${customer.name}</h2>
      <p><b>개통번호:</b> ${customer.phone}</p>
      <p><b>생년월일:</b> ${customer.birth_date || "-"}</p>
      <p><b>통신사:</b> ${customer.carrier || "-"}</p>
      <p><b>요금제:</b> ${customer.plan || "-"}</p>
      <p><b>요금제변경일:</b> ${customer.plan_change_date || "-"}</p>
      <p><b>부가서비스해지일:</b> ${customer.addon_end_date || "-"}</p>
      <p><b>특이사항:</b> ${customer.memo || "-"}</p>
      <button onclick="showCustomers()">목록으로</button>
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
    list.innerHTML = `<p>이력 불러오기 실패: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p>등록된 이력이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(log => `
    <div class="customer">
      <b>${log.log_type}</b><br>
      ${log.content || ""}<br>
      <small>${formatDateTime(log.created_at)} / ${log.writer || ""}</small>
    </div>
  `).join("");
}

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
