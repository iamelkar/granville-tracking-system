<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <h2>All QR Codes</h2>

      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by guest name or creator name..."
          class="search-input"
        />
        <label>
          Sort by:
          <select v-model="sortOption">
            <option value="latest">Latest</option>
            <option value="startDate">Start Date</option>
            <option value="expirationTime">Expiration Time</option>
          </select>
        </label>
      </div>

      <div class="table-container">
        <table class="qrcodes-table">
          <thead>
            <tr>
              <th @click="sortQrCodes('guestName')">Guest Name</th>
              <th @click="sortQrCodes('creatorName')">Creator Name</th>
              <th @click="sortQrCodes('createdAt')">Created At</th>
              <th @click="sortQrCodes('startDate')">Start Date</th>
              <th @click="sortQrCodes('expirationTime')">Expiration Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="qrCode in filteredQrCodes" :key="qrCode.id">
              <td>{{ qrCode.guestName || "N/A" }}</td>
              <td>{{ qrCode.creatorName || "Unknown Creator" }}</td>
              <td>{{ qrCode.createdAt }}</td>
              <td>{{ qrCode.startDate }}</td>
              <td>{{ qrCode.expirationTime }}</td>
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
    const qrCodes = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");

    // Fetch QR codes from Firestore
    const fetchQrCodes = async () => {
      const codes = [];

      try {
        const qrCodesSnapshot = await getDocs(collection(db, "guest_qrcodes"));
        qrCodesSnapshot.forEach((doc) => {
          const data = doc.data();
          codes.push({
            id: doc.id,
            guestName: data.guestName || "N/A",
            creatorName: data.creatorName || "Unknown Creator",
            createdAt: data.createdAt
              ? data.createdAt.toDate().toLocaleString()
              : "Unknown",
            startDate: data.startDate
              ? data.startDate.toDate().toLocaleString()
              : "Unknown",
            expirationTime: data.expirationTime
              ? data.expirationTime.toDate().toLocaleString()
              : "Unknown",
          });
        });

        qrCodes.value = codes;
      } catch (error) {
        console.error("Error fetching QR codes:", error);
      }
    };

    // Filtered and Sorted QR Codes
    const filteredQrCodes = computed(() => {
      const search = searchQuery.value.toLowerCase();

      // Filter by search query
      let result = qrCodes.value.filter((code) => {
        return (
          code.guestName.toLowerCase().includes(search) ||
          code.creatorName.toLowerCase().includes(search)
        );
      });

      // Sort by selected option
      if (sortOption.value === "latest") {
        result.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sortOption.value === "startDate") {
        result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      } else if (sortOption.value === "expirationTime") {
        result.sort(
          (a, b) => new Date(a.expirationTime) - new Date(b.expirationTime)
        );
      }

      return result;
    });

    onMounted(fetchQrCodes);

    return {
      qrCodes,
      searchQuery,
      sortOption,
      filteredQrCodes,
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
}

.search-input {
  padding: 8px;
  width: 300px;
}

.table-container {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #ddd;
  background-color: #fff;
}

.qrcodes-table {
  width: 100%;
  border-collapse: collapse;
}

.qrcodes-table th,
.qrcodes-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
}

.qrcodes-table th {
  background-color: #f0f0f0;
  cursor: pointer;
}

.qrcodes-table tr:nth-child(even) {
  background-color: #f9f9f9;
}
</style>
