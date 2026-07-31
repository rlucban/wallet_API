const supabase = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

// Note: Using the standard client (ANON_KEY). 
// Ensure RLS policies in Supabase allow 'authenticated' roles to upload.


const storageController = {
  uploadFile: async (req, res, next) => {
    try {
      const { path, fileBase64, bucket } = req.body;
      const userId = req.user.id;

      if (!path.startsWith(`${userId}/`)) {
        throw new AppError('Permission Denied: You can only upload to your own folder', 403);
      }

      // Convert Base64 to Buffer
      const buffer = Buffer.from(fileBase64, 'base64');

      const { data, error } = await supabase.storage
        .from(bucket || 'receipts')
        .upload(path, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // Get URL
      const { data: urlData } = supabase.storage
        .from(bucket || 'receipts')
        .getPublicUrl(path);

      res.status(200).json({
        status: 'success',
        url: urlData.publicUrl
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = storageController;
