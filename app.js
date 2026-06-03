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
    <div class="customer">
      <b>${c.name || ""}</b> / ${c.phone || ""}<br>
      ${c.carrier || ""} / ${c.plan || ""}<br>
      요금제변경: ${c.plan_change_date || "-"} / 부가해지: ${c.addon_end_date || "-"}<br>
      <small>${c.memo || ""}</small>
    </div>
  `).join("");
}
