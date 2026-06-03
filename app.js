alert("app.js 시작");
const supabaseUrl = "https://bpqnsvjovrkzwihmfhma.supabase.co";
const supabaseKey = "sb_publishable_WI4ATXwwpOeriBHVTPDPJg_MIWikOXl";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const mainArea = document.getElementById("mainArea");

function showDashboard(){
  mainArea.innerHTML = `
    <h1>대시보드</h1><br>
    <div class="card-grid">
      <div class="card"><h3>오늘 요금제 변경</h3><div class="number" id="planCount">0</div></div>
      <div class="card"><h3>오늘 부가서비스 해지</h3><div class="number" id="addonCount">0</div></div>
      <div class="card"><h3>오늘 생일 고객</h3><div class="number" id="birthCount">0</div></div>
      <div class="card"><h3>중고폰 재고</h3><div class="number">0</div></div>
      <div class="card"><h3>이번달 악세 매출</h3><div class="number">0원</div></div>
      <div class="card"><h3>이번달 방문 고객</h3><div class="number">0명</div></div>
    </div>
  `;
}

function showCustomers(){
  mainArea.innerHTML = `
    <h1>고객관리</h1><br>
    <div class="card">
      <h2>고객 등록</h2>
      <input id="name" placeholder="고객명">
      <input id="phone" placeholder="개통번호">
      <input id="birth_date" type="date" placeholder="생년월일">
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

async function saveCustomer(){
  const customer = {
    name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    birth_date: document.getElementById("birth_date").value || null,
    carrier: document.getElementById("carrier").value,
    plan: document.getElementById("plan").value,
    plan_change_date: document.getElementById("plan_change_date").value || null,
    addon_end_date: document.getElementById("addon_end_date").value || null,
    memo: document.getElementById("memo").value
  };

  const { error } = await supabase.from("customers").insert([customer]);

  if(error){
    alert(error.message);
    return;
  }

  alert("고객 저장 완료");
  showCustomers();
}

async function loadCustomers(){
  const keyword = document.getElementById("search")?.value || "";

  let query = supabase
    .from("customers")
    .select("*")
    .order("id", { ascending:false });

  if(keyword){
    query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
  }

  const { data, error } = await query;

  if(error){
    console.log(error);
    return;
  }

  const list = document.getElementById("customerList");
  if(!list) return;

  list.innerHTML = data.map(c => `
    <div class="customer">
      <b>${c.name}</b> / ${c.phone}<br>
      ${c.carrier || ""} / ${c.plan || ""}<br>
      요금제변경: ${c.plan_change_date || "-"} / 부가해지: ${c.addon_end_date || "-"}<br>
      <small>${c.memo || ""}</small>
    </div>
  `).join("");
}

showDashboard();
