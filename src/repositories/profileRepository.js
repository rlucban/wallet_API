const supabase = require('../config/supabaseClient');

const profileRepository = {
  findByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  },

  createProfile: async (profile) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  updateProfile: async (userId, updateData) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('userId', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
};

module.exports = profileRepository;
