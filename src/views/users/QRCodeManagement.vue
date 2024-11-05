<template>
  <div>
    <UserSideNav />

    <div class="main-content">
      <h2>Your Generated QR Codes</h2>

      <div v-if="qrCodes.length === 0">
        <p>You have not generated any QR codes yet.</p>
      </div>

      <div v-else>
        <table class="qr-codes-table">
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Category</th>
              <th>Start Date</th>
              <th>Expiration Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(qrCode, index) in qrCodes" :key="index">
              <td>
                <a href="#" @click.prevent="viewQRCode(qrCode)">
                  {{ qrCode.guestName }}
                </a>
              </td>
              <td>{{ qrCode.category }}</td>
              <td>{{ getStartDate(qrCode) }}</td>
              <td>{{ formatExpirationTime(qrCode.expirationTime) }}</td>
              <td>
                <button @click="openEditModal(qrCode)">Edit</button>
                <!-- <button @click="deleteQRCode(qrCode.id)" class="delete-button">
                  Delete
                </button> -->
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Edit Modal -->
      <div v-if="showEditModal" class="modal-overlay">
        <div class="modal">
          <h3>Edit QR Code</h3>
          <form @submit.prevent="updateQRCode">
            <div class="form-group">
              <label for="guestName">Guest Name:</label>
              <input
                type="text"
                v-model="selectedQRCode.guestName"
                id="guestName"
                required
              />
            </div>

            <div v-if="selectedQRCode.entryType === 'group'" class="form-group">
              <label for="guestList">List of Names (Separate by line):</label>
              <textarea
                v-model="selectedQRCode.names"
                id="guestList"
                placeholder="Enter one name per line"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="newImage">Update Image:</label>
              <input
                type="file"
                @change="uploadNewImage"
                id="newImage"
                accept="image/*"
              />
              <small v-if="selectedQRCode.imageUrl">
                Current Image:
                <img
                  :src="selectedQRCode.imageUrl"
                  alt="Current Image"
                  class="current-image"
                />
              </small>
            </div>

            <div class="form-group">
              <label for="expirationTime">Expiration Time:</label>
              <input
                type="datetime-local"
                v-model="newExpirationTime"
                id="expirationTime"
                required
              />
            </div>

            <div class="form-actions">
              <button type="submit">Save</button>
              <button type="button" @click="closeEditModal">Cancel</button>
              <button
                type="button"
                @click="expireQRCodeNow"
                class="expire-button"
              >
                Expire Now
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- QR Code Modal -->
      <div v-if="showQRCodeModal" class="modal-overlay">
        <div class="modal">
          <h3>
            QR Code for
            {{ selectedQRCode.guestName }}
          </h3>
          <img :src="selectedQRCode.qrCodeUrl" alt="Generated QR Code" />
          <div class="modal-actions">
            <a
              :href="selectedQRCode.qrCodeUrl"
              :download="selectedQRCode.guestName + '-QRCode.png'"
              class="download-button"
            >
              Download QR Code
            </a>
            <button @click="closeQRCodeModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db, storage } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default {
  components: { UserSideNav },
  data() {
    return {
      qrCodes: [],
      showEditModal: false,
      selectedQRCode: null,
      showQRCodeModal: false,
      newImageUrl: null,
      newExpirationTime: null,
    };
  },
  async created() {
    await this.fetchUserQRCodes();
  },
  methods: {
    async fetchUserQRCodes() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please log in to view your QR codes.");
        return;
      }

      try {
        const q = query(
          collection(db, "guest_qrcodes"),
          where("createdBy", "==", currentUser.email)
        );

        const querySnapshot = await getDocs(q);
        this.qrCodes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching QR codes:", error);
      }
    },
    getStartDate(qrCode) {
      // Return startDate if it exists, otherwise return createdAt
      return qrCode.startDate
        ? this.formatTimestamp(qrCode.startDate)
        : this.formatTimestamp(qrCode.createdAt);
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    },
    viewQRCode(qrCode) {
      this.selectedQRCode = qrCode;
      this.showQRCodeModal = true;
    },
    closeQRCodeModal() {
      this.selectedQRCode = null;
      this.showQRCodeModal = false;
    },
    openEditModal(qrCode) {
      this.selectedQRCode = { ...qrCode };
      this.newExpirationTime = qrCode.expirationTime
        ? new Date(qrCode.expirationTime.seconds * 1000)
            .toISOString()
            .slice(0, 16)
        : null;
      this.showEditModal = true;
    },
    closeEditModal() {
      this.selectedQRCode = null;
      this.newExpirationTime = null;
      this.showEditModal = false;
    },
    async uploadNewImage(event) {
      const file = event.target.files[0];
      if (file && this.selectedQRCode) {
        try {
          const imageRef = storageRef(
            storage,
            `guestImages/${this.selectedQRCode.id}/${file.name}`
          );
          await uploadBytes(imageRef, file);
          this.newImageUrl = await getDownloadURL(imageRef);
          console.log("Image uploaded successfully:", this.newImageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
    },
    async updateQRCode() {
      if (this.selectedQRCode) {
        try {
          const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);

          // Prepare data to update in guest_qrcodes
          const updatedData = {
            guestName: this.selectedQRCode.guestName || null,
            expirationTime: this.newExpirationTime
              ? new Date(this.newExpirationTime)
              : this.selectedQRCode.expirationTime,
          };

          if (this.selectedQRCode.entryType === "group") {
            // Check if `names` is a string; if so, split it, otherwise use it directly
            updatedData.names =
              typeof this.selectedQRCode.names === "string"
                ? this.selectedQRCode.names.split("\n")
                : this.selectedQRCode.names;
          } else {
            updatedData.names = null; // Clear names array for individual entry
          }

          if (this.newImageUrl) {
            updatedData.imageUrl = this.newImageUrl;
          }

          // Update Firestore document
          await updateDoc(qrCodeRef, updatedData);

          alert("QR Code updated successfully!");
          this.closeEditModal();
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error updating QR code:", error);
        }
      }
    },
    async deleteQRCode(qrCodeId) {
      if (confirm("Are you sure you want to delete this QR code?")) {
        try {
          await deleteDoc(doc(db, "guest_qrcodes", qrCodeId));
          alert("QR Code deleted successfully!");
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error deleting QR code:", error);
        }
      }
    },
    async expireQRCodeNow() {
      const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);
      await updateDoc(qrCodeRef, { expirationTime: new Date() });
      alert("QR Code expired successfully!");
      this.closeEditModal();
      await this.fetchUserQRCodes();
    },
    formatExpirationTime(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    },
  },
};
</script>

<style>
/* Styling for the table, modal, and other elements */
.main-content {
  margin-left: 300px;
  padding: 20px;
  min-height: 100vh;
  box-sizing: border-box;
}

.qr-codes-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.qr-codes-table th,
.qr-codes-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.qr-codes-table th {
  background-color: #3498db;
  color: white;
}

.qr-codes-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.qr-codes-table button {
  padding: 8px 12px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

.qr-codes-table button:hover {
  background-color: #27ae60;
}

.qr-codes-table .delete-button {
  background-color: #e74c3c;
}

.qr-codes-table .delete-button:hover {
  background-color: #c0392b;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 100%;
}

.modal .download-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.modal .download-button:hover {
  background-color: #2980b9;
}

.modal button {
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.expire-button {
  background-color: #e74c3c;
  color: white;
}

.current-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  margin-top: 10px;
}
</style>
