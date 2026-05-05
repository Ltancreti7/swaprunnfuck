import type { Express } from 'express';
import { ObjectStorageService, ObjectNotFoundError } from './r2';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function registerObjectStorageRoutes(app: Express): void {
  const storage = new ObjectStorageService();

  // POST /api/uploads/request-url
  // Returns a presigned R2 PUT URL + the internal objectPath to store in the DB.
  // The client PUTs the file directly to uploadURL, then passes objectPath to
  // any endpoint that saves the reference (e.g. POST /api/delivery-photos).
  app.post('/api/uploads/request-url', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing required field: name' });
      }
      if (size && size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
      }
      if (contentType && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return res.status(400).json({
          error: 'Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP)',
        });
      }

      const { uploadURL, objectPath } = await storage.getUploadUrl();
      res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  // GET /objects/uploads/:id
  // Proxies the file from R2. The objectPath stored in the DB
  // (/objects/uploads/:uuid) maps directly to this route.
  app.get('/objects/uploads/:id', async (req, res) => {
    try {
      await storage.download(`/objects/uploads/${req.params.id}`, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: 'Object not found' });
      }
      console.error('Error serving object:', error);
      return res.status(500).json({ error: 'Failed to serve object' });
    }
  });
}
