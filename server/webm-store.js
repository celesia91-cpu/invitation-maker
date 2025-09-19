// server/webm-store.js
// Lightweight in-memory persistence layer for WebM metadata.

import { designs, designOwners, webmFiles } from './database.js';

function cloneWebmFile(record) {
  return record ? { ...record } : null;
}

function computeNextWebmFileId() {
  const numericIds = Array.from(webmFiles.keys())
    .map((id) => Number.parseInt(String(id), 10))
    .filter((id) => Number.isFinite(id));
  if (!numericIds.length) {
    return 1;
  }
  return Math.max(...numericIds) + 1;
}

let nextWebmFileId = computeNextWebmFileId();

function assertDesignExists(designId) {
  const key = String(designId);
  if (!designs.has(key)) {
    throw new Error(`Design ${key} does not exist`);
  }
  return key;
}

export async function getWebmFileById(id) {
  const record = webmFiles.get(String(id));
  return cloneWebmFile(record);
}

export async function getWebmFilesByDesign(designId) {
  const key = String(designId);
  return Array.from(webmFiles.values())
    .filter((file) => String(file.designId) === key)
    .map(cloneWebmFile);
}

export async function getWebmFilesByUser(userId) {
  const normalizedUserId = String(userId);
  const ownedDesignIds = new Set(
    Array.from(designOwners.values())
      .filter((ownership) => ownership.userId === normalizedUserId)
      .map((ownership) => String(ownership.designId))
  );

  return Array.from(webmFiles.values())
    .filter((file) => ownedDesignIds.has(String(file.designId)))
    .map(cloneWebmFile);
}

export async function addWebmFile({
  designId,
  storageUri,
  durationSeconds = null,
  sizeBytes = null,
  uploadedBy = null
}) {
  const key = assertDesignExists(designId);
  const now = new Date().toISOString();
  const id = String(nextWebmFileId++);
  const record = {
    id,
    designId: key,
    storageUri,
    durationSeconds: durationSeconds ?? null,
    sizeBytes: sizeBytes ?? null,
    uploadedBy: uploadedBy ? String(uploadedBy) : null,
    createdAt: now,
    updatedAt: now
  };
  webmFiles.set(id, record);
  return cloneWebmFile(record);
}

export async function updateWebmFile(id, updates = {}) {
  const key = String(id);
  const existing = webmFiles.get(key);
  if (!existing) {
    return null;
  }

  const nextRecord = { ...existing };

  if (Object.prototype.hasOwnProperty.call(updates, 'designId')) {
    nextRecord.designId = assertDesignExists(updates.designId);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'storageUri')) {
    nextRecord.storageUri = updates.storageUri;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'durationSeconds')) {
    nextRecord.durationSeconds = updates.durationSeconds ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'sizeBytes')) {
    nextRecord.sizeBytes = updates.sizeBytes ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'uploadedBy')) {
    nextRecord.uploadedBy = updates.uploadedBy ? String(updates.uploadedBy) : null;
  }

  nextRecord.updatedAt = new Date().toISOString();
  webmFiles.set(key, nextRecord);
  return cloneWebmFile(nextRecord);
}

export async function deleteWebmFile(id) {
  const key = String(id);
  if (!webmFiles.has(key)) {
    return false;
  }
  webmFiles.delete(key);
  return true;
}

export default {
  getWebmFileById,
  getWebmFilesByDesign,
  getWebmFilesByUser,
  addWebmFile,
  updateWebmFile,
  deleteWebmFile
};
