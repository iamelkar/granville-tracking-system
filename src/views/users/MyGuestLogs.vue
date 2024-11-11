<template>
  <div>
    <UserSideNav />

    <div class="main-content">
      <h1>Non-resident Logs</h1>

      <div v-if="logs.length === 0">
        <p>No scans found for your account</p>
      </div>

      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Scanned At</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.guestName || "N/A" }}</td>
              <td>{{ log.category || "N/A" }}</td>
              <td>
                {{
                  log.scanTime?.seconds
                    ? new Date(log.scanTime.seconds * 1000).toLocaleString()
                    : "Unknown"
                }}
              </td>
              <td>
                <span :class="getMessageClass(log.message)">
                  {{
                    log.message === "successful entry"
                      ? "Access Granted"
                      : log.message === "QR Exit"
                      ? "Exit Recorded"
                      : "Access Denied"
                  }}
                </span>
              </td>
              <td>
                <span v-if="log.additionalDetails">{{
                  log.additionalDetails
                }}</span>
                <span v-else>N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";
import { db, auth } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export default {
  components: {
    UserSideNav,
  },
  data() {
    return {
      logs: [],
    };
  },
  methods: {
    getMessageClass(message) {
      if (message === "successful entry") return "access-granted";
      if (message === "QR Exit") return "exit-recorded";
      return "access-failed";
    },
  },
  async created() {
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        const logsQuery = query(
          collection(db, "qr_scan_logs"),
          where("qrCodeCreator", "==", currentUser.email),
          orderBy("scanTime", "desc")
        );

        const querySnapshot = await getDocs(logsQuery);
        this.logs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    } else {
      console.error("No user logged in");
    }
  },
};
</script>

<style scoped>
.access-granted {
  color: green;
  font-weight: bold;
}

.access-failed {
  color: red;
  font-weight: bold;
}

.exit-recorded {
  color: blue; /* Example color */
  font-weight: bold;
}

.main-content {
  margin-left: 300px;
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
}

h1 {
  font-size: 36px;
  color: #333;
}

.table-container {
  max-height: 90vh; /* Set a fixed height for scrollable area */
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ccc;
  background-color: white;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th,
td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

th {
  background-color: #f4f4f4;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  .main-content {
    margin-left: 0px;
  }
}
</style>
