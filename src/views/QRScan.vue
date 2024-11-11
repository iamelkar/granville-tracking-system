<template>
  <div>
    <SecuritySidebar />

    <div class="main-content">
      <h2 class="page-title">QR Code Scanner</h2>

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
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
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

    const getLastStatusMessage = async (documentId) => {
      try {
        console.log(
          "Fetching the last status message for documentId:",
          documentId
        );

        const logsQuery = query(
          collection(db, "qr_scan_logs"),
          where("scanData", "==", documentId),
          orderBy("scanTime", "desc"),
          limit(1)
        );

        const logsSnapshot = await getDocs(logsQuery);

        if (logsSnapshot.empty) {
          console.warn("No logs found for documentId:", documentId);
          return "no_logs"; // Explicitly return "no_logs" if no logs are found
        }

        const lastLog = logsSnapshot.docs[0].data();
        console.log("Last log retrieved:", lastLog);

        // Check if the 'status' field exists and is not undefined
        if ("status" in lastLog) {
          console.log("Retrieved status field:", lastLog.status);
          return lastLog.status;
        } else {
          console.error(
            "Status field is missing in the retrieved document:",
            lastLog
          );
          return "unknown_status"; // Return a specific value if 'status' is missing
        }
      } catch (error) {
        console.error(
          "Error fetching last status message from Firestore:",
          error
        );
        return "error";
      }
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
          const expirationTime = new Date(
            qrCodeData.expirationTime.seconds * 1000
          );
          const startTime = qrCodeData.startDate
            ? new Date(qrCodeData.startDate.seconds * 1000)
            : new Date(qrCodeData.createdAt.seconds * 1000);

          let message = "";
          let additionalDetails = null;
          let status = "";
          const lastStatus = qrCodeData.latestStatus || "no_logs";

          console.log(
            "Last recorded status from QR code document:",
            lastStatus
          );

          // Strict validation checks
          if (scanTime < startTime) {
            message = "Access Denied: QR Code Not Active Yet.";
            additionalDetails = "Scan attempted before the allowed start time.";
            status = "not_started";
          } else if (scanTime > expirationTime) {
            if (lastStatus === "entry") {
              message = "Access Granted: Exit Recorded (Expired).";
              additionalDetails = "Exit allowed after expiration.";
              status = "exit";
            } else {
              message = "Access Denied: QR Code Expired.";
              additionalDetails = "QR code has expired.";
              status = "expired";
            }
          } else {
            // Handle normal entry-exit cycle based on the last status
            if (
              lastStatus === "exit" ||
              lastStatus === "expired" ||
              lastStatus === "no_logs"
            ) {
              message = "Access Granted: Entry Successful!";
              status = "entry";
            } else if (lastStatus === "entry") {
              message = "Access Granted: Exit Recorded!";
              status = "exit";
            } else {
              message = "Access Denied: Unexpected Scan State.";
              additionalDetails = "Unexpected status detected.";
              status = "invalid";
            }
          }

          // Prevent logging repeated entries or exits
          if (
            (lastStatus === "entry" && status === "entry") ||
            (lastStatus === "exit" && status === "exit")
          ) {
            message = `Access Denied: Repeated ${status} detected.`;
            additionalDetails = `The QR code was already logged as ${status}.`;
            status = "invalid";
            console.log("Repeated scan detected. Status set to 'invalid'.");
          }

          // Update the latest status in the QR code document
          await updateDoc(qrCodeDocRef, {
            latestStatus: status,
            lastScannedBy: currentUser.email,
            lastScanTime: serverTimestamp(),
          });
          console.log("Updated QR code document with latest status:", status);

          // Log the scan attempt in 'qr_scan_logs'
          await addDoc(collection(db, "qr_scan_logs"), {
            scannedBy: currentUser.email,
            qrCodeCreator: qrCodeData.createdBy,
            guestName: qrCodeData.guestName,
            category: qrCodeData.category,
            scanData: decodedText,
            scanTime: serverTimestamp(),
            message,
            additionalDetails,
            status,
          });

          // Display modal message based on scan result
          modalMessage.value = message;
          showModal.value = true;
        } else {
          modalMessage.value = "QR Code Not Found in the System.";
          showModal.value = true;
        }
      } catch (error) {
        console.error("Error logging QR scan:", error);
        modalMessage.value = "Error Logging QR Scan.";
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

/* Additional styling for responsiveness */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0px;
  }
  .qr-reader {
    margin-top: 100px;
  }

  .page-title {
    margin-top: 30px;
    margin-left: 100px;
  }
}
</style>
