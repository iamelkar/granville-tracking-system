<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by guest name..."
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
              <th @click="sortLogs('guestName')">Guest Name</th>
              <th @click="sortLogs('creatorName')">Created By</th>
              <th @click="sortLogs('timestamp')">Timestamp</th>
              <th @click="sortLogs('category')">Category</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="getRowClass(log.status)"
            >
              <td>{{ log.guestName || "N/A" }}</td>
              <td>{{ log.creatorName || "Unknown" }}</td>
              <td>{{ log.timestamp }}</td>
              <td class="capitalize">{{ log.category || "QR Code" }}</td>
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
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const qrLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");

    // Function to extract creatorName from 'guest_qrcodes' collection
    const fetchCreatorName = async (documentId) => {
      try {
        if (!documentId) {
          console.warn("Invalid document ID:", documentId);
          return "Unknown";
        }

        const qrCodeDocRef = doc(db, "guest_qrcodes", documentId);
        const qrCodeDoc = await getDoc(qrCodeDocRef);

        if (qrCodeDoc.exists()) {
          const creatorName = qrCodeDoc.data().creatorName || "Unknown Creator";
          return creatorName;
        } else {
          console.warn("No document found for document ID:", documentId);
        }
      } catch (error) {
        console.error(
          "Error fetching creatorName for document ID:",
          documentId,
          error
        );
      }

      return "Unknown";
    };

    const fetchQrLogs = async () => {
      const logs = [];

      try {
        const qrLogsSnapshot = await getDocs(collection(db, "qr_scan_logs"));

        for (const logDoc of qrLogsSnapshot.docs) {
          const logData = logDoc.data();

          // Extract document ID from scanData URL
          const documentId = logData.scanData
            ? logData.scanData.split("/").pop()
            : "";

          // Fetch creatorName using the extracted document ID
          const creatorName = await fetchCreatorName(documentId);

          // Construct the log entry
          const logEntry = {
            id: logDoc.id,
            guestName: logData.guestName,
            creatorName,
            category: logData.category || "QR Code",
            timestamp: logData.scanTime
              ? logData.scanTime.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.scanTime,
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
            status: logData.status,
          };

          logs.push(logEntry);
        }

        qrLogs.value = logs;
        console.log("All QR logs processed and stored.");
      } catch (error) {
        console.error("Error fetching QR logs:", error);
      }
    };

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;

      // Filter logs based on search query and selected date
      let result = qrLogs.value.filter((log) => {
        const name = (log.guestName || "").toLowerCase();
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

    const getRowClass = (status) => {
      if (status.toLowerCase().includes("entry")) return "log-entry";
      if (status.toLowerCase().includes("exit")) return "log-exit";
      if (status.toLowerCase().includes("expired")) return "log-invalid";
      return "";
    };

    onMounted(fetchQrLogs);

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
  background-color: #00bfa5;
  height: 100vh;
}

.capitalize {
  text-transform: capitalize;
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
  cursor: pointer;
}

.logs-table th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.logs-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

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

/* Log Invalid - Red */
.log-invalid {
  background-color: #ffebee;
  color: #c62828;
  font-weight: bold;
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

@media (max-height: 600px) {
  .table-container {
    max-height: 65vh; /* Further reduce height on smaller screens */
  }
}

@media (max-height: 400px) {
  .table-container {
    max-height: 55vh; /* Minimum height for very small screens */
  }
}
</style>
