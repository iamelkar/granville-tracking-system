<template>
  <div>
    <!-- Fixed Sidebar on the left -->
    <SidebarNav />

    <!-- Main content on the right -->
    <div class="main-content">
      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name..."
          class="search-input"
        />

        <!-- Date Picker for Filtering by Specific Date -->
         <input type="date" v-model="selectedDate" class="date-input" placeholder="Select Date" />

        <label>
          Filter by:
          <select v-model="logTypeFilter">
            <option value="all">All Logs</option>
            <option value="rfid">RFID</option>
            <option value="qr">QR Codes</option>
          </select>
        </label>

        <label>
          Sort by:
          <select v-model="sortOption">
            <option value="latest">Latest</option>
            <option value="timestamp">Date</option>
          </select>
        </label>
      </div>

      <div class="table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th @click="sortLogs('name')">Name</th>
              <th @click="sortLogs('timestamp')">Timestamp</th>
              <th @click="sortLogs('mode')">Mode</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="getRowClass(log.message, log.mode)"
            >
              <td>{{ log.residentName || log.guestName || "N/A" }}</td>
              <td>{{ log.timestamp }}</td>
              <td>{{ log.mode || log.category || "N/A" }}</td>
              <td>{{ log.message || "N/A" }}</td>
              <td>{{ log.additionalDetails || "N/A" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from "@/components/SidebarNav.vue";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const allLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const logTypeFilter = ref("all"); // New filter for log type
    const selectedDate = ref("")

    const fetchAllLogs = async () => {
      const users = {};
      const logs = [];

      try {
        // Fetch all users and map rfidTag to resident name
        const userSnapshot = await getDocs(collection(db, "users"));
        userSnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.rfidTag) {
            users[data.rfidTag] = `${data.firstName} ${data.lastName}`;
          }
        });

        // Fetch RFID logs and associate names based on rfidTag
        const rfidLogsSnapshot = await getDocs(collection(db, "all_rfid_logs"));
        rfidLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          const residentName = users[logData.rfidTag] || "N/A";
          logs.push({
            id: logDoc.id,
            residentName,
            timestamp: logData.timestamp.toDate().toLocaleString(),
            rawTimestamp: logData.timestamp,
            mode: logData.mode,
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
            type: "rfid", // Mark this log as RFID
          });
        });

        // Fetch QR code logs and handle guest name directly from the log data
        const qrLogsSnapshot = await getDocs(collection(db, "qr_scan_logs"));
        qrLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          logs.push({
            id: logDoc.id,
            guestName: logData.guestName,
            category: logData.category || "QR Code",
            timestamp: logData.scanTime
              ? logData.scanTime.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.scanTime,
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
            type: "qr", // Mark this log as QR Code
          });
        });

        allLogs.value = logs;
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();

      // Get the date part only from selectedDate for comparison
      const selectedDateValue = selectedDate.value ? new Date(selectedDate.value)
      .toDateString() : null

      let result = allLogs.value.filter((log) => {
        const name = (log.residentName || log.guestName || "").toLowerCase();
        const matchesSearch = name.includes(search);

        // Apply logTypeFilter for RFID or QR Codes
        const matchesType =
          logTypeFilter.value === "all" ||
          (logTypeFilter.value === "rfid" && log.type === "rfid") ||
          (logTypeFilter.value === "qr" && log.type === "qr");

        // // Filter by selectedDate if a date is chosen
        // const matchesDate = !selectedDate.value || (log.rawTimestamp && 
        // log.rawTimestamp.toDate().toLocaleString() ===
        // new Date(selectedDate.value).toLocaleDateString())
        const logDataValue = log.rawTimestamp ? log.rawTimestamp.toDate()
        .toDateString() : null

        const matchesDate = !selectedDateValue || logDataValue === selectedDateValue

        return matchesSearch && matchesType && matchesDate;
      });

      // Apply sorting
      if (sortOption.value === "latest") {
        result = result.sort(
          (a, b) => b.rawTimestamp.seconds - a.rawTimestamp.seconds
        );
      } else if (sortOption.value === "timestamp") {
        result = result.sort(
          (a, b) => a.rawTimestamp.seconds - b.rawTimestamp.seconds
        );
      }

      return result;
    });

    const getRowClass = (message, mode) => {
      if (message === "successful entry") return "entry";
      if (message === "invalid") return "exit";
      if (mode && (mode.includes("Entry") || mode.includes("entry")))
        return "entry";
      if (mode && (mode.includes("Exit") || mode.includes("exit")))
        return "exit";
      return "";
    };

    onMounted(fetchAllLogs);

    return {
      searchQuery,
      sortOption,
      logTypeFilter, // Add the logTypeFilter to return
      selectedDate,
      filteredLogs,
      getRowClass,
    };
  },
};
</script>

<style>
.access-granted {
  color: green;
  font-weight: bold;
}

.access-failed {
  color: red;
  font-weight: bold;
}

.main-content {
  margin-left: 250px;
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
}

.date-input {
  padding: 8px;
  margin-left: 10px;
}

.search-input {
  padding: 8px;
  width: 200px;
}

.table-container {
  max-height: 800px;
  overflow-y: auto;
  border: 1px solid #ddd;
  background-color: white;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: white;
}

.logs-table th,
.logs-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
  cursor: pointer;
}

.logs-table th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.logs-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.logs-table tr.entry {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.logs-table tr.exit {
  background-color: #ffebee;
  color: #c62828;
}

button {
  padding: 8px 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #2980b9;
}

@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }

  .main-content {
    margin-left: 200px;
  }
}
</style>
