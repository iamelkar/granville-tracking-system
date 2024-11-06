<template>
  <div>
    <SecuritySidebar />

    <div class="main-content">
      <h2>QR Code Scanner</h2>

      <div id="qr-reader" class="qr-reader"></div>

      <div v-if="scannedData" class="scanned-result">
        <h3>Scanned QR Code Data:</h3>
        <a :href="scannedData" target="_blank" rel="noopener noreferrer">{{
          scannedData
        }}</a>
      </div>

      <div v-if="showModal" class="modal">
        <p>{{ modalMessage }}</p>
        <button @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Html5QrcodeScanner } from "html5-qrcode";
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { db } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";

export default {
  components: {
    SecuritySidebar,
  },
  setup() {
    const scannedData = ref("");
    const showModal = ref(false);
    const modalMessage = ref("");
    const isProcessingScan = ref(false);
    let qrScannerInstance = null;

    const closeModal = () => {
      showModal.value = false;
    };

    const extractDocumentId = (url) => {
      const parts = url.split("/");
      return parts[parts.length - 1];
    };

    const getCurrentSequenceAndLastValidMessage = async (documentId) => {
      // Fetch the latest log to get the current sequence and last valid message
      const logsQuery = query(
        collection(db, "qr_scan_logs"),
        where("scanData", "==", documentId),
        orderBy("scanTime", "desc"),
        limit(1)
      );

      const logsSnapshot = await getDocs(logsQuery);
      if (!logsSnapshot.empty) {
        const lastLog = logsSnapshot.docs[0].data();
        return {
          sequence: lastLog.sequence,
          lastMessage: lastLog.message
        };
      }
      return { sequence: 0, lastMessage: null };
    };

    const logScanToFirestore = async (decodedText) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        modalMessage.value = "User not authenticated!";
        showModal.value = true;
        return;
      }

      try {
        const documentId = extractDocumentId(decodedText);
        const qrCodeDocRef = doc(db, "guest_qrcodes", documentId);
        const qrCodeDoc = await getDoc(qrCodeDocRef);

        if (qrCodeDoc.exists()) {
          const qrCodeData = qrCodeDoc.data();
          const scanTime = new Date();
          const expirationTime = new Date(qrCodeData.expirationTime.seconds * 1000);
          const startTime = qrCodeData.startDate
            ? new Date(qrCodeData.startDate.seconds * 1000)
            : new Date(qrCodeData.createdAt.seconds * 1000);

          let message = "successful entry";
          let additionalDetails = null;

          // Get the current sequence and last valid scan message
          const { sequence: currentSequence, lastMessage } = await getCurrentSequenceAndLastValidMessage(documentId);
          let newSequence = currentSequence;

          // Validation: Check if the scan time is within allowed range
          if (scanTime < startTime) {
            message = "invalid";
            additionalDetails = "Scan attempted before the allowed start time.";
            newSequence += 1; // Start a new sequence due to invalid scan
          } else if (scanTime > expirationTime) {
            // Allow one exit if last valid scan was a successful entry, otherwise mark as invalid
            if (lastMessage === "successful entry") {
              message = "QR Exit (expired)";
              additionalDetails = "Exit allowed after expiration, following previous entry.";
            } else {
              message = "invalid";
              additionalDetails = "QR code has expired.";
              newSequence += 1; // Start a new sequence due to expiration
            }
          } else {
            // Fetch logs within the current sequence for this QR code to count successful scans
            const sequenceLogsQuery = query(
              collection(db, "qr_scan_logs"),
              where("scanData", "==", decodedText),
              where("sequence", "==", currentSequence),
              where("message", "in", ["successful entry", "QR Exit"])
            );
            const sequenceLogsSnapshot = await getDocs(sequenceLogsQuery);
            const scanCount = sequenceLogsSnapshot.size;

            // Alternate message based on odd/even scan count
            message = (scanCount + 1) % 2 === 1 ? "successful entry" : "QR Exit";
          }

          // Log the scan result to Firestore with the current sequence number
          await addDoc(collection(db, "qr_scan_logs"), {
            scannedBy: currentUser.email,
            qrCodeCreator: qrCodeData.createdBy,
            guestName: qrCodeData.guestName,
            category: qrCodeData.category,
            scanData: decodedText,
            scanTime: serverTimestamp(),
            message,
            additionalDetails,
            sequence: newSequence
          });

          if (message === "successful entry") {
            modalMessage.value = "Access Granted: Entry Successful!";
          } else if (message === "QR Exit" || message === "QR Exit (expired)") {
            modalMessage.value = "Access Granted: Exit Recorded!";
          } else {
            modalMessage.value = `Access Denied: ${additionalDetails}`;
          }
          showModal.value = true;
          console.log("QR scan logged successfully with message:", message);
        } else {
          modalMessage.value = "QR code not found in the system.";
          showModal.value = true;
        }
      } catch (error) {
        console.error("Error logging QR scan:", error);
        modalMessage.value = "Error logging QR scan";
        showModal.value = true;
      }
    };

    const initializeQrScanner = () => {
      qrScannerInstance = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: 250,
      });

      qrScannerInstance.render(
        async (decodedText) => {
          if (isProcessingScan.value) return;
          isProcessingScan.value = true;
          scannedData.value = decodedText;

          await logScanToFirestore(decodedText);

          qrScannerInstance.clear();

          setTimeout(() => {
            isProcessingScan.value = false;
          }, 2000);
        },
        (errorMessage) => {
          console.error(`QR Code scanning failed: ${errorMessage}`);
        }
      );
    };

    onMounted(() => {
      initializeQrScanner();
    });

    onBeforeUnmount(() => {
      if (qrScannerInstance) {
        qrScannerInstance
          .clear()
          .then(() => {
            console.log("QR Code scanner cleared successfully.");
          })
          .catch((error) => {
            console.error("Error clearing QR Code scanner:", error);
          });
      }
    });

    return {
      scannedData,
      showModal,
      modalMessage,
      closeModal,
    };
  },
};
</script>

<style>
.qr-reader {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 2px solid #ccc;
  border-radius: 10px;
  background-color: #f8f8f8;
}

.scanned-result {
  margin-top: 20px;
  padding: 10px;
  background-color: #dff0d8;
  border: 1px solid #3c763d;
  color: #3c763d;
  border-radius: 5px;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
