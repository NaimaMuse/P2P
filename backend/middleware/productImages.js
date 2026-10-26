import express from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ok, fail } from '../utils/helpers.js';

export const uploadDirectory = new URL('../uploads/', import.meta.url);
export const imageBody = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' });
export async function uploadImage(req, res) {
  const bytes = req.body;
  if (!Buffer.isBuffer(bytes) || !bytes.length) fail(400, 'Choose a JPEG, PNG, or WebP image');
  let extension;
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) extension = 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') extension = 'webp';
  if (!extension) fail(400, 'The file must contain a JPEG, PNG, or WebP image');
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(new URL(filename, uploadDirectory), bytes, { flag: 'wx' });
  ok(res, { url: `/uploads/${filename}` }, 'Image uploaded', 201);
}
