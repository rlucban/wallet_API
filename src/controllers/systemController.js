const supabase = require('../config/supabaseClient');

const systemController = {
  getHealth: async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('systemSettings')
        .select('reset_epoch')
        .single();

      // If error (like table missing), we don't throw, we just use default
      const epoch = (data && data.reset_epoch) ? data.reset_epoch : 1;

      res.status(200).json({
        status: 'success',
        data: {
          reset_epoch: epoch,
          online: true,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.warn("System settings fetch failed, using default epoch 1", error.message);
      res.status(200).json({
        status: 'success',
        data: {
          reset_epoch: 1,
          online: true,
          error: "System settings not initialized"
        }
      });
    }
  },

  triggerReset: async (req, res, next) => {
    try {
      // 1. Get current epoch
      const { data: current, error: getError } = await supabase
        .from('systemSettings')
        .select('id, reset_epoch')
        .single();

      if (getError && getError.code !== 'PGRST116') throw getError;

      const newEpoch = ((current ? current.reset_epoch : 0) + 1);

      // 2. Update or Insert (Admin mode via Service Role)
      const { data, error } = await supabase
        .from('systemSettings')
        .upsert({ 
          id: current ? current.id : undefined,
          reset_epoch: newEpoch,
          updatedAt: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({
        status: 'success',
        message: 'System reset triggered. All clients will wipe on next check.',
        data: { reset_epoch: data.reset_epoch }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = systemController;
