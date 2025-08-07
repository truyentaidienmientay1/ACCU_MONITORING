// Cấu hình Firebase
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

function createBatteryLayout() {
  const layout = [];
  let count = 1;
  for (let i = 0; i < 9; i++) {
    const rowSize = i < 8 ? 20 : 12;
    const row = Array.from({ length: rowSize }, () => ({
      status: "unknown",
      number: count++
    }));
    layout.push(row);
  }
  return layout;
}

let batteryLayout = {
  "Kệ 1": createBatteryLayout(),
  "Kệ 2": createBatteryLayout()
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

// Khởi tạo giao diện
const racksDiv = document.getElementById("racks");
const footer = document.getElementById("footer");
const statsDiv = document.getElementById("stats");
const filterButtons = document.querySelectorAll(".controls button[data-filter]");
const loader = document.getElementById("loader");

let currentFilter = "all";

// Hiển thị thanh tiến trình 10 giây đầu
loader.style.display = "block";

setTimeout(() => {
  loader.style.display = "none";

  setInterval(() => {
    const now = Date.now();
    const inactive = now - lastP1CTime > 10000;

    batteryLayout = {
      "Kệ 1": createBatteryLayout(),
      "Kệ 2": createBatteryLayout()
    };

    batteryLayout["Kệ 1"][0][0].status = inactive
      ? "disconnected"
      : isPumping
      ? "pumping"
      : lastP1SState;

    renderLayout();
  }, 1000);
}, 11000);

// Vẽ lại giao diện dựa trên trạng thái các cell
function renderLayout() {
  racksDiv.innerHTML = "";

  let totalCount = 0;

  for (const [rackName, rows] of Object.entries(batteryLayout)) {
    const rack = document.createElement("div");
    rack.className = "rack";

    const title = document.createElement("h2");
    title.textContent = rackName;
    rack.appendChild(title);

    const localStats = {
      full: 0,
      empty: 0,
      disconnected: 0,
      pumping: 0,
      unknown: 0,
      connected: 0
    };

    rows.forEach(row => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "row";

      row.forEach(cellData => {
        const { status, number } = cellData;

        const show =
          currentFilter === "all" ||
          (currentFilter === "connected" && !["disconnected", "unknown"].includes(status)) ||
          currentFilter === status;

        if (!show) return;

        const cell = document.createElement("div");
        cell.className = `cell ${status}`;
        cell.innerHTML = `
          <div class="cell-inner">
            <div class="cell-number">#${number}</div>
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
        totalCount++;

        localStats[status] = (localStats[status] || 0) + 1;
        if (!["disconnected", "unknown"].includes(status)) {
          localStats.connected++;
        }
      });

      if (rowDiv.children.length > 0) {
        rack.appendChild(rowDiv);
      }
    });

    const statsHTML = document.createElement("div");
    statsHTML.className = "rack-stats";
    statsHTML.innerHTML = `
      <div>
        🔋 Đầy: ${localStats.full} |
        🪫 Cạn: ${localStats.empty} |
        💧 Đang bơm: ${localStats.pumping} |
        📵 Mất kết nối: ${localStats.disconnected} |
        ❌ Chưa lắp cảm biến: ${localStats.unknown}
      </div>
    `;
    rack.insertBefore(statsHTML, rack.children[1]);

    if (rack.children.length > 1) {
      racksDiv.appendChild(rack);
    }
  }

  statsDiv.textContent = `Tổng số bình: ${totalCount}`;
  footer.textContent = `Được thiết kế bởi Nguyễn Hữu Phước - Thời gian thực: ${new Date().toLocaleTimeString()}`;
}

// Gắn sự kiện nút lọc
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderLayout();
  });
});
// Ẩn/hiện thanh menu khi bấm nút
document.getElementById("toggle-menu").addEventListener("click", function () {
  document.getElementById("menu").classList.toggle("hidden");
});
