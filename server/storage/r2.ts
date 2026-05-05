import { AwsClient } from 'aws4fetch';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { Response } from 'express';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

function getConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.'
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function makeClient(cfg: R2Config): AwsClient {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
}

function r2Url(cfg: R2Config, key: string): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucketName}/${key}`;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  // Returns a 15-minute presigned PUT URL for direct client upload plus the
  // internal object path that gets stored in the database and used for retrieval.
  async getUploadUrl(): Promise<{ uploadURL: string; objectPath: string }> {
    const cfg = getConfig();
    const client = makeClient(cfg);
    const key = `uploads/${randomUUID()}`;
    const url = r2Url(cfg, key);

    const signed = await client.sign(new Request(url, { method: 'PUT' }), {
      aws: { signQuery: true, expiresIn: 900 },
    });

    return {
      uploadURL: signed.url,
      objectPath: `/objects/${key}`,
    };
  }

  // Streams an object from R2 to the Express response. objectPath must be in
  // the /objects/<key> format returned by getUploadUrl.
  async download(objectPath: string, res: Response): Promise<void> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }
    const key = objectPath.slice('/objects/'.length);
    const cfg = getConfig();
    const client = makeClient(cfg);
    const url = r2Url(cfg, key);

    const r2Res = await client.fetch(url);

    if (r2Res.status === 404) throw new ObjectNotFoundError();
    if (!r2Res.ok) throw new Error(`R2 fetch failed with status ${r2Res.status}`);
    if (!r2Res.body) throw new Error('Empty response body from R2');

    res.set('Content-Type', r2Res.headers.get('content-type') ?? 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=3600');
    const contentLength = r2Res.headers.get('content-length');
    if (contentLength) res.set('Content-Length', contentLength);

    Readable.fromWeb(r2Res.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  }
}
