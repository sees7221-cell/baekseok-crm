const supabaseUrl = "https://bpqnsvjovrkzwihmfhma.supabase.co";
const supabaseKey = "sb_publishable_WI4ATXwwpOeriBHVTPDPJg_MIWikOXl";

const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function loadCustomers() {

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.log(error);
    return;
  }

  const list = document.getElementById("customerList");

  if (!list) return;

  list.innerHTML = "";

  data.forEach(customer => {

    list.innerHTML += `
      <div class="customer">
        <b>${customer.name || ""}</b><br>
        ${customer.phone || ""}
      </div>
    `;

  });

}

loadCustomers();
