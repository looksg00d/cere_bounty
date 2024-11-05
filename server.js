import localtunnel from "localtunnel";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { fileURLToPath } from 'url';
import { processImage } from "./image.js"; // Import custom image processing module
import { storeFile, readFile, getBucketInfo } from "./cere.js";
import { html } from "./public/html.js";
import { DdcClient, File, JsonSigner, TESTNET } from "@cere-ddc-sdk/ddc-client";

// Define the current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server and tunneling configuration
const LOCAL_PORT = 3000; // Port for local server
const LOCALTUNNEL_HOST = "https://processor-proxy.sook.ch/"; // Custom localtunnel host
const LOCALTUNNEL_SUBDOMAIN = "heic-to-png"; // Subdomain for the tunnel

const app = express(); // Initialize Express app
app.use(express.json()); // Middleware to parse JSON request bodies

// Environment setup for local or cloud-based storage directory
if (typeof global._STD_ === "undefined") {
  console.log("Running in local environment");
  global._STD_ = {
    job: { getId: () => "local", storageDir: path.join(__dirname, "..") },
  };
}

const STORAGE_DIR_PATH = path.join(global._STD_.job.storageDir, "uploads");

app.get("/bucket-info", async (req, res) => {
    try {
        const bucketInfo = await getBucketInfo();
        res.json(bucketInfo);
    } catch (error) {
        console.error("Error getting bucket info:", error);
        res.status(500).json({ 
            error: "Failed to get bucket info",
            details: error.message 
        });
    }
});

// Ensure uploads directory exists, creating it if necessary
const uploadDir = STORAGE_DIR_PATH;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer storage for file uploads, saving to uploads directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Append timestamp to prevent duplicate names
  },
});

const upload = multer({ storage: storage }); // Initialize multer with storage config

// Serve custom HTML content as the homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Map to store URLs of processed images for retrieval
const processedImages = new Map(); // Maps unique ID to image URL or path

// Endpoint to upload a HEIC image and process it
app.post("/upload", upload.single("image"), async (req, res) => {
  console.log("HEIC FILE UPLOADED");
  
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  const id = Math.random().toString(36).substring(2, 15);
  
  try {
    // Конвертируем изображение
    const inputBuffer = await promisify(fs.readFile)(req.file.path);
    const result = await processImage(id, inputBuffer);
    
    // Сохраняем в Cere DDC
    console.log("Saving to Cere DDC, file path:", result.path);
    const cid = await storeFile(result.path);
    console.log("Stored in Cere DDC with CID:", cid);

    processedImages.set(id, {
      localPath: result.path,
      cereCid: cid
    });

    res.json({ 
      success: true, 
      id,
      cereCid: cid 
    });
  } catch (error) {
    console.error(`Error processing image with ID ${id}:`, error);
    res.status(500).json({ success: false, error: "Failed to process image." });
  }
});

// Доавим эндпоинт для получения файла из Cere
app.get("/cere/:cid", async (req, res) => {
    try {
        const { cid } = req.params;
        const outputPath = path.join(process.cwd(), 'downloads', `${cid}.png`);
        
        console.log("Attempting to download file with CID:", cid);
        console.log("Output path:", outputPath);
        
        await readFile(cid, outputPath);
        res.download(outputPath);
    } catch (error) {
        console.error("Error downloading from Cere:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to retrieve file from Cere",
            details: error.message 
        });
    }
});

// Endpoint to check if the image has been processed and provide download URL
app.get("/processed/:id", (req, res) => {
  const id = req.params.id;
  const filePath = processedImages.get(id);

  if (!filePath) {
    return res.status(404).json({ success: false, error: "Image not processed yet." });
  }

  const downloadUrl = `/download/${id}.png`; // Set download path
  res.json({ success: true, url: downloadUrl }); // Send download URL to client
});

// Endpoint to download the converted image by ID
app.get("/download/:id", (req, res) => {
  const id = req.params.id.replace('.png', ''); // Убираем расширение .png из id
  const filePath = path.join(process.cwd(), 'uploads', id, '0.png');

  console.log('Trying to download file from:', filePath); // Добавляем лог для отладки

  if (!fs.existsSync(filePath)) {
    console.log('File not found at path:', filePath); // Добавляем лог для отладки
    return res.status(404).json({ success: false, error: "Image not found" });
  }

  res.download(filePath); // Use res.download instead of streaming
});

// Инициализируем Cere при запуске
let cereBucketId = null;

const accountDataJson = {
  "encoded":"BFC5zUlLyOkN5nkw+wOr5hmboBvPudMeC++YpSRBbT8AgAAAAQAAAAgAAADABrEKcJDdwPTPeBaH2ILSGAIofGGmOV6j6iSuvtZUjslCiUEe1XlpVX5RGyvsOAzy9JXb1EZLBR0fNE09PsHU25ZslIKbqFbUu5uJ6SS21/9p4S7qNxZNvxcPrUduZhQolUqZO2ZgQW2nIPiKu2QF6H6XrILbdu5PUzuv564bVbsZfVxvMlzJCTKkAog4uVZA0u744LgEabHA3W/M",
  "encoding": {
    "content":["pkcs8","ed25519"],
    "type":["scrypt","xsalsa20-poly1305"],
    "version":"3"
  },
  "address":"5DEYxWHREfXe7ns1bZaDtkFSLf4qE8b4VCxnFCSLdMwH316F",
  "meta":{}
};

const DDC_CONFIG = {
  clusterId: "0x825c4b2352850de9986d9d28568db6f0c023a1e3",
  bucketId: BigInt("1052"),
  passphrase: "11111111",
  network: TESTNET
};

let ddcClient;

// Добавьте функцию инициализации DDC
async function initializeDdc() {
  try {
    const signer = new JsonSigner(accountDataJson, { 
      passphrase: DDC_CONFIG.passphrase 
    });
    
    ddcClient = new DdcClient({
      network: TESTNET,
      clusterId: DDC_CONFIG.clusterId,
      signer
    });

    await ddcClient.connect();
    
    console.log('DDC client initialized successfully');
    console.log('Using bucket ID:', DDC_CONFIG.bucketId.toString());
    console.log('Using wallet address:', accountDataJson.address);
    return ddcClient;
  } catch (error) {
    console.error('Error initializing DDC client:', error);
    throw error;
  }
}

// Измените прослушивание порта, добавив инициализацию DDC
app.listen(LOCAL_PORT, async () => {
    console.log(`Server listening on port ${LOCAL_PORT}!`);
    try {
        const bucketInfo = await getBucketInfo();
        console.log("Using Cere bucket:", bucketInfo);
    } catch (error) {
        console.error("Failed to get bucket info:", error);
    }
});

// Добавьте обработку завершения работы
process.on('SIGINT', async () => {
  if (ddcClient) {
    await ddcClient.disconnect();
  }
  process.exit();
});

// Function to initialize localtunnel for external access
const startTunnel = async () => {
  const tunnel = await localtunnel({
    subdomain: LOCALTUNNEL_SUBDOMAIN,
    host: LOCALTUNNEL_HOST,
    port: LOCAL_PORT,
  });

  console.log(`Tunnel started at ${tunnel.url}`); // Log tunnel URL
};

startTunnel(); // Call function to start localtunnel
