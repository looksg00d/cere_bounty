import { DdcClient, File, FileUri, JsonSigner, TESTNET } from "@cere-ddc-sdk/ddc-client";
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DDC_CONFIG = {
    clusterId: process.env.CERE_CLUSTER_ID,
    bucketId: BigInt(process.env.CERE_BUCKET_ID),
    folder: process.env.CERE_FOLDER
};

let ddcClient = null;

async function initializeClient() {
    if (!ddcClient) {
        try {
            const signer = new JsonSigner(process.env.CERE_ACCOUNT_JSON, {
                passphrase: process.env.CERE_PASSPHRASE
            });
            
            ddcClient = new DdcClient({
                network: TESTNET,
                clusterId: DDC_CONFIG.clusterId,
                signer
            });

            await ddcClient.connect();
            console.log('DDC client initialized successfully');

            const bucket = await ddcClient.getBucket(DDC_CONFIG.bucketId);
            if (bucket) {
                console.log('Successfully connected to bucket:', DDC_CONFIG.bucketId.toString());
            }
        } catch (error) {
            console.error('Error initializing DDC client:', error);
            throw error;
        }
    }
    return ddcClient;
}

export async function storeFile(filePath) {
    const client = await initializeClient();
    
    try {
        const fileStats = fs.statSync(filePath);
        const fileStream = fs.createReadStream(filePath);
        
        const file = new File(fileStream, { 
            size: fileStats.size,
            path: `${DDC_CONFIG.folder}/${path.basename(filePath)}`,
            metadata: {
                originalName: path.basename(filePath),
                timestamp: Date.now(),
                type: 'image/png'
            }
        });

        const fileUri = await client.store(DDC_CONFIG.bucketId, file);
        console.log("File stored in folder:", DDC_CONFIG.folder);
        console.log("With CID:", fileUri.cid);
        return fileUri.cid;
    } catch (error) {
        console.error("Error storing file:", error);
        throw error;
    }
}

export function getBucketInfo() {
    return {
        bucketId: DDC_CONFIG.bucketId.toString(),
        clusterId: DDC_CONFIG.clusterId,
        folder: DDC_CONFIG.folder
    };
}

export async function readFile(cid) {
    const client = await initializeClient();
    try {
        const fileUri = new FileUri(DDC_CONFIG.bucketId, cid);
        const response = await client.read(fileUri);
        return response;
    } catch (error) {
        console.error("Error reading file:", error);
        throw error;
    }
}
