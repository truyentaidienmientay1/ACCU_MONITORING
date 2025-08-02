// --- KHÔNG ĐỔI --- (ngôn ngữ, firebase config, khởi tạo)
let currentLang = "vi";
const i18n = {
  vi: {
    title: "Hệ thống giám sát dung môi ACCU",
    all: "Tất cả",
    full: "Đầy",
    empty: "Cạn",
    disconnected: "Mất kết nối",
    unknown: "Không rõ",
    connected: "Đã kết nối",
    toggle: "Chuyển sang English",
    total: "Tổng",
    lastUpdate: "Được thiết kế bởi Nguyễn Hữu Phước  -  Cập nhật lần cuối"
  },
  en: {
    title: "Battery solvent monitoring system",
    all: "All",
    full: "Full",
    empty: "Empty",
    disconnected: "Disconnected",
    unknown: "Unknown",
    connected: "Connected",
    toggle: "Switch to Vietnamese",
    total: "Total",
    lastUpdate: "Website designed by Huu-Phuoc Nguyen  -  Last updated"
  }
};

const firebaseConfig = {
  apiKey: "AIzaSyDr9CIKuXLizbXrshlaU3PgcbLoMfTpuz8",
  authDomain: "iot-pillow-8244a.firebaseapp.com",
  databaseURL: "https://iot-pillow-8244a-default-rtdb.firebaseio.com",
  projectId: "iot-pillow-8244a",
  storageBucket: "iot-pillow-8244a.appspot.com",
  messagingSenderId: "329784242992",
  appId: "1:329784242992:web:8f8f198f518a1629f10ef5"
};

firebase.initializeApp(firebaseConfig);
firebase.analytics();

const BASE_PATH = "/users/umdGuIW8cteUopNji6qFza7riR42/";

function updateLanguage(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.getElementById("lang-toggle").textContent = i18n[lang].toggle;
  currentLang = lang;
  renderLayout();
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  const newLang = currentLang === "vi" ? "en" : "vi";
  updateLanguage(newLang);
});

function createBatteryLayout() {
  return Array.from({ length: 6 }, () => Array.from({ length: 20 }, () => "unknown"));
}

let batteryLayout = {
  "Shelf number 1": createBatteryLayout(),
  "Shelf number 2": createBatteryLayout(),
  "Shelf number 3": createBatteryLayout(),
  "Shelf number 4": createBatteryLayout()
};

let lastP1CValue = null;
let lastP1CTime = Date.now();
let lastP1SState = "unknown";
let isPumping = false;

firebase.database().ref(BASE_PATH + "P1_C").on("value", snapshot => {
  const value = snapshot.val();
  if (value !== lastP1CValue) {
    lastP1CValue = value;
    lastP1CTime = Date.now();
  }
});

firebase.database().ref(BASE_PATH + "P1_S").on("value", snapshot => {
  lastP1SState = snapshot.val() === 1 ? "full" : "empty";
});

firebase.database().ref(BASE_PATH + "P1_R").on("value", snapshot => {
  isPumping = snapshot.val() === 1;
});

// Cập nhật mỗi giây
setInterval(() => {
  const now = Date.now();
  const inactive = now - lastP1CTime > 10000;

  batteryLayout = {
    "Shelf number 1": createBatteryLayout(),
    "Shelf number 2": createBatteryLayout(),
    "Shelf number 3": createBatteryLayout(),
    "Shelf number 4": createBatteryLayout()
  };

  batteryLayout["Shelf number 1"][0][0] = inactive
    ? "disconnected"
    : isPumping
    ? "pumping"
    : lastP1SState;

  renderLayout();
}, 1000);

// Giao diện
const racksDiv = document.getElementById("racks");
const footer = document.getElementById("footer");
const statsDiv = document.getElementById("stats");
const filterButtons = document.querySelectorAll(".controls button[data-filter]");
let currentFilter = "all";

function renderLayout() {
  racksDiv.innerHTML = "";
  let totalCount = 0;

  for (const [rackName, rows] of Object.entries(batteryLayout)) {
    const rack = document.createElement("div");
    rack.className = "rack";

    const title = document.createElement("h2");
    title.textContent = rackName;
    rack.appendChild(title);

    rows.forEach((row, rowIndex) => {
      let full = 0, empty = 0, disconnected = 0, unknown = 0, pumping = 0;
      const rowDiv = document.createElement("div");
      rowDiv.className = "row";

      const rowLabel = document.createElement("div");
      rowLabel.className = "row-label";
      rowLabel.textContent = rowIndex + 1;
      rowDiv.appendChild(rowLabel);

      let devicesInRow = 0;

      row.forEach((status, colIndex) => {
        const show = 
          (currentFilter === "all") ||
          (currentFilter === "connected" && !["disconnected", "unknown"].includes(status)) ||
          (currentFilter === status);

        if (!show) return;

        const cell = document.createElement("div");
        cell.className = `cell ${status}`;
        cell.innerHTML = `
          <div class="cell-inner">
            <div class="cell-number">#${colIndex + 1}</div>
            <div class="icon">
              ${status === "full" ? "🔋" :
                status === "empty" ? "🪫" :
                status === "disconnected" ? "📵" :
                status === "pumping" ? "💧" :
                "❌"}
            </div>
          </div>
        `;
        rowDiv.appendChild(cell);
        devicesInRow++;

        if (status === "full") full++;
        else if (status === "empty") empty++;
        else if (status === "disconnected") disconnected++;
        else if (status === "pumping") pumping++;
        else unknown++;
      });

      if (devicesInRow > 0) {
        const stats = document.createElement("div");
        stats.className = "row-label";
        stats.innerHTML = `🔋${full} 🪫${empty} 💧${pumping} 📵${disconnected} ❌${unknown}`;
        rowDiv.appendChild(stats);
        rack.appendChild(rowDiv);
        totalCount += devicesInRow;
      }
    });

    if (rack.children.length > 1) {
      racksDiv.appendChild(rack);
    }
  }

  statsDiv.textContent = `${i18n[currentLang].total}: ${totalCount}`;
  footer.textContent = `${i18n[currentLang].lastUpdate}: ${new Date().toLocaleTimeString()}`;
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderLayout();
  });
});

updateLanguage(currentLang);
renderLayout();
