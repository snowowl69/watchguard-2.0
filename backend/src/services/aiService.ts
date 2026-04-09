import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { logger } from '../utils/logger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface RecognitionResult {
  matched: boolean;
  userId?: string;
  name?: string;
  confidence?: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
  reason?: string;
}

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
}

/**
 * Send image to AI service for face recognition
 */
export async function recognizeFace(imagePath: string): Promise<RecognitionResult> {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(`${AI_SERVICE_URL}/recognize`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    return response.data;
  } catch (error: any) {
    logger.error(`AI recognition failed: ${error.message}`);
    if (error.response) {
      return { matched: false, reason: error.response.data?.reason || 'ai_service_error' };
    }
    return { matched: false, reason: 'ai_service_unavailable' };
  }
}

/**
 * Send image to AI service to extract face embedding
 */
export async function extractEmbedding(imagePath: string): Promise<EmbeddingResult> {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(`${AI_SERVICE_URL}/embed`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    return { success: true, embedding: response.data.embedding };
  } catch (error: any) {
    logger.error(`AI embedding extraction failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Send base64 image to AI service for recognition
 */
export async function recognizeFaceBase64(base64Image: string): Promise<RecognitionResult> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/recognize`, {
      image_base64: base64Image,
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error: any) {
    logger.error(`AI recognition (base64) failed: ${error.message}`);
    if (error.response) {
      return { matched: false, reason: error.response.data?.reason || 'ai_service_error' };
    }
    return { matched: false, reason: 'ai_service_unavailable' };
  }
}

/**
 * Sync a user's embedding to the AI service
 */
export async function syncEmbedding(userId: string, embedding: number[], name: string): Promise<boolean> {
  try {
    await axios.post(`${AI_SERVICE_URL}/sync`, {
      user_id: userId,
      embedding,
      name,
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
    return true;
  } catch (error: any) {
    logger.error(`Embedding sync failed for user ${userId}: ${error.message}`);
    return false;
  }
}

/**
 * Check AI service health
 */
export async function checkAIHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}
