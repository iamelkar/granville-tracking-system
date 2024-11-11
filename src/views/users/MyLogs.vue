<template>
  <div>
    <UserSideNav />
    <!-- Main content area -->
    <div class="main-content">
      <h2>My RFID Logs</h2>

      <!-- Controls for search, date filter, and sorting -->
      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by mode (entry/exit)..."
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
            <option value="mode">Mode</option>
          </select>
        </label>
      </div>

      <!-- Logs table -->
      <div class="table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th @click="sortLogs('timestamp')">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="getRowClass(log.mode)"
            >
              <td>{{ log.mode }}</td>
              <td>{{ log.timestamp }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, onMounted, computed } from "vue";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import UserSideNav from "@/components/user/UserSideNav.vue";

export default {
  components: { UserSideNav },
  setup() {
    const auth = getAuth();
    const currentUser = ref(null);
    const rfidLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const userRfidTag = ref("");

    const fetchUserRfidTag = async () => {
      if (currentUser.value) {
        console.log(
          "Fetching RFID tag for user with UID:",
          currentUser.value.uid
        );
        try {
          // Directly access the user document using the UID
          const userDocRef = doc(db, "users", currentUser.value.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User document data:", userData);

            // Retrieve and log the rfidTag
            userRfidTag.value = userData?.rfidTag || "";
            console.log("Retrieved RFID tag:", userRfidTag.value);

            if (!userRfidTag.value) {
              console.warn("RFID tag not found for the current user.");
            }
          } else {
            console.error("User document does not exist.");
          }
        } catch (error) {
          console.error("Error fetching user RFID tag:", error);
        }
      } else {
        console.warn("Current user is null; skipping RFID fetch.");
      }
    };

    // Fetch RFID logs for the current user's RFID tag
    const fetchRfidLogs = async () => {
      if (!userRfidTag.value) {
        console.warn("User RFID tag not found.");
        return;
      }

      const logs = [];
      try {
        const rfidLogsSnapshot = await getDocs(
          query(
            collection(db, "all_rfid_logs"),
            where("rfidTag", "==", userRfidTag.value)
          )
        );
        rfidLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          logs.push({
            id: logDoc.id,
            mode: logData.mode || "Unknown",
            timestamp: logData.timestamp
              ? logData.timestamp.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.timestamp,
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

      let result = rfidLogs.value.filter((log) => {
        const mode = (log.mode || "").toLowerCase();
        const matchesSearch = mode.includes(search);
        const logDate = log.rawTimestamp
          ? log.rawTimestamp.toDate().toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;

        return matchesSearch && matchesDate;
      });

      // Sorting options
      if (sortOption.value === "latest") {
        result = result.sort(
          (a, b) => b.rawTimestamp.seconds - a.rawTimestamp.seconds
        );
      } else if (sortOption.value === "timestamp") {
        result = result.sort(
          (a, b) => a.rawTimestamp.seconds - b.rawTimestamp.seconds
        );
      } else if (sortOption.value === "mode") {
        result = result.sort((a, b) => a.mode.localeCompare(b.mode));
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

    onMounted(() => {
      onAuthStateChanged(auth, async (user) => {
        currentUser.value = user;
        if (user) {
          console.log("User authenticated with UID:", user.uid);
          await fetchUserRfidTag();
          await fetchRfidLogs();
        } else {
          console.error("User not authenticated.");
        }
      });
    });

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
  padding: 20px;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input,
.date-input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.table-container {
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid #ddd;
  background-color: white;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.logs-table th,
.logs-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
}

.logs-table th {
  background-color: #f4f4f4;
}

.log-entry {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.log-exit {
  background-color: #ffebee;
  color: #c62828;
}

.log-other {
  background-color: #fffde7;
  color: #fbc02d;
}

.log-unknown {
  background-color: #ffebee;
  color: #c62828;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .main-content {
    padding: 10px;
  }

  .controls {
    flex-direction: column;
    gap: 5px;
  }

  .search-input,
  .date-input {
    width: 100%;
  }
}
</style>
