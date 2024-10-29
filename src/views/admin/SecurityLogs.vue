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

        <button @click="filterTodayLogs">Today's Logs</button>
        <button @click="clearDateFilter">All Logs</button>

        <label>
          Sort by:
          <select v-model="sortOption">
            <option value="latest">Latest</option>
            <option value="timestamp">Date</option>
            <option value="mode">Mode</option>
          </select>
        </label>
      </div>

      <div class="table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th @click="sortLogs('residentName')">Resident Name</th>
              <th @click="sortLogs('timestamp')">Timestamp</th>
              <th @click="sortLogs('mode')">Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="getRowClass(log.mode)"
            >
              <td>{{ log.residentName }}</td>
              <td>{{ log.timestamp }}</td>
              <td>{{ log.mode }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
// Importing SidebarNav component
import SidebarNav from "@/components/SidebarNav.vue";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const allLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fetchAllLogs = async () => {
      const users = {};
      const userSnapshot = await getDocs(collection(db, "users"));
      userSnapshot.forEach((userDoc) => {
        const data = userDoc.data();
        users[data.rfidTag] = `${data.firstName} ${data.lastName}`;
      });

      const logsSnapshot = await getDocs(collection(db, "all_rfid_logs"));
      const logs = [];
      logsSnapshot.forEach((logDoc) => {
        const logData = logDoc.data();
        const rfidTag = logData.rfidTag;

        if (users[rfidTag]) {
          logs.push({
            id: logDoc.id,
            residentName: users[rfidTag],
            timestamp: logData.timestamp.toDate().toLocaleString(),
            rawTimestamp: logData.timestamp,
            mode: logData.mode,
          });
        }
      });

      allLogs.value = logs;
    };

    const filteredLogs = computed(() => {
      let result = allLogs.value.filter((log) => {
        const search = searchQuery.value.toLowerCase();
        const matchesSearch = log.residentName.toLowerCase().includes(search);

        // Apply today's filter by default
        const isToday =
          log.rawTimestamp &&
          log.rawTimestamp.toDate().toDateString() === today.toDateString();

        return matchesSearch && isToday;
      });

      // Apply sorting
      if (sortOption.value === "latest") {
        result = result.sort(
          (a, b) => b.rawTimestamp.seconds - a.rawTimestamp.seconds
        ); // Descending by timestamp
      } else if (sortOption.value === "timestamp") {
        result = result.sort((a, b) =>
          a.rawTimestamp.seconds < b.rawTimestamp.seconds ? -1 : 1
        );
      } else if (sortOption === "mode") {
        result = result.sort((a, b) => (a.mode < b.mode ? -1 : 1));
      }

      return result;
    });

    const filterTodayLogs = () => {
      searchQuery.value = "";
    };

    const clearDateFilter = () => {
      searchQuery.value = "";
    };

    const getRowClass = (mode) => {
      if (mode.includes("Entry") || mode.includes("entry")) return "entry";
      if (mode.includes("Exit") || mode.includes("exit")) return "exit";
      return "";
    };

    onMounted(fetchAllLogs);

    return {
      searchQuery,
      sortOption,
      filteredLogs,
      filterTodayLogs,
      clearDateFilter,
      getRowClass,
    };
  },
};
</script>

<style>
/* General reset to avoid padding/margin issues */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Style for the container */
body {
  font-family: Arial, sans-serif;
}

/* Sidebar styles */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px; /* Fixed width of the sidebar */
  height: 100vh; /* Full viewport height */
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 1000; /* Keeps the sidebar above the main content */
}

/* Main content area */
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
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

/* Additional styling for responsiveness */
@media (max-width: 768px) {
  .sidebar {
    width: 200px; /* Adjust sidebar width on smaller screens */
  }

  .main-content {
    margin-left: 200px; /* Adjust content margin accordingly */
  }
}
</style>
