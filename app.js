const supabaseUrl = "https://bpqnsvjovrkzwihmfhma.supabase.co";
const supabaseKey = "sb_publishable_WI4ATXwwpOeriBHVTPDPJg_MIWikOXl";

let supabaseClient;
let mainArea;

document.addEventListener("DOMContentLoaded", () => {
  mainArea = document.getElementById("mainArea");
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  showDashboard();
});

function setActive(menu) {
  document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));
  const nav = document.getElementById("nav-" + menu);
  if (nav) nav.classList.add("active");
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function safe(v) {
  return v || "";
}

function won(v) {
  return Number(v || 0).toLocaleString("ko-KR") + "원";
}

function header(title, sub) {
  return `
    <div class="page-head">
      <div>
        <div class="page-title">${title}</div>
        <div class="page-sub">${sub || ""}</div>
      </div>
    </div>
  `;
}

/* 대시보드 */

async function showDashboard() {
  setActive("dashboard");

  mainArea.innerHTML = `
    ${header("대시보드", "오늘 처리할 업무를 확인합니다.")}

    <div class="card-grid">
      <div class="card"><h3>오늘 요금제 변경</h3><div class="number" id="planCount">0</div></div>
      <div class="card"><h3>오늘 부가서비스 해지</h3><div class="number" id="addonCount">0</div></div>
      <div class="card"><h3>오늘 생일 고객</h3><div class="number" id="birthCount">0</div></div>
      <div class="card"><h3>중고폰 재고</h3><div class="number" id="usedCount">0</div></div>
      <div class="card"><h3>이번달 악세 매출</h3><div class="number" id="accTotal">0원</div></div>
      <div class="card"><h3>미지급 페이백</h3><div class="number" id="payTotal">0원</div></div>
    </div>

    <div class="card">
      <h2>금일 할 일</h2>
      <div id="todayList">불러오는 중...</div>
    </div>
  `;

  loadDashboard();
}

async function loadDashboard() {
  const today = todayText();
  const monthDay = today.slice(5);

  const { data: customers } = await supabaseClient.from("customers").select("*");

  const planList = (customers || []).filter(c => c.plan_change_date === today);
  const addonList = (customers || []).filter(c => c.addon_end_date === today);
  const birthList = (customers || []).filter(c => c.birth_date && c.birth_date.slice(5) === monthDay);

  document.getElementById("planCount").innerText = planList.length;
  document.getElementById("addonCount").innerText = addonList.length;
  document.getElementById("birthCount").innerText = birthList.length;

  let html = "";

  html += "<h3>요금제 변경 대상</h3>";
  html += planList.length ? planList.map(c => taskRow(c, "요금제변경")).join("") : "<p class='empty'>대상 없음</p>";

  html += "<br><h3>부가서비스 해지 대상</h3>";
  html += addonList.length ? addonList.map(c => taskRow(c, "부가해지")).join("") : "<p class='empty'>대상 없음</p>";

  html += "<br><h3>생일 고객</h3>";
  html += birthList.length ? birthList.map(c => taskRow(c, "생일")).join("") : "<p class='empty'>대상 없음</p>";

  document.getElementById("todayList").innerHTML = html;

  const { data: used } = await supabaseClient.from("used_phones").select("*");
  document.getElementById("usedCount").innerText = (used || []).filter(x => x.status !== "판매완료").length;

  const { data: acc } = await supabaseClient.from("accessories").select("*");
  const accTotal = (acc || []).reduce((sum, x) => sum + Number(x.amount || 0), 0);
  document.getElementById("accTotal").innerText = won(accTotal);

  const { data: pay } = await supabaseClient.from("paybacks").select("*");
  const payTotal = (pay || [])
    .filter(x => x.status === "미지급")
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  document.getElementById("payTotal").innerText = won(payTotal);
}

function taskRow(c, type) {
  return `
    <div class="list-row" onclick="showCustomerDetail('${c.phone}')">
      <div class="row-title">
        <span>${safe(c.name)} / ${safe(c.phone)}</span>
        <span class="badge">${type}</span>
      </div>
      <div class="row-meta">${safe(c.carrier)} / ${safe(c.plan)}<br>${safe(c.memo)}</div>
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
    ${header("고객관리", "고객 등록, 검색, 수정, 삭제")}

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
  const item = {
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

  if (!item.name || !item.phone) {
    alert("고객명과 개통번호는 필수입니다.");
    return;
  }

  const { error } = await supabaseClient.from("customers").insert([item]);

  if (error) {
    alert("저장 실패: " + error.message);
    return;
  }

  alert("저장 완료");
  showCustomers();
}

async function loadCustomers() {
  const list = document.getElementById("customerList");
  const keyword = document.getElementById("search") ? document.getElementById("search").value.trim() : "";

  let query = supabaseClient.from("customers").select("*").order("id", { ascending: false });

  if (keyword) {
    query = query.or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
  }

  const { data, error } = await query;

  if (error) {
    list.innerHTML = error.message;
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
    ${header("고객 상세", `${safe(c.name)} 고객 정보`)}

    <div class="card">
      <h2>${safe(c.name)}</h2>
      <p><b>개통번호:</b> ${safe(c.phone)}</p>
      <p><b>생년월일:</b> ${c.birth_date || "-"}</p>
      <p><b>통신사:</b> ${c.carrier || "-"}</p>
      <p><b>요금제:</b> ${c.plan || "-"}</p>
      <p><b>요금제변경일:</b> ${c.plan_change_date || "-"}</p>
      <p><b>부가서비스해지일:</b> ${c.addon_end_date || "-"}</p>
      <p><b>특이사항:</b> ${c.memo || "-"}</p>

      <div class="table-actions">
        <button class="btn-secondary" onclick="showCustomers()">목록으로</button>
        <button onclick="showCustomerEdit('${c.phone}')">고객정보 수정</button>
        <button class="btn-danger" onclick="deleteCustomer('${c.phone}')">고객 삭제</button>
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
      <button onclick="saveCustomerLog('${c.phone}')">이력 저장</button>
    </div>

    <div class="card">
      <h2>고객이력</h2>
      <div id="customerLogList">불러오는 중...</div>
    </div>
  `;

  loadCustomerLogs(c.phone);
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
    ${header("고객정보 수정", `${safe(c.name)} 고객 수정`)}

    <div class="card">
      <div class="form-grid">
        <input id="edit_name" value="${safe(c.name)}">
        <input id="edit_phone" value="${safe(c.phone)}" disabled>
        <input id="edit_birth_date" type="date" value="${c.birth_date || ""}">
        <input id="edit_carrier" value="${safe(c.carrier)}">
        <input id="edit_plan" value="${safe(c.plan)}">
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
  const item = {
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
    .update(item)
    .eq("phone", phone);

  if (error) {
    alert("수정 실패: " + error.message);
    return;
  }

  alert("수정 완료");
  showCustomerDetail(phone);
}

async function deleteCustomer(phone) {
  if (!confirm("정말 삭제하시겠습니까? 고객이력도 함께 삭제됩니다.")) return;

  await supabaseClient.from("customer_logs").delete().eq("customer_phone", phone);

  const { error } = await supabaseClient
    .from("customers")
    .delete()
    .eq("phone", phone);

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  alert("삭제 완료");
  showCustomers();
}

/* 고객이력 */

async function saveCustomerLog(phone) {
  const item = {
    customer_phone: phone,
    log_type: document.getElementById("log_type").value,
    content: document.getElementById("log_content").value.trim(),
    writer: document.getElementById("log_writer").value.trim()
  };

  if (!item.content) {
    alert("내용을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("customer_logs")
    .insert([item]);

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

  if (error) {
    list.innerHTML = error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 이력이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(x => `
    <div class="list-row">
      <div class="row-title">
        <span>${safe(x.log_type)}</span>
        <span class="badge">${safe(x.writer)}</span>
      </div>
      <div class="row-meta">${safe(x.content)}<br>${formatDate(x.created_at)}</div>
    </div>
  `).join("");
}

/* 중고폰관리 */

async function showUsedPhones() {
  setActive("used");

  mainArea.innerHTML = `
    ${header("중고폰관리", "매입, 판매, 재고, 수익 관리")}

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

  if (error) {
    list.innerHTML = error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 중고폰이 없습니다.</p>";
    return;
  }

  list.innerHTML = data.map(x => {
    const profit = Number(x.sell_price || 0) - Number(x.buy_price || 0);

    return `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(x.model_name)} / ${safe(x.customer_name)}</span>
          <span class="badge">${safe(x.status)}</span>
        </div>

        <div class="row-meta">
          매입가: ${won(x.buy_price)} / 판매가: ${won(x.sell_price)} / 수익: ${won(profit)}<br>
          매입일: ${x.buy_date || "-"} / 판매일: ${x.sell_date || "-"}<br>
          ${safe(x.memo)}
        </div>

       <div class="table-actions">
  <button onclick="showUsedPhoneEdit(${x.id})">수정</button>

  ${
    x.status !== "판매완료"
      ? `<button onclick="completeUsedPhone(${x.id})">판매완료</button>`
      : ""
  }

  <button class="btn-danger" onclick="deleteUsedPhone(${x.id})">삭제</button>
</div>
      </div>
    `;
  }).join("");
}

async function deleteUsedPhone(id) {
  if (!confirm("이 중고폰 내역을 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("used_phones")
    .delete()
    .eq("id", id);

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  alert("삭제 완료");
  showUsedPhones();
}

/* 악세사리관리 */

async function showAccessories() {
  setActive("accessories");

  mainArea.innerHTML = `
    ${header("악세사리관리", "악세사리 판매 관리")}

    <div class="card">
      <h2>악세사리 등록</h2>

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
      <h2>악세사리 내역</h2>
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

  if (error) {
    list.innerHTML = error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 악세사리가 없습니다.</p>";
    return;
  }

  const total = data.reduce((sum, x) => sum + Number(x.amount || 0), 0);

  list.innerHTML = `
    <div class="notice">총 악세사리 매출: <b>${won(total)}</b></div>

    ${data.map(x => `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(x.item_name)} / ${safe(x.customer_name)}</span>
          <span class="badge">${won(x.amount)}</span>
        </div>

        <div class="row-meta">
          판매일: ${x.sale_date || "-"} / 담당자: ${safe(x.manager)}
        </div>

        <div class="table-actions">
          <button onclick="showAccessoryEdit(${x.id})">수정</button>
          <button class="btn-danger" onclick="deleteAccessory(${x.id})">삭제</button>
        </div>
      </div>
    `).join("")}
  `;
}

async function showAccessoryEdit(id) {
  const { data: item, error } = await supabaseClient
    .from("accessories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("불러오기 실패: " + error.message);
    return;
  }

  mainArea.innerHTML = `
    ${header("악세사리 수정", `${safe(item.item_name)} 수정`)}

    <div class="card">
      <div class="form-grid">
        <input id="edit_acc_customer_name" value="${safe(item.customer_name)}" placeholder="고객명">
        <input id="edit_acc_item_name" value="${safe(item.item_name)}" placeholder="품목">
        <input id="edit_acc_amount" type="number" value="${item.amount || 0}" placeholder="판매금액">
        <input id="edit_acc_manager" value="${safe(item.manager)}" placeholder="담당자">
        <input id="edit_acc_sale_date" type="date" value="${item.sale_date || ""}">
      </div>

      <br>

      <div class="table-actions">
        <button onclick="updateAccessory(${item.id})">수정 저장</button>
        <button class="btn-secondary" onclick="showAccessories()">취소</button>
      </div>
    </div>
  `;
}

async function updateAccessory(id) {
  const item = {
    customer_name: document.getElementById("edit_acc_customer_name").value.trim(),
    item_name: document.getElementById("edit_acc_item_name").value.trim(),
    amount: Number(document.getElementById("edit_acc_amount").value || 0),
    manager: document.getElementById("edit_acc_manager").value.trim(),
    sale_date: document.getElementById("edit_acc_sale_date").value || todayText()
  };

  if (!item.item_name || !item.amount) {
    alert("품목과 판매금액을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("accessories")
    .update(item)
    .eq("id", id);

  if (error) {
    alert("수정 실패: " + error.message);
    return;
  }

  alert("수정 완료");
  showAccessories();
}

async function deleteAccessory(id) {
  if (!confirm("이 악세사리 판매내역을 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("accessories")
    .delete()
    .eq("id", id);

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  alert("삭제 완료");
  showAccessories();
}
/* 페이백관리 */

async function showPaybacks() {
  setActive("paybacks");

  mainArea.innerHTML = `
    ${header("페이백관리", "페이백 지급 관리")}

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

  if (error) {
    list.innerHTML = error.message;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p class='empty'>등록된 페이백이 없습니다.</p>";
    return;
  }

  const unpaid = data
    .filter(x => x.status === "미지급")
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  list.innerHTML = `
    <div class="notice">미지급 총액: <b>${won(unpaid)}</b></div>

    ${data.map(x => `
      <div class="list-row">
        <div class="row-title">
          <span>${safe(x.customer_name)} / ${safe(x.customer_phone)}</span>
          <span class="badge">${safe(x.status)}</span>
        </div>

        <div class="row-meta">
          금액: ${won(x.amount)}<br>
          지급일: ${x.pay_date || "-"} / 담당자: ${safe(x.manager)}<br>
          ${safe(x.memo)}
        </div>
        <div class="table-actions">
  ${
    x.status !== "지급완료"
      ? `<button onclick="completePayback(${x.id})">지급완료</button>`
      : ""
  }
  <button class="btn-danger" onclick="deletePayback(${x.id})">삭제</button>
</div>
      </div>
    `).join("")}
  `;
}

/* 설정 */

function showSettings() {
  setActive("settings");

  mainArea.innerHTML = `
    ${header("설정", "CRM 설정")}

    <div class="card">
      <h2>백석점 CRM v1</h2>
      <p>고객관리 / 고객이력 / 금일할일 / 중고폰 / 악세사리 / 페이백</p>
    </div>
  `;
}

function formatDate(v) {
  if (!v) return "-";

  return new Date(v).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul"
  });
}
async function completePayback(id) {
  if (!confirm("이 페이백을 지급완료 처리하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("paybacks")
    .update({
      status: "지급완료",
      pay_date: todayText()
    })
    .eq("id", id);

  if (error) {
    alert("처리 실패: " + error.message);
    return;
  }

  alert("지급완료 처리되었습니다.");
  showPaybacks();
}

async function deletePayback(id) {
  if (!confirm("이 페이백 내역을 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("paybacks")
    .delete()
    .eq("id", id);

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  alert("삭제 완료");
  showPaybacks();
}
async function showUsedPhoneEdit(id) {
  const { data: item, error } = await supabaseClient
    .from("used_phones")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("불러오기 실패: " + error.message);
    return;
  }

  mainArea.innerHTML = `
    ${header("중고폰 수정", `${safe(item.model_name)} 수정`)}

    <div class="card">
      <div class="form-grid">
        <input id="edit_used_customer_name" value="${safe(item.customer_name)}" placeholder="고객명">
        <input id="edit_used_model_name" value="${safe(item.model_name)}" placeholder="모델명">
        <input id="edit_used_buy_price" type="number" value="${item.buy_price || 0}" placeholder="매입가">
        <input id="edit_used_sell_price" type="number" value="${item.sell_price || 0}" placeholder="판매가">

        <select id="edit_used_status">
          <option value="재고" ${item.status === "재고" ? "selected" : ""}>재고</option>
          <option value="판매완료" ${item.status === "판매완료" ? "selected" : ""}>판매완료</option>
          <option value="보류" ${item.status === "보류" ? "selected" : ""}>보류</option>
        </select>

        <input id="edit_used_buy_date" type="date" value="${item.buy_date || ""}">
        <input id="edit_used_sell_date" type="date" value="${item.sell_date || ""}">
      </div>

      <br>
      <textarea id="edit_used_memo" placeholder="메모">${safe(item.memo)}</textarea>

      <div class="table-actions">
        <button onclick="updateUsedPhone(${item.id})">수정 저장</button>
        <button class="btn-secondary" onclick="showUsedPhones()">취소</button>
      </div>
    </div>
  `;
}

async function updateUsedPhone(id) {
  const item = {
    customer_name: document.getElementById("edit_used_customer_name").value.trim(),
    model_name: document.getElementById("edit_used_model_name").value.trim(),
    buy_price: Number(document.getElementById("edit_used_buy_price").value || 0),
    sell_price: Number(document.getElementById("edit_used_sell_price").value || 0),
    status: document.getElementById("edit_used_status").value,
    buy_date: document.getElementById("edit_used_buy_date").value || null,
    sell_date: document.getElementById("edit_used_sell_date").value || null,
    memo: document.getElementById("edit_used_memo").value.trim()
  };

  const { error } = await supabaseClient
    .from("used_phones")
    .update(item)
    .eq("id", id);

  if (error) {
    alert("수정 실패: " + error.message);
    return;
  }

  alert("수정 완료");
  showUsedPhones();
}

async function completeUsedPhone(id) {
  if (!confirm("이 중고폰을 판매완료 처리하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("used_phones")
    .update({
      status: "판매완료",
      sell_date: todayText()
    })
    .eq("id", id);

  if (error) {
    alert("처리 실패: " + error.message);
    return;
  }

  alert("판매완료 처리되었습니다.");
  async function showAccessoryEdit(id) {
  const { data: item, error } = await supabaseClient
    .from("accessories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("불러오기 실패: " + error.message);
    return;
  }

  mainArea.innerHTML = `
    ${header("악세사리 수정", `${safe(item.item_name)} 수정`)}

    <div class="card">
      <div class="form-grid">
        <input id="edit_acc_customer_name" value="${safe(item.customer_name)}" placeholder="고객명">
        <input id="edit_acc_item_name" value="${safe(item.item_name)}" placeholder="품목">
        <input id="edit_acc_amount" type="number" value="${item.amount || 0}" placeholder="판매금액">
        <input id="edit_acc_manager" value="${safe(item.manager)}" placeholder="담당자">
        <input id="edit_acc_sale_date" type="date" value="${item.sale_date || ""}">
      </div>

      <br>

      <div class="table-actions">
        <button onclick="updateAccessory(${item.id})">수정 저장</button>
        <button class="btn-secondary" onclick="showAccessories()">취소</button>
      </div>
    </div>
  `;
}

async function updateAccessory(id) {
  const item = {
    customer_name: document.getElementById("edit_acc_customer_name").value.trim(),
    item_name: document.getElementById("edit_acc_item_name").value.trim(),
    amount: Number(document.getElementById("edit_acc_amount").value || 0),
    manager: document.getElementById("edit_acc_manager").value.trim(),
    sale_date: document.getElementById("edit_acc_sale_date").value || todayText()
  };

  if (!item.item_name || !item.amount) {
    alert("품목과 판매금액을 입력하세요.");
    return;
  }

  const { error } = await supabaseClient
    .from("accessories")
    .update(item)
    .eq("id", id);

  if (error) {
    alert("수정 실패: " + error.message);
    return;
  }

  alert("수정 완료");
  showAccessories();
}

async function deleteAccessory(id) {
  if (!confirm("이 악세사리 판매내역을 삭제하시겠습니까?")) return;

  const { error } = await supabaseClient
    .from("accessories")
    .delete()
    .eq("id", id);

  if (error) {
    alert("삭제 실패: " + error.message);
    return;
  }

  alert("삭제 완료");
  showAccessories();
}
  showUsedPhones();
}
