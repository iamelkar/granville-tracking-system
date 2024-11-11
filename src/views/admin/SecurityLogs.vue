<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by resident name..."
          class="search-input"
        />

        <input
          type="date"
          v-model="selectedDate"
          class="date-input"
          placeholder="Select Date"
        />

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
              <th @click="sortLogs('residentName')">Resident Name</th>
              <th @click="sortLogs('timestamp')">Timestamp</th>
              <th @click="sortLogs('mode')">Mode</th>
              <!-- <th>Status</th>
              <th>Details</th> -->
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="getRowClass(log.mode)"
            >
              <td>{{ log.residentName || "N/A" }}</td>
              <td>{{ log.timestamp }}</td>
              <td>{{ log.mode }}</td>
              <!-- <td>{{ log.message || "N/A" }}</td>
              <td>{{ log.additionalDetails || "N/A" }}</td> -->
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
    const rfidLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");

    const fetchRfidLogs = async () => {
      const logs = [];
      const users = {};

      try {
        // Fetch users to map RFID tags to resident names
        const userSnapshot = await getDocs(collection(db, "users"));
        userSnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.rfidTag) {
            users[data.rfidTag] = `${data.firstName} ${data.lastName}`;
          }
        });

        // Fetch RFID logs from Firestore
        const rfidLogsSnapshot = await getDocs(collection(db, "all_rfid_logs"));
        rfidLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          const residentName = users[logData.rfidTag] || "Unknown Resident";
          logs.push({
            id: logDoc.id,
            residentName,
            timestamp: logData.timestamp
              ? logData.timestamp.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.timestamp,
            mode: logData.mode || "RFID",
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
          });
        });

        rfidLogs.value = logs;
      } catch (error) {
        console.error("Error fetching RFID logs:", error);
      }
    };

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;

      // Filter logs based on search query and selected date
      let result = rfidLogs.value.filter((log) => {
        const name = (log.residentName || "").toLowerCase();
        const matchesSearch = name.includes(search);
        const logDate = log.rawTimestamp
          ? log.rawTimestamp.toDate().toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;

        return matchesSearch && matchesDate;
      });

      // Sort logs based on selected option
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

    const getRowClass = (mode) => {
      if (!mode) return "log-unknown";
      const lowerCaseMode = mode.toLowerCase();

      if (lowerCaseMode.includes("entry")) return "log-entry";
      if (lowerCaseMode.includes("exit")) return "log-exit";
      return "log-other";
    };

    onMounted(fetchRfidLogs);

    return {
      searchQuery,
      sortOption,
      selectedDate,
      filteredLogs,
      getRowClass,
    };
  },
};
</script>

<style scoped>
.main-content {
  margin-left: 300px;
  padding: 20px;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
  overflow-y: auto;
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
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  background-color: white;
  height: calc(100vh - 100px);
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
}

.logs-table th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.logs-table tr.entry {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.logs-table tr.exit {
  background-color: #ffebee;
  color: #c62828;

  /* Log Entry - Green */
  .log-entry {
    background-color: #e8f5e9;
    color: #2e7d32;
    font-weight: bold;
  }

  /* Log Exit - Blue */
  .log-exit {
    background-color: #e3f2fd;
    color: #1e88e5;
    font-weight: bold;
  }

  /* Log Other Modes - Yellow */
  .log-other {
    background-color: #fffde7;
    color: #fbc02d;
    font-weight: bold;
  }

  /* Log Unknown/Invalid Modes - Red */
  .log-unknown {
    background-color: #ffebee;
    color: #c62828;
    font-weight: bold;
  }
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
    width: 100%;
  }
  .table-container {
    max-height: 85vh;
    overflow-y: auto; /* Enable vertical scrolling */
    overflow-x: auto;
  }

  h2 {
    font-size: 1.2rem;
  }
  .sidebar-toggle {
    display: block;
  }
}
</style>
